package rules

import (
	"context"
	"testing"

	"siphon/internal/capture"
)

func TestImmediateResolutionAndSingleDelivery(t *testing.T) {
	b := NewBreakpoints()
	res, err := b.WaitReady(context.Background(), "one", func() {
		if err := b.Resolve("one", Resolution{Status: 201}); err != nil {
			t.Fatal(err)
		}
		if err := b.Resolve("one", Resolution{Drop: true}); err != ErrNotPaused {
			t.Fatalf("second resolve: %v", err)
		}
	})
	if err != nil || res.Status != 201 || b.IsWaiting("one") {
		t.Fatalf("%+v %v", res, err)
	}
}

func TestInvalidResolutionKeepsBreakpointOpen(t *testing.T) {
	b := NewBreakpoints()
	invalid := "!invalid base64!"
	res, err := b.WaitReady(context.Background(), "one", func() {
		for _, bad := range []Resolution{{Status: 99}, {Method: "GET\r\nX: 1"}, {URL: "file:///etc/passwd"}, {BodyBase64: &invalid},
			{Headers: &[]capture.Header{{Name: "X-Test", Value: "a\r\nb"}}}} {
			if err := b.Resolve("one", bad); err == nil {
				t.Fatalf("accepted %+v", bad)
			}
			if !b.IsWaiting("one") {
				t.Fatal("invalid resolution consumed breakpoint")
			}
		}
		if err := b.Resolve("one", Resolution{}); err != nil {
			t.Fatal(err)
		}
	})
	if err != nil || res.Drop {
		t.Fatalf("%+v %v", res, err)
	}
}
