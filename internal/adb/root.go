package adb

import (
	"context"
	"errors"
	"io"
	"strings"
	"time"
)

var ErrNoRoot = errors.New("нет root-доступа на устройстве")

// Root описывает способ выполнять команды от root на устройстве.
type Root struct {
	Method string // adbd | su-c | su-0
}

func shQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}

// Wrap оборачивает команду так, чтобы она выполнилась от root.
func (r *Root) Wrap(cmd string) string {
	switch r.Method {
	case "su-c":
		return "su -c " + shQuote(cmd)
	case "su-0":
		return "su 0 sh -c " + shQuote(cmd)
	}
	return cmd
}

// DetectRoot проверяет, как получить root: adbd уже под root (эмуляторы,
// userdebug-сборки), либо через su (Magisk и аналоги).
func (c *Client) DetectRoot(ctx context.Context, serial string) (*Root, error) {
	for _, r := range []Root{{"adbd"}, {"su-c"}, {"su-0"}} {
		r := r
		// Magisk показывает на устройстве диалог — даём время его подтвердить.
		cctx, cancel := context.WithTimeout(ctx, 25*time.Second)
		out, _, err := c.Shell(cctx, serial, r.Wrap("id"))
		cancel()
		if err == nil && strings.Contains(out, "uid=0") {
			return &r, nil
		}
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
	}
	return nil, ErrNoRoot
}

// RestartAdbdAsRoot перезапускает adbd с правами root (работает только на
// debuggable-сборках и эмуляторах) и ждёт возвращения устройства.
func (c *Client) RestartAdbdAsRoot(ctx context.Context, serial string) error {
	conn, err := c.openTransport(ctx, serial)
	if err != nil {
		return err
	}
	if err := sendCmd(conn, "root:"); err != nil {
		conn.Close()
		return err
	}
	out, _ := io.ReadAll(conn)
	conn.Close()
	if strings.Contains(string(out), "cannot run as root") {
		return ErrNoRoot
	}

	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(700 * time.Millisecond)
		devs, err := c.Devices(ctx)
		if err != nil {
			continue
		}
		for _, d := range devs {
			if d.Serial == serial && d.State == "device" {
				return nil
			}
		}
	}
	return errors.New("устройство не вернулось после перезапуска adbd")
}
