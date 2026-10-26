FROM golang:1.27.3-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends libgtk-3-dev libwebkit2gtk-4.1-dev pkg-config && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
WORKDIR /src/desktop
RUN CGO_ENABLED=1 go build -tags production,webkit2_41 -trimpath -ldflags '-s -w' -o /out/siphon .
FROM scratch AS artifact
COPY --from=build /out/siphon /siphon
