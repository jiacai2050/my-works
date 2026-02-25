package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"time"
)

type loggingTransport struct {
	transport http.RoundTripper
}

func (t *loggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	start := time.Now()
	resp, err := t.transport.RoundTrip(req)
	duration := time.Since(start).Seconds()
	log.Printf("[%d] %s %s (%.3fs)", resp.StatusCode, req.Method, req.URL.String(), duration)
	return resp, err
}

func main() {
	apiKey := os.Getenv("OPENAI_API_KEY")
	baseUrl := os.Getenv("OPENAI_BASE_URL")
	if baseUrl == "" {
		baseUrl = "https://api.openai.com/v1"
	}

	upstream, _ := url.Parse(baseUrl)
	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(upstream)
			r.Out.Header.Set("Authorization", "Bearer "+apiKey)
		},
		Transport: &loggingTransport{transport: http.DefaultTransport},
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Gateway started on :%s -> %s", port, baseUrl)
	log.Fatal(http.ListenAndServe(":"+port, proxy))
}
