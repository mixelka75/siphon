//go:build !windows

// Package sysproc запускает процессы, которые переживают Siphon.
package sysproc

import (
	"os/exec"
	"syscall"
)

// Detach отвязывает процесс от группы Siphon: Ctrl+C в терминале или
// завершение родителя (например, MCP-клиента) его не убьют.
func Detach(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
