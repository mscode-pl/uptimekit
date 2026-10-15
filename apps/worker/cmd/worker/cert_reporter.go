package main

import (
	"sync"
	"time"

	"github.com/uptimekit/worker/internal/monitor"
)

// certReportInterval is how often an unchanged certificate is re-reported.
// Expiry alerts are day-granular, so one report a day is enough.
const certReportInterval = 24 * time.Hour

type certReport struct {
	fingerprint string
	reportedAt  time.Time
}

// certReporter remembers what was last reported per monitor so HTTPS checks
// do not push identical certificate details on every run.
type certReporter struct {
	mu   sync.Mutex
	last map[string]certReport
}

func newCertReporter() *certReporter {
	return &certReporter{last: make(map[string]certReport)}
}

func certFingerprint(info *monitor.CertificateInfo) string {
	return info.Domain + "\x1f" + info.Issuer + "\x1f" + info.ValidTo + "\x1f" + info.Error + "\x1f" + boolString(info.IsValid)
}

func boolString(value bool) string {
	if value {
		return "1"
	}
	return "0"
}

func (c *certReporter) shouldReport(monitorID string, info *monitor.CertificateInfo, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()

	previous, ok := c.last[monitorID]
	if !ok {
		return true
	}
	return previous.fingerprint != certFingerprint(info) || now.Sub(previous.reportedAt) >= certReportInterval
}

func (c *certReporter) recordReported(monitorID string, info *monitor.CertificateInfo, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.last[monitorID] = certReport{fingerprint: certFingerprint(info), reportedAt: now}
}

// retain forgets monitors that are no longer assigned to this worker.
func (c *certReporter) retain(monitorIDs map[string]struct{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for id := range c.last {
		if _, ok := monitorIDs[id]; !ok {
			delete(c.last, id)
		}
	}
}
