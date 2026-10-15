package monitor

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"time"
)

// maxResponseBodyBytes caps how much of a response a check reads, so a
// monitor pointed at a large download cannot exhaust worker memory or
// bandwidth.
const maxResponseBodyBytes int64 = 5 << 20

const maxRedirects = 10

// checkTLSConfig overrides the TLS settings of check clients; tests use it to
// trust their self-signed servers.
var checkTLSConfig *tls.Config

// newCheckClient returns a client that opens a fresh connection for every
// check. Reusing pooled connections would hide DNS/TCP/TLS timings and the
// TLS handshake (and with it the certificate) on all but the first check.
func newCheckClient(timeout time.Duration) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.DisableKeepAlives = true
	if checkTLSConfig != nil {
		transport.TLSClientConfig = checkTLSConfig.Clone()
	}

	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
		CheckRedirect: func(_ *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
}

// readLimitedBody reads at most maxResponseBodyBytes and reports whether the
// body was longer than that.
func readLimitedBody(body io.Reader) ([]byte, bool, error) {
	data, err := io.ReadAll(io.LimitReader(body, maxResponseBodyBytes+1))
	if err != nil {
		return nil, false, err
	}
	if int64(len(data)) > maxResponseBodyBytes {
		return data[:maxResponseBodyBytes], true, nil
	}
	return data, false, nil
}

func bodyTooLargeError() string {
	return fmt.Sprintf("response body exceeds %d bytes", maxResponseBodyBytes)
}
