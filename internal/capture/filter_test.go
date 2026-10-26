package capture

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestQuerySelect(t *testing.T) {
	list := []Exchange{
		{ID: "1", Seq: 1, Kind: KindHTTP, State: StateDone, Method: "GET", Host: "api.example.com", Path: "/v1/user", URL: "https://api.example.com/v1/user",
			Source: "com.app", Response: &Message{Status: 200, ContentType: "application/json; charset=utf-8"}},
		{ID: "2", Seq: 2, Kind: KindHTTP, State: StateDone, Method: "POST", Host: "api.example.com", Path: "/v1/login", URL: "https://api.example.com/v1/login",
			Source: "com.app", Response: &Message{Status: 401, ContentType: "application/json"}},
		{ID: "3", Seq: 3, Kind: KindHTTP, State: StatePending, Method: "GET", Host: "cdn.example.com", Path: "/a.png", URL: "https://cdn.example.com/a.png", Source: "manual"},
		{ID: "4", Seq: 4, Kind: KindTLSError, State: StateError, Host: "pinned.example.com", Port: 443},
	}
	ids := func(q Query) string {
		var out []string
		for _, e := range q.Select(list) {
			out = append(out, e.ID)
		}
		return strings.Join(out, ",")
	}
	for _, tc := range []struct {
		q    Query
		want string
	}{
		{Query{}, "1,2,3,4"},
		{Query{Since: 2}, "3,4"},
		{Query{IDs: []string{"4", "1"}}, "1,4"},
		{Query{Filter: "host:api method:post"}, "2"},
		{Query{Filter: "status:4xx"}, "2"},
		{Query{Filter: "status:200"}, "1"},
		{Query{Filter: "is:error"}, "2,4"},
		{Query{Filter: "is:pending"}, "3"},
		{Query{Filter: "type:json -login"}, "1"},
		{Query{Filter: "src:com.app", Since: 1}, "2"},
		{Query{Filter: "kind:tls"}, "4"},
		{Query{Filter: "method:tls"}, "4"},
		{Query{Filter: "LOGIN"}, "2"},
		{Query{Filter: "401"}, "2"},
		{Query{Filter: "-"}, ""},
	} {
		if got := ids(tc.q); got != tc.want {
			t.Errorf("%+v: got %q, want %q", tc.q, got, tc.want)
		}
	}
}

func TestExportJSONBodies(t *testing.T) {
	list := []Exchange{
		{ID: "1", Seq: 1, Kind: KindHTTP, Method: "POST", URL: "https://x/login",
			Request:  &Message{ContentType: "application/json", Size: 15},
			Response: &Message{Status: 200, ContentType: "text/html"}},
		{ID: "2", Seq: 2, Kind: KindHTTP, Method: "GET", URL: "https://x/img",
			Response: &Message{Status: 200, ContentType: "image/png"}},
		{ID: "3", Seq: 3, Kind: KindWebSocket, URL: "wss://x/ws"},
	}
	bodies := map[string][2][]byte{
		"1": {[]byte(` {"user":"a"} `), []byte("<b>hi</b>")},
		"2": {nil, {0x89, 'P', 'N', 'G', 0}},
	}
	body := func(id string, req bool) []byte {
		if req {
			return bodies[id][0]
		}
		return bodies[id][1]
	}
	frames := func(id string) []Frame {
		return []Frame{{Dir: "out", Kind: "text", Data: []byte("ping")}, {Dir: "in", Kind: "binary", Data: []byte{1, 2}}}
	}
	doc := ExportJSON(list, body, frames, "test")
	raw, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}
	var back struct {
		Format    string `json:"format"`
		Count     int    `json:"count"`
		Exchanges []struct {
			Request  map[string]any `json:"request"`
			Response map[string]any `json:"response"`
			Frames   []map[string]any
		} `json:"exchanges"`
	}
	if err := json.Unmarshal(raw, &back); err != nil {
		t.Fatal(err)
	}
	if back.Format != ExportFormat || back.Count != 3 {
		t.Fatalf("header: %s %d", back.Format, back.Count)
	}
	x := back.Exchanges
	if user := x[0].Request["json"].(map[string]any)["user"]; user != "a" {
		t.Errorf("request json: %v", x[0].Request)
	}
	if x[0].Response["text"] != "<b>hi</b>" || x[0].Response["status"] != float64(200) {
		t.Errorf("response text: %v", x[0].Response)
	}
	if x[1].Response["base64"] != "iVBORwA=" || x[1].Response["text"] != nil {
		t.Errorf("binary body: %v", x[1].Response)
	}
	if x[1].Request != nil {
		t.Errorf("missing request should be omitted: %v", x[1].Request)
	}
	if len(x[2].Frames) != 2 || x[2].Frames[0]["text"] != "ping" || x[2].Frames[1]["base64"] != "AQI=" {
		t.Errorf("frames: %v", x[2].Frames)
	}
}
