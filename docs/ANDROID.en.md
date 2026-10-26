# Android interception: details

← [README](../README.en.md) · [Русский](ANDROID.md)

## Requirements

Root is required: a **Google APIs** emulator image (without Google Play) or a rooted/Magisk phone.
`frida-server` 17.24.3 is installed automatically; its SHA-512 is pinned per architecture.
`adb` is found in `PATH`, the Android SDK or common package-manager locations (Homebrew etc.);
if absent, Siphon downloads Google's official platform-tools. Installing a certificate on the phone is not needed.

## Modes

- **Restart** loads hooks from the very start of the app.
- **Attach** connects to the running process; already open connections are not intercepted.
- **Compatible TLS** disables native verification callbacks and the exception auto-patcher. Java TLS and adding the CA to
  OpenSSL inside app libraries keep working. Useful when the app crashes.

## 2GIS

For `ru.dublgis.dgismobile` a verified profile is applied automatically: compatible TLS, no root-hiding or Flutter hooks.
Siphon detects OpenSSL inside the app library and adds **only its own CA** to `X509_STORE` through the public OpenSSL API.
Chain and server-name verification stay in place. The phone's system trust store is not modified.

Verified on **2GIS 7.30.0.634.27, Android 14, arm64**: the app works, `POST passepartout.2gis.com` is decrypted (HTTP 200,
non-empty body), `GET jam.api.2gis.com` → 204. This is a check of one specific version; other protocols, app versions or extra
pinning checks may need a different profile. A TLS passthrough is not counted as a decrypted request.

## Frida recovery

On `setArgV0` / `DeadSystemException` in an emulator, Siphon recovers the Android framework and Frida once and retries.
Auto-recovery is skipped when another interception is active on the device. Readiness is checked by the new zygote PID,
the package manager and boot state. The manual **"Recover Android"** button warns that apps on the device will close.
A physical phone is never restarted automatically. Stopping a session cancels a pending start and frees the proxy port,
`adb reverse` and the Frida connection; a script load failure never leaves the app suspended.
