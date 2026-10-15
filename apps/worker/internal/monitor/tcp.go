package monitor

import (
	"net"
	"strconv"
	"time"
)

// TCPMonitor implements TCP port connectivity monitoring.
type TCPMonitor struct{}

// NewTCPMonitor creates a new TCP monitor.
func NewTCPMonitor() *TCPMonitor {
	return &TCPMonitor{}
}

// Check performs a TCP connection test to the specified host and port.
func (m *TCPMonitor) Check(cfg Config) Result {
	result := Result{
		MonitorID: cfg.ID,
		Status:    StatusDown,
		Timestamp: FormatTimestamp(time.Now()),
	}

	if cfg.Hostname == "" {
		result.Error = "missing hostname"
		return result
	}

	if cfg.Port <= 0 || cfg.Port > 65535 {
		result.Error = "invalid port number"
		return result
	}

	timeout := time.Duration(cfg.Timeout) * time.Second
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	address := tcpAddress(cfg.Hostname, cfg.Port)

	// Measure connection time
	start := time.Now()
	conn, err := net.DialTimeout("tcp", address, timeout)
	elapsed := time.Since(start)

	result.Latency = elapsed.Milliseconds()

	if err != nil {
		result.Error = err.Error()
		return result
	}
	defer conn.Close()

	result.Status = StatusUp
	return result
}

// tcpAddress builds a dial address, bracketing IPv6 literals.
func tcpAddress(hostname string, port int) string {
	return net.JoinHostPort(hostname, strconv.Itoa(port))
}
