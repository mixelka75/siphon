// Package capture описывает перехваченный трафик и хранит его в памяти.
package capture

import "time"

// Виды записей.
const (
	KindHTTP           = "http"
	KindWebSocket      = "websocket"
	KindRaw            = "raw"             // произвольный TCP-поток
	KindTLSError       = "tls-error"       // клиент отверг наш сертификат
	KindTLSPassthrough = "tls-passthrough" // TLS пропущен без расшифровки
)

// Состояния записи.
const (
	StatePending = "pending"
	StatePaused  = "paused" // остановлена на breakpoint
	StateDone    = "done"
	StateError   = "error"
	StateAborted = "aborted"
)

type Header struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// Message — запрос или ответ без тела (тела лежат отдельно, см. Store.Body).
type Message struct {
	Status      int      `json:"status,omitempty"`
	StatusText  string   `json:"statusText,omitempty"`
	Headers     []Header `json:"headers"`
	Size        int64    `json:"size"`
	Truncated   bool     `json:"truncated,omitempty"`
	ContentType string   `json:"contentType,omitempty"`
	Encoding    string   `json:"encoding,omitempty"`
}

type TLSInfo struct {
	Version     string `json:"version,omitempty"`
	Cipher      string `json:"cipher,omitempty"`
	ALPN        string `json:"alpn,omitempty"`
	ServerName  string `json:"serverName,omitempty"`
	CertSubject string `json:"certSubject,omitempty"`
	CertIssuer  string `json:"certIssuer,omitempty"`
	CertExpires string `json:"certExpires,omitempty"`
}

// Timing — смещения в миллисекундах от начала запроса (0 = не наступило).
type Timing struct {
	RequestDone   float64 `json:"requestDone,omitempty"`
	ResponseStart float64 `json:"responseStart,omitempty"`
	End           float64 `json:"end,omitempty"`
}

type Exchange struct {
	ID         string    `json:"id"`
	Seq        uint64    `json:"seq"`
	Kind       string    `json:"kind"`
	Source     string    `json:"source,omitempty"`
	ClientAddr string    `json:"clientAddr,omitempty"`
	State      string    `json:"state"`
	Error      string    `json:"error,omitempty"`
	Started    time.Time `json:"started"`

	Method string `json:"method,omitempty"`
	Scheme string `json:"scheme,omitempty"`
	Host   string `json:"host"`
	Port   int    `json:"port,omitempty"`
	Path   string `json:"path,omitempty"`
	URL    string `json:"url,omitempty"`
	Proto  string `json:"proto,omitempty"`

	Request  *Message `json:"request,omitempty"`
	Response *Message `json:"response,omitempty"`
	Timing   Timing   `json:"timing"`

	ServerAddr string   `json:"serverAddr,omitempty"`
	ClientTLS  *TLSInfo `json:"clientTls,omitempty"`
	ServerTLS  *TLSInfo `json:"serverTls,omitempty"`

	Pinned      bool   `json:"pinned,omitempty"`
	Rule        string `json:"rule,omitempty"`       // имя сработавшего правила
	Breakpoint  string `json:"breakpoint,omitempty"` // "request" | "response", пока запись остановлена
	Edited      bool   `json:"edited,omitempty"`     // запрос или ответ изменены правилом или вручную
	BodyEvicted bool   `json:"bodyEvicted,omitempty"`
	FrameCount  int    `json:"frameCount,omitempty"`
	BytesOut    int64  `json:"bytesOut,omitempty"` // для raw/ws: клиент → сервер
	BytesIn     int64  `json:"bytesIn,omitempty"`  // для raw/ws: сервер → клиент
}

// Frame — WebSocket-сообщение или кусок данных raw-потока.
type Frame struct {
	Seq       int       `json:"seq"`
	Dir       string    `json:"dir"`  // "out" — от клиента, "in" — к клиенту
	Kind      string    `json:"kind"` // text | binary | close | ping | pong | data
	Time      time.Time `json:"time"`
	Size      int       `json:"size"`
	Truncated bool      `json:"truncated,omitempty"`
	Data      []byte    `json:"data,omitempty"`
}

// Event — то, что получают подписчики Store.
type Event struct {
	Type     string    `json:"type"` // add | update | delete | clear | frame | resync
	Exchange *Exchange `json:"exchange,omitempty"`
	Frame    *Frame    `json:"frame,omitempty"`
	ID       string    `json:"id,omitempty"`
	IDs      []string  `json:"ids,omitempty"`
}
