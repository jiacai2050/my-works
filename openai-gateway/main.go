package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
)

func main() {
	apiKey := os.Getenv("OPENAI_API_KEY")
	baseUrl := os.Getenv("OPENAI_BASE_URL")
	if baseUrl == "" {
		baseUrl = "https://api.openai.com/v1"
	}

	upstream, _ := url.Parse(baseUrl)
	basePath := strings.TrimSuffix(upstream.Path, "/")

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.Header.Set("Authorization", "Bearer "+apiKey)
			req.URL.Scheme = upstream.Scheme
			req.URL.Host = upstream.Host
			req.Host = upstream.Host
			req.URL.Path = basePath + req.URL.Path

			log.Printf("[%s] %s", req.Method, req.URL.String())
		},
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Gateway started on :%s -> %s", port, baseUrl)
	log.Fatal(http.ListenAndServe(":"+port, proxy))
}
