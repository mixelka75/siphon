package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"siphon/internal/adb"
	"siphon/internal/capture"
	"siphon/internal/intercept"
	"siphon/internal/proxy"
)

// handleList: все записи или выборка (?since=SEQ&filter=…&ids=…&limit=N).
// С ?wait=SEC ждёт, пока в выборке появится хотя бы одна завершённая запись.
func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	q, err := trafficQuery(r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	if d := waitParam(r); d > 0 {
		ctx, cancel := context.WithTimeout(r.Context(), d)
		s.waitTraffic(ctx, func() bool { return slices.ContainsFunc(q.Select(s.store.List()), finished) })
		cancel()
	}
	list := q.Select(s.store.List())
	if limit, _ := strconv.Atoi(r.URL.Query().Get("limit")); limit > 0 && len(list) > limit {
		list = list[len(list)-limit:]
	}
	writeJSON(w, 200, list)
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

// handleHAR: GET ?ids=1,2 или POST {"ids":[...]} — пустая выборка означает «все».
// Принимает те же since и filter, что и /api/exchanges.
func (s *Server) handleHAR(w http.ResponseWriter, r *http.Request) {
	q, err := trafficQuery(r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	list := q.Select(s.store.List())
	data, err := capture.HAR(list, s.store.Body, s.cfg.Version)
	if err != nil {
		writeErr(w, 500, err)
		return
	}
	w.Header().Set("X-Siphon-Count", strconv.Itoa(len(list)))
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition",
		`attachment; filename="siphon-`+time.Now().Format("20060102-150405")+`.har"`)
	_, _ = w.Write(data)
}

// handleExportJSON — экспорт в формате siphon/v1: записи целиком, с
// раскодированными телами и кадрами WebSocket. Выборка — как у HAR.
func (s *Server) handleExportJSON(w http.ResponseWriter, r *http.Request) {
	q, err := trafficQuery(r)
	if err != nil {
		writeErr(w, 400, err)
		return
	}
	doc := capture.ExportJSON(q.Select(s.store.List()), s.store.Body, s.store.Frames, s.cfg.Version)
	w.Header().Set("X-Siphon-Count", strconv.Itoa(doc.Count))
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition",
		`attachment; filename="siphon-`+time.Now().Format("20060102-150405")+`.json"`)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	_ = enc.Encode(doc)
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

func (s *Server) device(serial string) (intercept.DeviceView, bool) {
	for _, d := range s.mgr.Devices() {
		if d.Serial == serial {
			return d, true
		}
	}
	return intercept.DeviceView{}, false
}

// handlePrepare запускает подготовку в фоне. С ?wait=SEC дожидается итога и
// отвечает 200 с устройством (или ошибкой), а если время вышло — 202.
func (s *Server) handlePrepare(w http.ResponseWriter, r *http.Request) {
	serial := r.PathValue("serial")
	done, err := s.mgr.PrepareAsync(serial)
	if err != nil {
		writeErr(w, statusFor(err), err)
		return
	}
	if d := waitParam(r); d > 0 {
		select {
		case err := <-done:
			if err != nil {
				writeErr(w, statusFor(err), err)
				return
			}
			dev, _ := s.device(serial)
			writeJSON(w, 200, dev)
			return
		case <-time.After(d):
		case <-r.Context().Done():
			return
		}
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

// handleStartSession запускает перехват. С ?wait=SEC ждёт, пока сессия выйдет
// из состояния starting: 200 и сессия (running, error или stopped — смотрите
// state и log), 202 — если время вышло.
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
	if d := waitParam(r); d > 0 {
		deadline := time.After(d)
		tick := time.NewTicker(300 * time.Millisecond)
		defer tick.Stop()
		for info.State == "starting" {
			select {
			case <-deadline:
				writeJSON(w, 202, info)
				return
			case <-r.Context().Done():
				return
			case <-tick.C:
			}
			for _, sess := range s.mgr.Sessions() {
				if sess.ID == info.ID {
					info = sess
				}
			}
		}
		writeJSON(w, 200, info)
		return
	}
	writeJSON(w, 202, info)
}

func (s *Server) handleEmulators(w http.ResponseWriter, r *http.Request) {
	bin, binErr := adb.LocateEmulator()
	st := map[string]any{"found": binErr == nil, "path": bin}
	if binErr != nil {
		st["error"] = binErr.Error()
	}
	list, err := s.mgr.Emulators(r.Context())
	if err != nil {
		writeErr(w, 500, err)
		return
	}
	writeJSON(w, 200, map[string]any{"emulator": st, "avds": list})
}

// handleStartEmulator: POST {"headless":false,"coldBoot":false}. Уже запущенный
// AVD не перезапускается. С ?wait=SEC ждёт полной загрузки Android: 200 —
// загрузился (state=running), 202 — время вышло, ещё грузится.
func (s *Server) handleStartEmulator(w http.ResponseWriter, r *http.Request) {
	var opts adb.EmulatorOptions
	if err := readJSON(r, &opts); err != nil && !errors.Is(err, io.EOF) {
		writeErr(w, 400, err)
		return
	}
	name := r.PathValue("name")
	v, err := s.mgr.StartEmulator(r.Context(), name, opts)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err)
		return
	}
	if d := waitParam(r); d > 0 && v.State != "running" {
		ctx, cancel := context.WithTimeout(r.Context(), d)
		v, err = s.mgr.WaitEmulator(ctx, name)
		cancel()
		if err != nil {
			writeErr(w, http.StatusBadGateway, err)
			return
		}
	}
	status := http.StatusAccepted
	if v.State == "running" {
		status = http.StatusOK
	}
	writeJSON(w, status, v)
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
