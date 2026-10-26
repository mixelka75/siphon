package rules

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"sync"

	"golang.org/x/net/http/httpguts"

	"siphon/internal/capture"
)

// Resolution — решение пользователя по остановленному запросу или ответу.
// Поля, которые не заданы, означают «оставить как есть».
type Resolution struct {
	Drop       bool              `json:"drop,omitempty"` // оборвать соединение
	Method     string            `json:"method,omitempty"`
	URL        string            `json:"url,omitempty"`
	Status     int               `json:"status,omitempty"`
	Headers    *[]capture.Header `json:"headers,omitempty"` // целиком заменяют заголовки
	Body       *string           `json:"body,omitempty"`    // текст
	BodyBase64 *string           `json:"bodyBase64,omitempty"`
}

// BodyBytes возвращает новое тело, если оно задано.
func (r Resolution) BodyBytes() (body []byte, set bool, err error) {
	if r.BodyBase64 != nil {
		b, err := base64.StdEncoding.DecodeString(*r.BodyBase64)
		return b, true, err
	}
	if r.Body != nil {
		return []byte(*r.Body), true, nil
	}
	return nil, false, nil
}

var ErrNotPaused = errors.New("эта запись не остановлена на breakpoint")

func (r Resolution) Validate() error {
	if r.Method != "" && !httpguts.ValidHeaderFieldName(r.Method) {
		return errors.New("неверный HTTP-метод")
	}
	if r.Status != 0 && (r.Status < 200 || r.Status > 599) {
		return errors.New("статус ответа должен быть от 200 до 599")
	}
	if r.URL != "" {
		u, err := url.Parse(r.URL)
		if err != nil || u.Hostname() == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return errors.New("ожидается адрес http:// или https://")
		}
	}
	if r.Headers != nil {
		for _, h := range *r.Headers {
			if !httpguts.ValidHeaderFieldName(h.Name) || !httpguts.ValidHeaderFieldValue(h.Value) {
				return fmt.Errorf("неверный заголовок %q", h.Name)
			}
		}
	}
	if r.Body != nil && r.BodyBase64 != nil {
		return errors.New("задайте body либо bodyBase64")
	}
	if _, _, err := r.BodyBytes(); err != nil {
		return errors.New("неверный base64 тела")
	}
	return nil
}

// Breakpoints хранит остановленные запросы и ждёт решения из интерфейса.
type Breakpoints struct {
	mu      sync.Mutex
	waiting map[string]chan Resolution
}

func NewBreakpoints() *Breakpoints {
	return &Breakpoints{waiting: map[string]chan Resolution{}}
}

// Wait блокируется, пока пользователь не примет решение (или не оборвётся ctx).
func (b *Breakpoints) Wait(ctx context.Context, id string) (Resolution, error) {
	return b.WaitReady(ctx, id, nil)
}

// Register before publishing the paused state so a fast client can resolve it.
func (b *Breakpoints) WaitReady(ctx context.Context, id string, ready func()) (Resolution, error) {
	ch := make(chan Resolution, 1)
	b.mu.Lock()
	b.waiting[id] = ch
	b.mu.Unlock()
	defer func() {
		b.mu.Lock()
		if b.waiting[id] == ch {
			delete(b.waiting, id)
		}
		b.mu.Unlock()
	}()
	if ready != nil {
		ready()
	}

	select {
	case res := <-ch:
		return res, nil
	case <-ctx.Done():
		return Resolution{}, ctx.Err()
	}
}

func (b *Breakpoints) Resolve(id string, res Resolution) error {
	if err := res.Validate(); err != nil {
		return err
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	ch, ok := b.waiting[id]
	if !ok {
		return ErrNotPaused
	}
	select {
	case ch <- res:
		delete(b.waiting, id)
		return nil
	default:
		return ErrNotPaused
	}
}

func (b *Breakpoints) IsWaiting(id string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	_, ok := b.waiting[id]
	return ok
}
