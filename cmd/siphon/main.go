// Siphon — перехват HTTP(S)-трафика Android-приложений через Frida.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"

	"siphon/internal/app"
)

var version = "0.2.0"

func main() {
	uiAddr := flag.String("ui", "127.0.0.1:8484", "адрес интерфейса (только локальный)")
	proxyAddr := flag.String("proxy", "127.0.0.1:8000", "адрес ручного прокси")
	dataDir := flag.String("data", "", "каталог данных")
	noOpen := flag.Bool("no-open", false, "не открывать браузер")
	showVersion := flag.Bool("version", false, "показать версию")
	flag.Parse()
	if *showVersion {
		fmt.Println("siphon", version)
		return
	}
	log.SetFlags(log.Ltime)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	a, err := app.Start(ctx, app.Config{Version: version, DataDir: *dataDir, UIAddr: *uiAddr, ProxyAddr: *proxyAddr})
	if err != nil {
		log.Fatal(err)
	}
	defer a.Close()
	log.Printf("Siphon %s\nинтерфейс: %s\nручной прокси: %s\nданные: %s", version, a.URL, a.ProxyAddr, a.DataDir)
	if !*noOpen {
		openBrowser(a.URL)
	}
	<-ctx.Done()
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}
