package capture

import (
	"strconv"
	"sync"
)

const (
	defaultBodyBudget = 768 << 20 // суммарный объём тел в памяти
	maxFramesPerEx    = 5000
	subBuffer         = 8192
)

type bodies struct {
	req, resp []byte
}

// Store хранит записи, тела и кадры, и рассылает события подписчикам.
type Store struct {
	mu        sync.RWMutex
	seq       uint64
	order     []*Exchange
	byID      map[string]*Exchange
	bodies    map[string]*bodies
	frames    map[string][]Frame
	bodyBytes int64
	budget    int64

	subMu   sync.Mutex
	nextSub int
	subs    map[int]chan Event
}

func NewStore() *Store {
	return &Store{
		byID:   make(map[string]*Exchange),
		bodies: make(map[string]*bodies),
		frames: make(map[string][]Frame),
		budget: defaultBodyBudget,
		subs:   make(map[int]chan Event),
	}
}

// Subscribe возвращает канал событий. Если подписчик не успевает читать,
// канал закрывается — клиент должен перечитать состояние (List) и подписаться снова.
func (s *Store) Subscribe() (<-chan Event, func()) {
	ch := make(chan Event, subBuffer)
	s.subMu.Lock()
	id := s.nextSub
	s.nextSub++
	s.subs[id] = ch
	s.subMu.Unlock()

	cancel := func() {
		s.subMu.Lock()
		if c, ok := s.subs[id]; ok {
			delete(s.subs, id)
			close(c)
		}
		s.subMu.Unlock()
	}
	return ch, cancel
}

func (s *Store) publish(ev Event) {
	s.subMu.Lock()
	defer s.subMu.Unlock()
	for id, ch := range s.subs {
		select {
		case ch <- ev:
		default:
			delete(s.subs, id)
			close(ch)
		}
	}
}

func snapshot(e *Exchange) *Exchange {
	cp := *e
	return &cp
}

// Add регистрирует запись, назначая ей ID и порядковый номер.
func (s *Store) Add(e *Exchange) *Exchange {
	s.mu.Lock()
	s.seq++
	e.Seq = s.seq
	e.ID = strconv.FormatUint(s.seq, 10)
	s.order = append(s.order, e)
	s.byID[e.ID] = e
	snap := snapshot(e)
	s.mu.Unlock()

	s.publish(Event{Type: "add", Exchange: snap})
	return snap
}

// Update изменяет запись под блокировкой и уведомляет подписчиков.
// Message-структуры внутри Exchange нужно заменять целиком, а не править на месте.
func (s *Store) Update(id string, fn func(*Exchange)) {
	s.mu.Lock()
	e, ok := s.byID[id]
	if !ok {
		s.mu.Unlock()
		return
	}
	fn(e)
	snap := snapshot(e)
	s.mu.Unlock()

	s.publish(Event{Type: "update", Exchange: snap})
}

func (s *Store) Get(id string) (Exchange, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.byID[id]
	if !ok {
		return Exchange{}, false
	}
	return *e, true
}

// LastSeq — порядковый номер последней записи (0, если записей не было).
// Агенты используют его как отметку «до этого момента».
func (s *Store) LastSeq() uint64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.seq
}

func (s *Store) List() []Exchange {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Exchange, len(s.order))
	for i, e := range s.order {
		out[i] = *e
	}
	return out
}

// SetBody сохраняет тело запроса (req=true) или ответа.
func (s *Store) SetBody(id string, req bool, data []byte) {
	s.mu.Lock()
	if _, ok := s.byID[id]; !ok {
		s.mu.Unlock()
		return
	}
	b := s.bodies[id]
	if b == nil {
		b = &bodies{}
		s.bodies[id] = b
	}
	if req {
		s.bodyBytes += int64(len(data) - len(b.req))
		b.req = data
	} else {
		s.bodyBytes += int64(len(data) - len(b.resp))
		b.resp = data
	}
	evicted := s.evictLocked()
	s.mu.Unlock()

	for _, snap := range evicted {
		s.publish(Event{Type: "update", Exchange: snap})
	}
}

// evictLocked освобождает тела самых старых записей, пока не уложимся в бюджет.
func (s *Store) evictLocked() []*Exchange {
	if s.bodyBytes <= s.budget {
		return nil
	}
	var evicted []*Exchange
	for _, e := range s.order {
		if s.bodyBytes <= s.budget {
			break
		}
		if e.Pinned {
			continue
		}
		b := s.bodies[e.ID]
		if b == nil || (len(b.req) == 0 && len(b.resp) == 0) {
			continue
		}
		s.bodyBytes -= int64(len(b.req) + len(b.resp))
		delete(s.bodies, e.ID)
		e.BodyEvicted = true
		evicted = append(evicted, snapshot(e))
	}
	return evicted
}

func (s *Store) Body(id string, req bool) []byte {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b := s.bodies[id]
	if b == nil {
		return nil
	}
	if req {
		return b.req
	}
	return b.resp
}

// AddFrame дописывает кадр WebSocket/raw-потока.
func (s *Store) AddFrame(id string, f Frame) {
	s.mu.Lock()
	e, ok := s.byID[id]
	if !ok {
		s.mu.Unlock()
		return
	}
	list := s.frames[id]
	f.Seq = e.FrameCount
	e.FrameCount++
	if len(list) < maxFramesPerEx {
		s.frames[id] = append(list, f)
	}
	s.mu.Unlock()

	s.publish(Event{Type: "frame", ID: id, Frame: &f})
}

func (s *Store) Frames(id string) []Frame {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]Frame(nil), s.frames[id]...)
}

func (s *Store) Delete(ids []string) {
	if len(ids) == 0 {
		return
	}
	drop := make(map[string]bool, len(ids))
	for _, id := range ids {
		drop[id] = true
	}
	s.mu.Lock()
	kept := s.order[:0]
	for _, e := range s.order {
		if drop[e.ID] {
			s.removeLocked(e.ID)
			continue
		}
		kept = append(kept, e)
	}
	for i := len(kept); i < len(s.order); i++ {
		s.order[i] = nil
	}
	s.order = kept
	s.mu.Unlock()

	s.publish(Event{Type: "delete", IDs: ids})
}

// Clear удаляет всё, кроме закреплённых записей (если keepPinned).
func (s *Store) Clear(keepPinned bool) {
	s.mu.Lock()
	var kept []*Exchange
	for _, e := range s.order {
		if keepPinned && e.Pinned {
			kept = append(kept, e)
			continue
		}
		s.removeLocked(e.ID)
	}
	s.order = kept
	s.mu.Unlock()

	s.publish(Event{Type: "clear"})
}

func (s *Store) removeLocked(id string) {
	if b := s.bodies[id]; b != nil {
		s.bodyBytes -= int64(len(b.req) + len(b.resp))
	}
	delete(s.bodies, id)
	delete(s.frames, id)
	delete(s.byID, id)
}
