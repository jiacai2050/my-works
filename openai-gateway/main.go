package main

import (
	"bytes"
	"compress/gzip"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	authKey   = "authorization"
	cfAuthKey = "cf-aig-authorization"
)

var VERBOSE bool

type loggingTransport struct {
	transport http.RoundTripper
}

func (t *loggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	start := time.Now()
	if VERBOSE && req.Body != nil {
		var bodyBytes []byte
		bodyBytes, _ = io.ReadAll(req.Body)
		log.Printf("Request Body: %s", string(bodyBytes))
		// Restore the io.ReadCloser to its original state
		req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	}

	resp, err := t.transport.RoundTrip(req)
	duration := time.Since(start).Seconds()

	if VERBOSE && resp.Body != nil {
		// 读取 Response 内容
		respBytes, _ := io.ReadAll(resp.Body)
		resp.Body = io.NopCloser(bytes.NewBuffer(respBytes))

		contentEncoding := resp.Header.Get("Content-Encoding")
		switch strings.ToLower(contentEncoding) {
		case "gzip":
			reader, _ := gzip.NewReader(bytes.NewBuffer(respBytes))
			defer reader.Close()
			decodedBytes, _ := io.ReadAll(reader)
			log.Printf("Response Body (Decoded): %s", decodedBytes)
		default:
			log.Printf("Response Body: %s", respBytes)
		}
	}

	log.Printf("[%d] %s %s (%.3fs)", resp.StatusCode, req.Method, req.URL.String(), duration)
	return resp, err
}

func main() {
	apiKey := os.Getenv("OPENAI_API_KEY")
	baseUrl := os.Getenv("OPENAI_BASE_URL")
	VERBOSE = os.Getenv("VERBOSE") == "1"
	if baseUrl == "" {
		baseUrl = "https://api.openai.com/v1"
	}

	upstream, _ := url.Parse(baseUrl)
	authHeader := authKey
	// Cloudflare Gateway requires "cf-aig-authorization" header instead of "Authorization
	// https://developers.cloudflare.com/ai-gateway/usage/chat-completion/
	if upstream.Host == "gateway.ai.cloudflare.com" {
		authHeader = cfAuthKey
	}
	if VERBOSE {
		log.Printf("AuthHeader is %s", authHeader)
	}
	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(upstream)
			if authHeader == cfAuthKey {
				r.Out.Header.Del(authKey)
			}
			r.Out.Header.Set(authHeader, "Bearer "+apiKey)
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
