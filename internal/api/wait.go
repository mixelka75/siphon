package api

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"siphon/internal/capture"
)

// Ожидание дольше 15 минут агентам не нужно: можно вызвать ещё раз.
const maxWait = 15 * time.Minute

// waitParam читает ?wait=SEC: сколько вызов может ждать результата. 0 — не ждать.
func waitParam(r *http.Request) time.Duration {
	v, err := strconv.ParseFloat(r.URL.Query().Get("wait"), 64)
	if err != nil || v <= 0 {
		return 0
	}
	return min(time.Duration(v*float64(time.Second)), maxWait)
}

// trafficQuery читает выборку трафика: для GET из адреса
// (?ids=1,2&since=10&filter=host:api), для POST из тела
// {"ids":[…],"since":10,"filter":"…"}.
func trafficQuery(r *http.Request) (capture.Query, error) {
	var q capture.Query
	if r.Method == http.MethodPost {
		var body struct {
			IDs    []string `json:"ids"`
			Since  uint64   `json:"since"`
			Filter string   `json:"filter"`
		}
		if err := readJSON(r, &body); err != nil {
			return q, err
		}
		return capture.Query{IDs: body.IDs, Since: body.Since, Filter: body.Filter}, nil
	}
	v := r.URL.Query()
	if ids := v.Get("ids"); ids != "" {
		q.IDs = strings.Split(ids, ",")
	}
	q.Since, _ = strconv.ParseUint(v.Get("since"), 10, 64)
	q.Filter = v.Get("filter")
	return q, nil
}

// waitTraffic ждёт, пока cond станет истинным, проверяя его после событий
// трафика (не чаще раза в 300 мс). Возвращает итоговое значение cond.
func (s *Server) waitTraffic(ctx context.Context, cond func() bool) bool {
	if cond() {
		return true
	}
	events, cancel := s.store.Subscribe()
	defer func() { cancel() }()
	tick := time.NewTicker(300 * time.Millisecond)
	defer tick.Stop()
	dirty, idle := true, 0
	for {
		select {
		case <-ctx.Done():
			return cond()
		case _, ok := <-events:
			if !ok {
				// Не успели прочитать события: подписываемся заново и перепроверяем.
				events, cancel = s.store.Subscribe()
			}
			dirty = true
		case <-tick.C:
			// Раз в пару секунд проверяем и без событий: на случай пропущенных.
			if idle++; dirty || idle >= 7 {
				if cond() {
					return true
				}
				dirty, idle = false, 0
			}
		}
	}
}

// finished — запись уже не «в процессе»: ответ получен, ошибка или пауза на breakpoint.
func finished(e capture.Exchange) bool { return e.State != capture.StatePending }
