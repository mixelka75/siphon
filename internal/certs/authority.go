// Package certs управляет корневым сертификатом Siphon и выпускает
// «на лету» сертификаты для хостов, трафик которых мы расшифровываем.
package certs

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	caCertFile   = "ca.pem"
	caKeyFile    = "ca-key.pem"
	leafLifetime = 300 * 24 * time.Hour
	maxCacheSize = 4096
)

type Authority struct {
	cert    *x509.Certificate
	key     *ecdsa.PrivateKey
	certPEM []byte

	// Один ключ на все листовые сертификаты: выпуск становится почти бесплатным.
	leafKey *ecdsa.PrivateKey

	mu    sync.Mutex
	cache map[string]*tls.Certificate
}

// LoadOrCreate читает CA из dir или создаёт новый, если его нет, он повреждён
// либо скоро истекает.
func LoadOrCreate(dir string) (*Authority, error) {
	certPath := filepath.Join(dir, caCertFile)
	keyPath := filepath.Join(dir, caKeyFile)

	certPEM, certErr := os.ReadFile(certPath)
	keyPEM, keyErr := os.ReadFile(keyPath)
	if certErr == nil && keyErr == nil {
		if a, err := fromPEM(certPEM, keyPEM); err == nil && time.Until(a.cert.NotAfter) > 30*24*time.Hour {
			return a, nil
		}
	}

	a, keyPEM, err := generate()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	if err := os.WriteFile(certPath, a.certPEM, 0o644); err != nil {
		return nil, err
	}
	if err := os.WriteFile(keyPath, keyPEM, 0o600); err != nil {
		return nil, err
	}
	return a, nil
}

func newAuthority(cert *x509.Certificate, key *ecdsa.PrivateKey, certPEM []byte) (*Authority, error) {
	leafKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	return &Authority{
		cert:    cert,
		key:     key,
		certPEM: certPEM,
		leafKey: leafKey,
		cache:   make(map[string]*tls.Certificate),
	}, nil
}

func fromPEM(certPEM, keyPEM []byte) (*Authority, error) {
	certBlock, _ := pem.Decode(certPEM)
	keyBlock, _ := pem.Decode(keyPEM)
	if certBlock == nil || keyBlock == nil {
		return nil, errors.New("certs: неверный PEM")
	}
	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return nil, err
	}
	key, err := x509.ParseECPrivateKey(keyBlock.Bytes)
	if err != nil {
		return nil, err
	}
	return newAuthority(cert, key, certPEM)
}

func generate() (*Authority, []byte, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	suffix := make([]byte, 3)
	_, _ = rand.Read(suffix)
	now := time.Now()
	tmpl := &x509.Certificate{
		SerialNumber: randomSerial(),
		Subject: pkix.Name{
			CommonName:   "Siphon CA " + hex.EncodeToString(suffix),
			Organization: []string{"Siphon"},
		},
		NotBefore:             now.Add(-24 * time.Hour),
		NotAfter:              now.AddDate(10, 0, 0),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign | x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
		IsCA:                  true,
		MaxPathLen:            0,
		MaxPathLenZero:        true,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return nil, nil, err
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, nil, err
	}
	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return nil, nil, err
	}
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
	a, err := newAuthority(cert, key, certPEM)
	return a, keyPEM, err
}

func randomSerial() *big.Int {
	n, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 127))
	if err != nil {
		return big.NewInt(time.Now().UnixNano())
	}
	return n
}

func (a *Authority) CertPEM() []byte { return a.certPEM }
func (a *Authority) CertDER() []byte { return a.cert.Raw }

// Pool — пул с этим CA, удобно для клиентов и тестов.
func (a *Authority) Pool() *x509.CertPool {
	p := x509.NewCertPool()
	p.AddCert(a.cert)
	return p
}

func (a *Authority) Subject() string { return a.cert.Subject.CommonName }

// Leaf возвращает сертификат для host (DNS-имя или IP).
func (a *Authority) Leaf(host string) (*tls.Certificate, error) {
	host = strings.ToLower(strings.TrimSuffix(strings.TrimSpace(host), "."))
	if host == "" {
		return nil, errors.New("certs: пустое имя хоста")
	}

	a.mu.Lock()
	if c, ok := a.cache[host]; ok {
		a.mu.Unlock()
		return c, nil
	}
	a.mu.Unlock()

	now := time.Now()
	tmpl := &x509.Certificate{
		SerialNumber:          randomSerial(),
		Subject:               pkix.Name{CommonName: truncate(host, 64)},
		NotBefore:             now.Add(-24 * time.Hour),
		NotAfter:              now.Add(leafLifetime),
		KeyUsage:              x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}
	if ip := net.ParseIP(host); ip != nil {
		tmpl.IPAddresses = []net.IP{ip}
	} else {
		tmpl.DNSNames = []string{host}
	}

	der, err := x509.CreateCertificate(rand.Reader, tmpl, a.cert, &a.leafKey.PublicKey, a.key)
	if err != nil {
		return nil, fmt.Errorf("certs: выпуск сертификата для %q: %w", host, err)
	}
	c := &tls.Certificate{Certificate: [][]byte{der}, PrivateKey: a.leafKey}

	a.mu.Lock()
	if len(a.cache) >= maxCacheSize {
		a.cache = make(map[string]*tls.Certificate)
	}
	a.cache[host] = c
	a.mu.Unlock()
	return c, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
