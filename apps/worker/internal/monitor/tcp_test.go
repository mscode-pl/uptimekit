package monitor

import "testing"

func TestTCPAddressSupportsIPv6Literals(t *testing.T) {
	cases := map[string]struct {
		host string
		want string
	}{
		"hostname": {host: "example.com", want: "example.com:443"},
		"ipv4":     {host: "192.0.2.1", want: "192.0.2.1:443"},
		"ipv6":     {host: "2001:db8::1", want: "[2001:db8::1]:443"},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			if got := tcpAddress(tc.host, 443); got != tc.want {
				t.Fatalf("tcpAddress(%q) = %q, want %q", tc.host, got, tc.want)
			}
		})
	}
}
