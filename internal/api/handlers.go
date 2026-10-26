package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"siphon/internal/capture"
	"siphon/internal/intercept"
	"siphon/internal/proxy"
)

func (s *Server) handleList(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, s.store.List())
}

func (s *Server) handleGet(w http.ResponseWriter, r *http.Request) {
	ex, ok := s.store.Get(r.PathValue("id"))
	if !ok {
		writeErr(w, 404, errors.New("запись не найдена"))
		return
	}
	writeJSON(w, 200, ex)
}

// handleBody отдаёт тело. Всегда как octet-stream с nosniff и sandbox:
// перехваченный HTML/JS не должен исполняться в origin Siphon.
func (s *Server) handleBody(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ex, ok := s.store.Get(id)
	if !ok {
		writeErr(w, 404, errors.New("запись не найдена"))
		return
	}
	req := r.URL.Query().Get("side") != "response"
	msg := ex.Response
	if req {
		msg = ex.Request
	}
	if msg == nil {
		writeErr(w, 404, errors.New("нет такой части записи"))
		return
	}

	data := s.store.Body(id, req)
	decodeErr := ""
	if r.URL.Query().Get("raw") == "" {
		if dec, err := capture.Decode(msg.Encoding, data); err != nil {
			decodeErr = err.Error()
		} else {
			data = dec
		}
	}

	h := w.Header()
	h.Set("Content-Type", "application/octet-stream")
	h.Set("Content-Security-Policy", "sandbox")
	h.Set("X-Body-Content-Type", msg.ContentType)
	h.Set("X-Body-Size", fmt.Sprint(msg.Size))
	if msg.Truncated {
		h.Set("X-Body-Truncated", "1")
	}
	if ex.BodyEvicted {
		h.Set("X-Body-Evicted", "1")
	}
	if decodeErr != "" {
		h.Set("X-Decode-Error", strings.ReplaceAll(decodeErr, "\n", " "))
	}
	if r.URL.Query().Get("download") != "" {
		h.Set("Content-Disposition", `attachment; filename="siphon-body-`+id+`.bin"`)
	}
	_, _ = w.Write(data)
}

func (s *Server) handleFrames(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, s.store.Frames(r.PathValue("id")))
}

func (s *Server) handleCurl(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ex, ok := s.store.Get(id)
	if !ok {
		writeErr(w, 404, errors.New("запись не найдена"))
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte(capture.CurlCommand(ex, s.store.Body(id, true))))
}

func (s *Server) handlePin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Pinned bool `json:"pinned"`
	}
	if err := readJSON(r, &body); err != nil {
		writeErr(w, 400, err)
		return
	}
	s.store.Update(r.PathValue("id"), func(e *capture.Exchange) { e.Pinned = body.Pinned })
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := readJSON(r, &body); err != nil {
		writeErr(w, 400, err)
		return
	}
	s.store.Delete(body.IDs)
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleClear(w http.ResponseWriter, r *http.Request) {
	var body struct {
		KeepPinned bool `json:"keepPinned"`
	}
	_ = readJSON(r, &body)
	s.store.Clear(body.KeepPinned)
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// handleHAR: GET ?ids=1,2 или POST {"ids":[...]} — пустой список означает «все».
func (s *Server) handleHAR(w http.ResponseWriter, r *http.Request) {
	var ids []string
	if r.Method == http.MethodPost {
		var body struct {
			IDs []string `json:"ids"`
		}
		if err := readJSON(r, &body); err != nil {
			writeErr(w, 400, err)
			return
		}
		ids = body.IDs
	} else if q := r.URL.Query().Get("ids"); q != "" {
		ids = strings.Split(q, ",")
	}

	all := s.store.List()
	list := all
	if len(ids) > 0 {
		want := make(map[string]bool, len(ids))
		for _, id := range ids {
			want[id] = true
		}
		list = list[:0:0]
		for _, e := range all {
			if want[e.ID] {
				list = append(list, e)
			}
		}
	}
	data, err := capture.HAR(list, s.store.Body, s.cfg.Version)
	if err != nil {
		writeErr(w, 500, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition",
		`attachment; filename="siphon-`+time.Now().Format("20060102-150405")+`.har"`)
	_, _ = w.Write(data)
}

func (s *Server) handleGetSettings(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, s.engine.Settings.Get())
}

func (s *Server) handlePutSettings(w http.ResponseWriter, r *http.Request) {
	var d proxy.SettingsData
	if err := readJSON(r, &d); err != nil {
		writeErr(w, 400, err)
		return
	}
	if err := s.engine.Settings.Set(d); err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 200, s.engine.Settings.Get())
}

// ---- Android ----

func (s *Server) handleAndroid(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{
		"adb":      s.mgr.ADBStatus(),
		"devices":  s.mgr.Devices(),
		"sessions": s.mgr.Sessions(),
	})
}

func statusFor(err error) int {
	if errors.Is(err, intercept.ErrBusy) {
		return http.StatusConflict
	}
	return http.StatusBadGateway
}

func (s *Server) handleDownloadADB(w http.ResponseWriter, _ *http.Request) {
	if s.mgr.ADBStatus().Downloading {
		writeErr(w, 409, intercept.ErrBusy)
		return
	}
	go func() { _ = s.mgr.DownloadADB(s.mgr.Context()) }()
	writeJSON(w, 202, map[string]bool{"ok": true})
}

func (s *Server) handleInspect(w http.ResponseWriter, r *http.Request) {
	info, err := s.mgr.Inspect(r.Context(), r.PathValue("serial"))
	if err != nil {
		writeErr(w, statusFor(err), err)
		return
	}
	writeJSON(w, 200, info)
}

func (s *Server) handlePrepare(w http.ResponseWriter, r *http.Request) {
	if err := s.mgr.PrepareAsync(r.PathValue("serial")); err != nil {
		writeErr(w, statusFor(err), err)
		return
	}
	writeJSON(w, 202, map[string]bool{"ok": true})
}

func (s *Server) handleStopFrida(w http.ResponseWriter, r *http.Request) {
	if err := s.mgr.StopFrida(r.Context(), r.PathValue("serial")); err != nil {
		writeErr(w, statusFor(err), err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleRestartFramework(w http.ResponseWriter, r *http.Request) {
	if err := s.mgr.RestartFrameworkAsync(r.PathValue("serial")); err != nil {
		writeErr(w, statusFor(err), err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]bool{"ok": true})
}

func (s *Server) handleApps(w http.ResponseWriter, r *http.Request) {
	apps, err := s.mgr.Apps(r.Context(), r.PathValue("serial"))
	if err != nil {
		writeErr(w, statusFor(err), err)
		return
	}
	writeJSON(w, 200, apps)
}

func (s *Server) handleStartSession(w http.ResponseWriter, r *http.Request) {
	var req intercept.StartRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, err)
		return
	}
	info, err := s.mgr.StartIntercept(req)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 202, info)
}

func (s *Server) handleStopSession(w http.ResponseWriter, r *http.Request) {
	if err := s.mgr.StopSession(r.PathValue("id")); err != nil {
		writeErr(w, 404, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) handleDismissSession(w http.ResponseWriter, r *http.Request) {
	if err := s.mgr.DismissSession(r.PathValue("id")); err != nil {
		writeErr(w, 400, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
