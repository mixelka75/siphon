package main

import (
	"context"
	"encoding/base64"
	"errors"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"siphon/internal/app"
	"siphon/internal/webui"
)

var version = "0.2.0"

type Desktop struct {
	ctx     context.Context
	backend *app.App
}

func (d *Desktop) Connection() string         { return d.backend.URL }
func (d *Desktop) CopyText(text string) error { return wruntime.ClipboardSetText(d.ctx, text) }
func (d *Desktop) SaveFile(name, data string) (bool, error) {
	bytes, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return false, errors.New("неверные данные файла")
	}
	path, err := wruntime.SaveFileDialog(d.ctx, wruntime.SaveDialogOptions{DefaultFilename: filepath.Base(name), Title: "Сохранить файл Siphon"})
	if err != nil || path == "" {
		return false, err
	}
	if err := os.WriteFile(path, bytes, 0600); err != nil {
		return false, err
	}
	return true, nil
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	backend, err := app.Start(ctx, app.Config{Version: version, UIAddr: "127.0.0.1:0", Desktop: true})
	if err != nil {
		log.Fatal(err)
	}
	defer backend.Close()
	d := &Desktop{backend: backend}
	err = wails.Run(&options.App{
		Title: "Siphon", Width: 1280, Height: 850, MinWidth: 900, MinHeight: 600,
		BackgroundColour:   options.NewRGB(18, 18, 18),
		AssetServer:        &assetserver.Options{Assets: webui.FS()},
		OnStartup:          func(ctx context.Context) { d.ctx = ctx },
		OnShutdown:         func(context.Context) { backend.Close() },
		Bind:               []interface{}{d},
		SingleInstanceLock: &options.SingleInstanceLock{UniqueId: "com.siphon.desktop", OnSecondInstanceLaunch: func(options.SecondInstanceData) { wruntime.WindowShow(d.ctx); wruntime.WindowUnminimise(d.ctx) }},
		Mac:                &mac.Options{About: &mac.AboutInfo{Title: "Siphon " + version, Message: "HTTP(S) · Android · Frida", Icon: appIcon}},
		Linux:              &linux.Options{ProgramName: "siphon", Icon: appIcon},
	})
	if err != nil {
		log.Fatal(err)
	}
}
