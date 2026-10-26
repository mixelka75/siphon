// Package sysproc запускает процессы, которые переживают Siphon.
package sysproc

import (
	"os/exec"
	"syscall"
)

const detachedProcess = 0x00000008

// Detach отвязывает процесс от консоли и группы Siphon.
func Detach(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP | detachedProcess}
}
