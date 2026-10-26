package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"siphon/internal/capture"
)

func TestAgentAskLifecycle(t *testing.T) {
	s := &Server{store: capture.NewStore(), agent: newAgentHub()}
	s.store.Add(&capture.Exchange{Host: "before"})
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/agent/asks", s.handleAsks)
	mux.HandleFunc("POST /api/agent/asks", s.handleCreateAsk)
	mux.HandleFunc("GET /api/agent/asks/{id}", s.handleGetAsk)
	mux.HandleFunc("POST /api/agent/asks/{id}/answer", s.handleAnswerAsk)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	events, cancel := s.agent.Subscribe()
	defer cancel()

	type result struct {
		status int
		ask    Ask
	}
	done := make(chan result, 1)
	go func() {
		resp, err := http.Post(srv.URL+"/api/agent/asks?wait=10", "application/json", strings.NewReader(`{"message":"Войдите и нажмите Готово"}`))
		if err != nil {
			t.Error(err)
			done <- result{}
			return
		}
		defer resp.Body.Close()
		var a Ask
		_ = json.NewDecoder(resp.Body).Decode(&a)
		done <- result{resp.StatusCode, a}
	}()

	var created Ask
	select {
	case ev := <-events:
		created = *ev.Ask
	case <-time.After(5 * time.Second):
		t.Fatal("no ask event")
	}
	if created.State != "waiting" || created.LastSeq != 1 {
		t.Fatalf("created: %+v", created)
	}
	if list := s.agent.waiting(); len(list) != 1 {
		t.Fatalf("waiting: %+v", list)
	}

	resp, err := http.Post(srv.URL+"/api/agent/asks/"+created.ID+"/answer", "application/json", strings.NewReader(`{"reply":"готово"}`))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	r := <-done
	if r.status != 200 || r.ask.State != "done" || r.ask.Reply != "готово" {
		t.Fatalf("answer: %d %+v", r.status, r.ask)
	}
	if list := s.agent.waiting(); len(list) != 0 {
		t.Fatalf("answered ask still waiting: %+v", list)
	}

	// Без ответа по истечении ?wait возвращается 202 и состояние waiting.
	resp, err = http.Post(srv.URL+"/api/agent/asks?wait=0.2", "application/json", strings.NewReader(`{"message":"ещё"}`))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("timeout status: %d", resp.StatusCode)
	}
}

func TestWaitTrafficReturnsOnNewExchange(t *testing.T) {
	s := &Server{store: capture.NewStore(), agent: newAgentHub()}
	req := httptest.NewRequest("GET", "/api/exchanges?since=0&filter=host:api&wait=5", nil)
	w := httptest.NewRecorder()
	go func() {
		time.Sleep(100 * time.Millisecond)
		s.store.Add(&capture.Exchange{Host: "cdn.example.com", State: capture.StateDone})
		e := s.store.Add(&capture.Exchange{Host: "api.example.com", State: capture.StatePending})
		s.store.Update(e.ID, func(x *capture.Exchange) { x.State = capture.StateDone })
	}()
	start := time.Now()
	s.handleList(w, req)
	if time.Since(start) > 3*time.Second {
		t.Fatalf("waited too long: %v", time.Since(start))
	}
	var list []capture.Exchange
	if err := json.Unmarshal(w.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].Host != "api.example.com" {
		t.Fatalf("got %+v", list)
	}
}
