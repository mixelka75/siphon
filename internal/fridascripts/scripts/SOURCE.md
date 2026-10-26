# Frida scripts

Upstream: https://github.com/httptoolkit/frida-interception-and-unpinning
Pinned revision: 560dd29d410fe785f9f390e3c7f86ca8359c8d67
License: AGPL-3.0-or-later (LICENSE in this directory).

Development fetch tool: `tools/fetch-frida-scripts.mjs`.
Siphon additionally includes `native-openssl-trust.js` to inject its CA into bundled OpenSSL stores;
it is authored for Siphon and uses the same SPDX license. The Java bridge is built separately by
`tools/build-java-bridge.mjs` from frida-java-bridge 7.0.13 and @frida/buffer.
