package monitor

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func trustServer(t *testing.T, server *httptest.Server) {
	t.Helper()
	pool := x509.NewCertPool()
	pool.AddCert(server.Certificate())
	checkTLSConfig = &tls.Config{RootCAs: pool}
	t.Cleanup(func() { checkTLSConfig = nil })
}

func newHugeBodyServer(prefix string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(prefix))
		chunk := bytes.Repeat([]byte("x"), 64<<10)
		for written := int64(0); written < 3*maxResponseBodyBytes; written += int64(len(chunk)) {
			if _, err := w.Write(chunk); err != nil {
				return
			}
		}
	}))
}

func TestKeywordMonitorLimitsBodySize(t *testing.T) {
	server := newHugeBodyServer("needle")
	defer server.Close()

	found := NewKeywordMonitor().Check(Config{URL: server.URL, Timeout: 5, Keyword: "needle"})
	if found.Status != StatusUp {
		t.Fatalf("expected keyword at the start to be found, got %+v", found)
	}

	missing := NewKeywordMonitor().Check(Config{URL: server.URL, Timeout: 5, Keyword: "absent"})
	if missing.Status != StatusDown || !strings.Contains(missing.Error, "exceeds") {
		t.Fatalf("expected truncated keyword miss, got %+v", missing)
	}
}

func TestJSONMonitorRejectsOversizedBody(t *testing.T) {
	server := newHugeBodyServer("{\"a\":\"")
	defer server.Close()

	result := NewJSONMonitor().Check(Config{URL: server.URL, Timeout: 5, JSONPath: "$.a", ExpectedValue: "x"})
	if result.Status != StatusDown || !strings.Contains(result.Error, "exceeds") {
		t.Fatalf("expected oversized body error, got %+v", result)
	}
}

func TestHTTPMonitorUsesFreshConnectionPerCheck(t *testing.T) {
	var connections atomic.Int32
	server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	server.Config.ConnState = func(_ net.Conn, state http.ConnState) {
		if state == http.StateNew {
			connections.Add(1)
		}
	}
	server.Start()
	defer server.Close()

	for i := 0; i < 3; i++ {
		if result := NewHTTPMonitor().Check(Config{URL: server.URL, Timeout: 2}); result.Status != StatusUp {
			t.Fatalf("expected up, got %+v", result)
		}
	}

	if got := connections.Load(); got != 3 {
		t.Fatalf("expected 3 connections for 3 checks, got %d", got)
	}
}

func TestHTTPMonitorReportsCertificateOnEveryCheck(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer server.Close()
	trustServer(t, server)

	for i := 0; i < 2; i++ {
		result := NewHTTPMonitor().Check(Config{URL: server.URL, Timeout: 2})
		if result.Status != StatusUp || result.CertificateInfo == nil {
			t.Fatalf("check %d: expected certificate info, got %+v", i, result)
		}
	}
}

func TestHTTPMonitorSkipsCertificateWhenSSLCheckDisabled(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer server.Close()
	trustServer(t, server)

	disabled := false
	result := NewHTTPMonitor().Check(Config{URL: server.URL, Timeout: 2, CheckSSL: &disabled})
	if result.Status != StatusUp || result.CertificateInfo != nil {
		t.Fatalf("expected no certificate info, got %+v", result)
	}
}
