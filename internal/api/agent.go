package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Ask — просьба ИИ-агента к пользователю («войдите в аккаунт и нажмите Готово»).
// Интерфейс показывает её баннером; агент ждёт ответа длинным запросом.
type Ask struct {
	ID       string     `json:"id"`
	Message  string     `json:"message"`
	Created  time.Time  `json:"created"`
	State    string     `json:"state"` // waiting | done | cancelled | withdrawn | expired
	Reply    string     `json:"reply,omitempty"`
	Answered *time.Time `json:"answered,omitempty"`
	// LastSeq — последний seq трафика в момент вопроса: всё, что пользователь
	// сделал после, отбирается выборкой since=LastSeq.
	LastSeq uint64 `json:"lastSeq"`
}

type AgentEvent struct {
	Type string `json:"type"` // ask | resync
	Ask  *Ask   `json:"ask,omitempty"`
}

type askEntry struct {
	Ask
	done    chan struct{}
	waiters int
	expire  *time.Timer
}

// Если ответа уже никто не ждёт (агент отменил вызов или упал), баннер
// убирается через askOrphanTTL.
const askOrphanTTL = time.Minute

type agentHub struct {
	mu    sync.Mutex
	next  int
	asks  map[string]*askEntry
	order []string

	subMu   sync.Mutex
	subs    map[int]chan AgentEvent
	nextSub int
}

func newAgentHub() *agentHub {
	return &agentHub{asks: map[string]*askEntry{}, subs: map[int]chan AgentEvent{}}
}

func (h *agentHub) Subscribe() (<-chan AgentEvent, func()) {
	ch := make(chan AgentEvent, 64)
	h.subMu.Lock()
	id := h.nextSub
	h.nextSub++
	h.subs[id] = ch
	h.subMu.Unlock()
	return ch, func() {
		h.subMu.Lock()
		if c, ok := h.subs[id]; ok {
			delete(h.subs, id)
			close(c)
		}
		h.subMu.Unlock()
	}
}

func (h *agentHub) publish(a Ask) {
	h.subMu.Lock()
	defer h.subMu.Unlock()
	for id, ch := range h.subs {
		select {
		case ch <- AgentEvent{Type: "ask", Ask: &a}:
		default:
			delete(h.subs, id)
			close(ch)
		}
	}
}

func (h *agentHub) create(message string, lastSeq uint64) Ask {
	h.mu.Lock()
	h.pruneLocked()
	h.next++
	e := &askEntry{Ask: Ask{ID: fmt.Sprintf("a%d", h.next), Message: message, Created: time.Now(), State: "waiting", LastSeq: lastSeq},
		done: make(chan struct{})}
	h.asks[e.ID] = e
	h.order = append(h.order, e.ID)
	h.armLocked(e)
	a := e.Ask
	h.mu.Unlock()
	h.publish(a)
	return a
}

// pruneLocked забывает давно завершённые просьбы.
func (h *agentHub) pruneLocked() {
	kept := h.order[:0]
	for _, id := range h.order {
		e := h.asks[id]
		if e.State != "waiting" && e.Answered != nil && time.Since(*e.Answered) > 30*time.Minute {
			delete(h.asks, id)
			continue
		}
		kept = append(kept, id)
	}
	h.order = kept
}

// armLocked запускает таймер «сироты», пока ответа никто не ждёт.
func (h *agentHub) armLocked(e *askEntry) {
	if e.expire != nil {
		e.expire.Stop()
	}
	e.expire = time.AfterFunc(askOrphanTTL, func() { h.finish(e.ID, "expired", "") })
}

func (h *agentHub) finish(id, state, reply string) (Ask, error) {
	h.mu.Lock()
	e := h.asks[id]
	if e == nil {
		h.mu.Unlock()
		return Ask{}, errors.New("просьба не найдена")
	}
	if e.State != "waiting" {
		a := e.Ask
		h.mu.Unlock()
		return a, nil
	}
	if state == "expired" && e.waiters > 0 {
		a := e.Ask
		h.mu.Unlock()
		return a, nil
	}
	now := time.Now()
	e.State, e.Reply, e.Answered = state, reply, &now
	if e.expire != nil {
		e.expire.Stop()
	}
	close(e.done)
	a := e.Ask
	h.mu.Unlock()
	h.publish(a)
	return a, nil
}

