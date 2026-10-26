package api

import (
	"encoding/json"
	"net/http"

	"siphon/internal/rules"
)

func (s *Server) handleGetRules(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, s.engine.Rules.Get())
}

func (s *Server) handlePutRules(w http.ResponseWriter, r *http.Request) {
	var list []rules.Rule
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&list); err != nil {
		writeErr(w, 400, err)
		return
	}
	if err := s.engine.Rules.Replace(list); err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 200, s.engine.Rules.Get())
}

func (s *Server) handleResume(w http.ResponseWriter, r *http.Request) {
	var res rules.Resolution
	defer r.Body.Close()
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 90<<20)).Decode(&res); err != nil {
		writeErr(w, 400, err)
		return
	}
	if err := res.Validate(); err != nil {
		writeErr(w, 400, err)
		return
	}
	if err := s.engine.Breaks.Resolve(r.PathValue("id"), res); err != nil {
		writeErr(w, 409, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleDrop(w http.ResponseWriter, r *http.Request) {
	if err := s.engine.Breaks.Resolve(r.PathValue("id"), rules.Resolution{Drop: true}); err != nil {
		writeErr(w, 409, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
