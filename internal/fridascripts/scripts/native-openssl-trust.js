// Trust Siphon's CA in OpenSSL statically bundled inside Android app libraries.
// Uses public OpenSSL APIs and preserves peer/hostname verification and callbacks.
// SPDX-License-Identifier: AGPL-3.0-or-later
(() => {
    if (Process.platform !== 'linux') return;
    const installed = new Map();
    const der = Memory.alloc(CERT_DER.byteLength);
    der.writeByteArray(CERT_DER);
    Process.attachModuleObserver({
        onAdded(module) {
            // Defer symbol lookup until Android's linker has completed loading.
            // Looking up symbols while it is notifying observers can re-enter dlopen.
            setTimeout(() => {
            if (!Process.findModuleByAddress(module.base)) return;
            if (!module.path.startsWith('/data/app/') || installed.has(module.path)) return;
            const symbols = {};
            for (const name of ['SSL_CTX_new', 'SSL_CTX_get_cert_store', 'X509_STORE_add_cert', 'd2i_X509', 'X509_free']) {
                symbols[name] = module.findExportByName(name);
                if (!symbols[name]) return;
            }
            const getStore = new NativeFunction(symbols.SSL_CTX_get_cert_store, 'pointer', ['pointer']);
            const decode = new NativeFunction(symbols.d2i_X509, 'pointer', ['pointer', 'pointer', 'long']);
            const add = new NativeFunction(symbols.X509_STORE_add_cert, 'int', ['pointer', 'pointer']);
            const free = new NativeFunction(symbols.X509_free, 'void', ['pointer']);
            const stores = new Set();
            const hooks = [];
            let logged = false;
            const trust = (store) => {
                if (store.isNull() || stores.has(store.toString())) return;
                const input = Memory.alloc(Process.pointerSize);
                input.writePointer(der);
                const cert = decode(ptr(0), input, CERT_DER.byteLength);
                if (cert.isNull()) throw new Error('OpenSSL rejected the CA certificate');
                let ok;
                try { ok = add(store, cert); } finally { free(cert); }
                if (ok === 1) {
                    stores.add(store.toString());
                    if (!logged) { console.log(`== Siphon CA trusted in bundled OpenSSL: ${module.name} ==`); logged = true; }
                }
            };
            const guarded = (fn) => { try { fn(); } catch (e) { console.log(`OpenSSL CA injection (${module.name}): ${e}`); } };
            hooks.push(Interceptor.attach(symbols.SSL_CTX_new, {
                onLeave(ctx) { if (!ctx.isNull()) guarded(() => trust(getStore(ctx))); }
            }));
            const newSSL = module.findExportByName('SSL_new');
            if (newSSL) hooks.push(Interceptor.attach(newSSL, {
                onEnter(args) { if (!args[0].isNull()) guarded(() => trust(getStore(args[0]))); }
            }));
            const replaceStore = module.findExportByName('SSL_CTX_set_cert_store');
            if (replaceStore) hooks.push(Interceptor.attach(replaceStore, {
                onEnter(args) { guarded(() => trust(args[1])); }
            }));
            const freeStore = module.findExportByName('X509_STORE_free');
            if (freeStore) hooks.push(Interceptor.attach(freeStore, {
                onEnter(args) { stores.delete(args[0].toString()); }
            }));
            installed.set(module.path, hooks);
            }, 100);
        },
        onRemoved(module) {
            const hooks = installed.get(module.path);
            if (hooks) { hooks.forEach((hook) => hook.detach()); installed.delete(module.path); }
        }
    });
})();
