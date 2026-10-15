package main

import (
	"encoding/json"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/uptimekit/worker/internal/monitor"
)

func TestCertReporterReportsChangesAndDailyRefresh(t *testing.T) {
	reporter := newCertReporter()
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	info := &monitor.CertificateInfo{Domain: "example.com", ValidTo: "2026-03-01T00:00:00Z", IsValid: true}

	if !reporter.shouldReport("m1", info, now) {
		t.Fatal("expected first certificate to be reported")
	}
	reporter.recordReported("m1", info, now)

	if reporter.shouldReport("m1", info, now.Add(time.Hour)) {
		t.Fatal("expected unchanged certificate to be skipped within a day")
	}
	if !reporter.shouldReport("m1", info, now.Add(certReportInterval)) {
		t.Fatal("expected unchanged certificate to be re-reported after a day")
	}

	renewed := *info
	renewed.ValidTo = "2026-06-01T00:00:00Z"
	if !reporter.shouldReport("m1", &renewed, now.Add(time.Minute)) {
		t.Fatal("expected a renewed certificate to be reported immediately")
	}
}

func TestCertReporterRetainForgetsUnassignedMonitors(t *testing.T) {
	reporter := newCertReporter()
	now := time.Now()
	info := &monitor.CertificateInfo{Domain: "example.com"}
	reporter.recordReported("m1", info, now)
	reporter.recordReported("m2", info, now)

	reporter.retain(map[string]struct{}{"m2": {}})

	if !reporter.shouldReport("m1", info, now) {
		t.Fatal("expected forgotten monitor to report again")
	}
	if reporter.shouldReport("m2", info, now) {
		t.Fatal("expected retained monitor to keep its last report")
	}
}

func TestNewEventIDIsUUIDv4(t *testing.T) {
	pattern := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	first, second := newEventID(), newEventID()
	if !pattern.MatchString(first) || first == second {
		t.Fatalf("unexpected ids %q %q", first, second)
	}
}

func TestResultJSONCarriesIDAndOmitsCertificate(t *testing.T) {
	result := monitor.Result{
		ID:              "id-1",
		MonitorID:       "m1",
		Timestamp:       monitor.FormatTimestamp(time.Date(2026, 1, 1, 0, 0, 1, 234_000_000, time.UTC)),
		CertificateInfo: &monitor.CertificateInfo{Domain: "example.com"},
	}
	payload, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	body := string(payload)
	if !strings.Contains(body, `"id":"id-1"`) || !strings.Contains(body, `"timestamp":"2026-01-01T00:00:01.234Z"`) {
		t.Fatalf("unexpected payload %s", body)
	}
	if strings.Contains(body, "certificateInfo") {
		t.Fatalf("certificate info should not be sent with events: %s", body)
	}
}
