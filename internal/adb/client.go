// Package adb — тонкий клиент ADB: протокол сервера (порт 5037) напрямую по
// сокету, а операции с хрупкими деталями (reverse, push) — через бинарник adb.
package adb

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type Client struct {
	Addr string // адрес adb-сервера, по умолчанию 127.0.0.1:5037
	Bin  string // путь к бинарнику adb (для reverse/push/start-server)
}

func NewClient(bin string) *Client {
	port := "5037"
	if p := os.Getenv("ANDROID_ADB_SERVER_PORT"); p != "" {
		port = p
	}
	return &Client{Addr: "127.0.0.1:" + port, Bin: bin}
}

type Device struct {
	Serial      string `json:"serial"`
	State       string `json:"state"` // device | offline | unauthorized | ...
	Model       string `json:"model,omitempty"`
	Product     string `json:"product,omitempty"`
	DeviceName  string `json:"deviceName,omitempty"`
	TransportID string `json:"transportId,omitempty"`
}

func (d Device) IsEmulator() bool { return strings.HasPrefix(d.Serial, "emulator-") }

// guardedConn обрывает операции соединения при отмене контекста. Для
// долгоживущих потоков (туннель к frida) связь с контекстом снимается release().
type guardedConn struct {
	net.Conn
	stop func() bool
}

func (g *guardedConn) Close() error {
	g.stop()
	return g.Conn.Close()
}

func (g *guardedConn) release() {
	g.stop()
	_ = g.Conn.SetDeadline(time.Time{})
}

func (c *Client) dial(ctx context.Context) (net.Conn, error) {
	var d net.Dialer
	d.Timeout = 5 * time.Second
	conn, err := d.DialContext(ctx, "tcp", c.Addr)
	if err != nil {
		return nil, fmt.Errorf("adb-сервер недоступен на %s: %w", c.Addr, err)
	}
	stop := context.AfterFunc(ctx, func() { _ = conn.SetDeadline(time.Now()) })
	return &guardedConn{Conn: conn, stop: stop}, nil
}

func sendCmd(conn net.Conn, cmd string) error {
	if _, err := fmt.Fprintf(conn, "%04x%s", len(cmd), cmd); err != nil {
		return err
	}
	return readStatus(conn)
}

func readStatus(conn io.Reader) error {
	var st [4]byte
	if _, err := io.ReadFull(conn, st[:]); err != nil {
		return err
	}
	switch string(st[:]) {
	case "OKAY":
		return nil
	case "FAIL":
		msg, err := readLenPrefixed(conn)
		if err != nil {
			return errors.New("adb: команда отклонена")
		}
		return errors.New("adb: " + msg)
	}
	return fmt.Errorf("adb: неожиданный ответ %q", st[:])
}

func readLenPrefixed(r io.Reader) (string, error) {
	var hdr [4]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return "", err
	}
	n, err := strconv.ParseUint(string(hdr[:]), 16, 32)
	if err != nil {
		return "", fmt.Errorf("adb: неверная длина %q", hdr[:])
	}
	buf := make([]byte, n)
	if _, err := io.ReadFull(r, buf); err != nil {
		return "", err
	}
	return string(buf), nil
}

func (c *Client) hostQuery(ctx context.Context, cmd string) (string, error) {
	conn, err := c.dial(ctx)
	if err != nil {
		return "", err
	}
	defer conn.Close()
	if err := sendCmd(conn, cmd); err != nil {
		return "", err
	}
	return readLenPrefixed(conn)
}

func (c *Client) Version(ctx context.Context) (string, error) {
	return c.hostQuery(ctx, "host:version")
}

func (c *Client) Devices(ctx context.Context) ([]Device, error) {
	out, err := c.hostQuery(ctx, "host:devices-l")
	if err != nil {
		return nil, err
	}
	return parseDevices(out), nil
}

// TrackDevices вызывает fn при каждом изменении списка устройств (и сразу — с
// текущим списком). Возвращается при ошибке или отмене контекста.
func (c *Client) TrackDevices(ctx context.Context, fn func([]Device)) error {
	conn, err := c.dial(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()
	if err := sendCmd(conn, "host:track-devices-l"); err != nil {
		return err
	}
	for {
		out, err := readLenPrefixed(conn)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			return err
		}
		fn(parseDevices(out))
	}
}

func parseDevices(out string) []Device {
	var devs []Device
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		d := Device{Serial: fields[0], State: fields[1]}
		for _, f := range fields[2:] {
			k, v, ok := strings.Cut(f, ":")
			if !ok {
				continue
			}
			switch k {
			case "model":
				d.Model = strings.ReplaceAll(v, "_", " ")
			case "product":
				d.Product = v
			case "device":
				d.DeviceName = v
			case "transport_id":
				d.TransportID = v
			}
		}
		devs = append(devs, d)
	}
	return devs
}

