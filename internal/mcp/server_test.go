package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// fakeSiphon отвечает на пару методов API так, как настоящий Siphon.
func fakeSiphon(t *testing.T) *httptest.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/state", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(w, `{"version":"test","traffic":{"lastSeq":2}}`)
	})
	mux.HandleFunc("GET /api/exchanges", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("filter") != "method:post" {
			t.Errorf("filter not passed: %s", r.URL.RawQuery)
		}
		_, _ = io.WriteString(w, `[{"id":"2","seq":2,"kind":"http","state":"done","method":"POST","host":"api.example.com",
			"url":"https://api.example.com/login","source":"com.app","timing":{"end":12},
			"request":{"headers":[],"size":10},"response":{"status":401,"headers":[],"size":20,"contentType":"application/json"}}]`)
	})
	return httptest.NewServer(mux)
}

func TestServeProtocol(t *testing.T) {
	api := fakeSiphon(t)
	defer api.Close()

	inR, inW := io.Pipe()
	outR, outW := io.Pipe()
	done := make(chan error, 1)
	go func() { done <- Serve(context.Background(), inR, outW, Options{Version: "test", URL: api.URL}) }()
	out := bufio.NewReader(outR)

	call := func(msg string) map[string]any {
		t.Helper()
		if _, err := io.WriteString(inW, msg+"\n"); err != nil {
			t.Fatal(err)
		}
		line, err := out.ReadBytes('\n')
		if err != nil {
			t.Fatal(err)
		}
		var resp map[string]any
		if err := json.Unmarshal(line, &resp); err != nil {
			t.Fatalf("%s: %v", line, err)
		}
		return resp
	}

	init := call(`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}`)
	res := init["result"].(map[string]any)
	if res["protocolVersion"] != "2025-03-26" || !strings.Contains(res["instructions"].(string), "wait_for_user") {
		t.Fatalf("initialize: %v", init)
	}
	// Уведомление не требует ответа: следующий ответ должен относиться к ping.
	_, _ = io.WriteString(inW, `{"jsonrpc":"2.0","method":"notifications/initialized"}`+"\n")
	if ping := call(`{"jsonrpc":"2.0","id":"p","method":"ping"}`); ping["id"] != "p" || ping["result"] == nil {
		t.Fatalf("ping: %v", ping)
	}

	list := call(`{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)
	tools := list["result"].(map[string]any)["tools"].([]any)
	names := map[string]bool{}
	for _, x := range tools {
		tool := x.(map[string]any)
		names[tool["name"].(string)] = true
		if tool["inputSchema"].(map[string]any)["type"] != "object" {
			t.Errorf("%s: schema must be an object", tool["name"])
		}
	}
	for _, want := range []string{"status", "start_emulator", "start_intercept", "wait_for_user", "list_traffic", "get_exchange", "export_traffic"} {
		if !names[want] {
			t.Errorf("tool %s missing", want)
		}
	}

	traffic := call(`{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_traffic","arguments":{"filter":"method:post"}}}`)
	content := traffic["result"].(map[string]any)["content"].([]any)[0].(map[string]any)["text"].(string)
	if !strings.Contains(content, "#2 POST 401 https://api.example.com/login json") || !strings.Contains(content, "com.app") {
		t.Fatalf("list_traffic: %s", content)
	}

	bad := call(`{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_exchange","arguments":{}}}`)
	if bad["result"].(map[string]any)["isError"] != true {
		t.Fatalf("missing id must be a tool error: %v", bad)
	}
	if unknown := call(`{"jsonrpc":"2.0","id":5,"method":"nope"}`); unknown["error"] == nil {
		t.Fatalf("unknown method: %v", unknown)
	}

	inW.Close()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Serve did not return after stdin closed")
	}
}

func TestCut(t *testing.T) {
	if s, cut := cut("привет", 3); s != "п" || !cut {
		t.Fatalf("cut must keep UTF-8 intact: %q", s)
	}
	if s, cut := cut("abc", 5); s != "abc" || cut {
		t.Fatalf("short string changed: %q", s)
	}
}
