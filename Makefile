.PHONY: help setup ui build run test dev-ui dist scripts clean native native-windows native-linux

help:
	@echo "make setup   — поставить зависимости интерфейса"
	@echo "make build   — собрать интерфейс и бинарник bin/siphon"
	@echo "make run     — собрать и запустить"
	@echo "make test    — все тесты Go (с -race) и проверка типов интерфейса"
	@echo "make dev-ui  — интерфейс с hot-reload (бэкенд запущен отдельно на :8484)"
	@echo "make dist    — бинарники для macOS, Linux и Windows в bin/"
	@echo "make scripts — обновить Frida-скрипты и Java-bridge (нужен Node, только для разработки)"
	@echo "make native  — нативное приложение для текущей системы (Wails)"
	@echo "make native-windows — Windows .exe (можно собрать с macOS)"
	@echo "make native-linux — Linux amd64 в Docker (GTK/WebKit)"

setup:
	cd ui && npm install

ui:
	cd ui && npm run build

build: ui
	go build -o bin/siphon ./cmd/siphon

run: build
	./bin/siphon

test:
	go vet ./...
	go test -race -count=1 ./...
	cd ui && npx tsc --noEmit

dev-ui:
	cd ui && npm run dev

dist: ui
	CGO_ENABLED=0 GOOS=darwin  GOARCH=arm64 go build -trimpath -ldflags "-s -w" -o bin/siphon-darwin-arm64 ./cmd/siphon
	CGO_ENABLED=0 GOOS=darwin  GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o bin/siphon-darwin-amd64 ./cmd/siphon
	CGO_ENABLED=0 GOOS=linux   GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o bin/siphon-linux-amd64 ./cmd/siphon
	CGO_ENABLED=0 GOOS=linux   GOARCH=arm64 go build -trimpath -ldflags "-s -w" -o bin/siphon-linux-arm64 ./cmd/siphon
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o bin/siphon-windows-amd64.exe ./cmd/siphon

scripts:
	cd tools && npm install && node fetch-frida-scripts.mjs && node build-java-bridge.mjs

clean:
	rm -rf bin

native:
	cd desktop && MACOSX_DEPLOYMENT_TARGET=13.0 go run github.com/wailsapp/wails/v2/cmd/wails@v2.17.0 build

native-windows:
	cd desktop && go run github.com/wailsapp/wails/v2/cmd/wails@v2.17.0 build -platform windows/amd64 -o Siphon.exe

native-linux: ui
	docker build --platform linux/amd64 -f desktop/Dockerfile --output type=local,dest=bin/linux-amd64 .