func (h *agentHub) get(id string) (Ask, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if e := h.asks[id]; e != nil {
		if e.State == "waiting" && e.waiters == 0 {
			h.armLocked(e) // агент проверяет без ожидания — продлеваем жизнь
		}
		return e.Ask, true
	}
	return Ask{}, false
}

func (h *agentHub) waiting() []Ask {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := []Ask{}
	for _, id := range h.order {
		if e := h.asks[id]; e.State == "waiting" {
			out = append(out, e.Ask)
		}
	}
	return out
}

// wait ждёт ответа пользователя или окончания ctx и возвращает текущее состояние.
func (h *agentHub) wait(ctx context.Context, id string) (Ask, bool) {
	h.mu.Lock()
	e := h.asks[id]
	if e == nil {
		h.mu.Unlock()
		return Ask{}, false
	}
	e.waiters++
	if e.expire != nil {
		e.expire.Stop()
	}
	h.mu.Unlock()

	select {
	case <-e.done:
	case <-ctx.Done():
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	e.waiters--
	if e.waiters == 0 && e.State == "waiting" {
		h.armLocked(e)
	}
	return e.Ask, true
}

func askStatus(a Ask) int {
	if a.State == "waiting" {
		return http.StatusAccepted
	}
	return http.StatusOK
}

func (s *Server) handleAsks(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, s.agent.waiting())
}

// handleCreateAsk: POST {"message":"…"}?wait=SEC. Возвращает 200, когда
// пользователь ответил, и 202, если время ожидания вышло (ждать дальше —
// GET /api/agent/asks/{id}?wait=SEC).
func (s *Server) handleCreateAsk(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Message string `json:"message"`
	}
	if err := readJSON(r, &body); err != nil {
		writeErr(w, 400, err)
		return
	}
	body.Message = strings.TrimSpace(body.Message)
	if body.Message == "" {
		writeErr(w, 400, errors.New("нужен текст просьбы (message)"))
		return
	}
	a := s.agent.create(body.Message, s.store.LastSeq())
	s.respondAsk(w, r, a.ID)
}

func (s *Server) handleGetAsk(w http.ResponseWriter, r *http.Request) {
	s.respondAsk(w, r, r.PathValue("id"))
}

func (s *Server) respondAsk(w http.ResponseWriter, r *http.Request, id string) {
	a, ok := s.agent.get(id)
	if d := waitParam(r); ok && d > 0 && a.State == "waiting" {
		ctx, cancel := context.WithTimeout(r.Context(), d)
		a, ok = s.agent.wait(ctx, id)
		cancel()
	}
	if !ok {
		writeErr(w, 404, errors.New("просьба не найдена"))
		return
	}
	writeJSON(w, askStatus(a), a)
}

// handleAnswerAsk вызывает интерфейс: {"reply":"…"} или {"cancel":true}.
func (s *Server) handleAnswerAsk(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Reply  string `json:"reply"`
		Cancel bool   `json:"cancel"`
	}
	if err := readJSON(r, &body); err != nil {
		writeErr(w, 400, err)
		return
	}
	state := "done"
	if body.Cancel {
		state = "cancelled"
	}
	a, err := s.agent.finish(r.PathValue("id"), state, strings.TrimSpace(body.Reply))
	if err != nil {
		writeErr(w, 404, err)
		return
	}
	writeJSON(w, 200, a)
}

func (s *Server) handleWithdrawAsk(w http.ResponseWriter, r *http.Request) {
	a, err := s.agent.finish(r.PathValue("id"), "withdrawn", "")
	if err != nil {
		writeErr(w, 404, err)
		return
	}
	writeJSON(w, 200, a)
}