func (c *Client) openTransport(ctx context.Context, serial string) (net.Conn, error) {
	conn, err := c.dial(ctx)
	if err != nil {
		return nil, err
	}
	if err := sendCmd(conn, "host:transport:"+serial); err != nil {
		conn.Close()
		return nil, err
	}
	return conn, nil
}

// Shell выполняет команду на устройстве и возвращает вывод (stdout и stderr
// вместе) и код возврата. Команда идёт в подоболочке, чтобы exit внутри неё не
// съел маркер с кодом. Если код получить не удалось (оборвалась связь) —
// возвращается -1, а не «успех».
func (c *Client) Shell(ctx context.Context, serial, cmd string) (string, int, error) {
	conn, err := c.openTransport(ctx, serial)
	if err != nil {
		return "", -1, err
	}
	defer conn.Close()

	const marker = "__SIPHON_EXIT__:"
	if err := sendCmd(conn, "shell:(\n"+cmd+"\n)\necho "+marker+"$?"); err != nil {
		return "", -1, err
	}
	raw, err := io.ReadAll(conn)
	if err != nil && ctx.Err() != nil {
		return "", -1, ctx.Err()
	}
	out := string(raw)
	code := -1
	if i := strings.LastIndex(out, marker); i >= 0 {
		if n, convErr := strconv.Atoi(strings.TrimSpace(out[i+len(marker):])); convErr == nil {
			code = n
		}
		out = out[:i]
	}
	return strings.TrimRight(out, "\r\n"), code, nil
}

// ShellStream запускает команду на устройстве и возвращает живой поток сессии.
// Пока поток открыт, команда (например, frida-server в переднем плане) продолжает
// работать; закрытие потока завершает её.
func (c *Client) ShellStream(ctx context.Context, serial, cmd string) (net.Conn, error) {
	conn, err := c.openTransport(ctx, serial)
	if err != nil {
		return nil, err
	}
	if err := sendCmd(conn, "shell:"+cmd); err != nil {
		conn.Close()
		return nil, err
	}
	if g, ok := conn.(*guardedConn); ok {
		g.release()
	}
	return conn, nil
}

// OpenTCP открывает поток к TCP-порту на самом устройстве (127.0.0.1:port там).
func (c *Client) OpenTCP(ctx context.Context, serial string, port int) (net.Conn, error) {
	conn, err := c.openTransport(ctx, serial)
	if err != nil {
		return nil, err
	}
	if err := sendCmd(conn, "tcp:"+strconv.Itoa(port)); err != nil {
		conn.Close()
		return nil, err
	}
	// Дальше это обычный долгоживущий поток: отвязываем его от контекста запроса.
	if g, ok := conn.(*guardedConn); ok {
		g.release()
	}
	return conn, nil
}

func (c *Client) run(ctx context.Context, timeout time.Duration, args ...string) (string, error) {
	if c.Bin == "" {
		return "", errors.New("adb: бинарник не найден")
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, c.Bin, args...)
	var out bytes.Buffer
	cmd.Stdout, cmd.Stderr = &out, &out
	err := cmd.Run()
	text := strings.TrimSpace(out.String())
	if err != nil {
		if text == "" {
			text = err.Error()
		}
		return text, fmt.Errorf("adb %s: %s", strings.Join(args, " "), text)
	}
	return text, nil
}

// StartServer запускает adb-сервер, если он ещё не работает.
func (c *Client) StartServer(ctx context.Context) error {
	_, err := c.run(ctx, 30*time.Second, "start-server")
	return err
}

// Reverse пробрасывает порт устройства на порт хоста: приложение на телефоне
// подключается к 127.0.0.1:remotePort и попадает на прокси на этом компьютере.
func (c *Client) Reverse(ctx context.Context, serial string, remotePort, localPort int) error {
	_, err := c.run(ctx, 15*time.Second, "-s", serial, "reverse",
		"tcp:"+strconv.Itoa(remotePort), "tcp:"+strconv.Itoa(localPort))
	return err
}

func (c *Client) ReverseRemove(ctx context.Context, serial string, remotePort int) error {
	_, err := c.run(ctx, 15*time.Second, "-s", serial, "reverse", "--remove", "tcp:"+strconv.Itoa(remotePort))
	return err
}

// Push копирует файл на устройство и выставляет права.
func (c *Client) Push(ctx context.Context, serial, localPath, remotePath string) error {
	_, err := c.run(ctx, 5*time.Minute, "-s", serial, "push", localPath, remotePath)
	return err
}

// Props возвращает системные свойства устройства (getprop).
func (c *Client) Props(ctx context.Context, serial string) (map[string]string, error) {
	out, _, err := c.Shell(ctx, serial, "getprop")
	if err != nil {
		return nil, err
	}
	props := map[string]string{}
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimSpace(line)
		// формат: [ro.product.model]: [Pixel 7]
		k, v, ok := strings.Cut(line, "]: [")
		if !ok || !strings.HasPrefix(k, "[") || !strings.HasSuffix(v, "]") {
			continue
		}
		props[k[1:]] = v[:len(v)-1]
	}
	return props, nil
}
