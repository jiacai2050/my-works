ROOT_DIR = $(shell pwd)
CC = $(ROOT_DIR)/zigcc
CXX = $(ROOT_DIR)/zigcxx

clean:
	@for dir in $(shell ls -d */ | grep -v go-mode); do pushd $${dir} && cargo clean && popd ; done

run-rust:
	@for dir in $(shell ls -d */ | grep -v go-demo); do \
		cd $(ROOT_DIR)/$${dir} ; \
		CARGO_BUILD_TARGET=$(TARGET) CC=$(CC) CXX=$(CXX) cargo build; \
	done

run-go:
	GOOS=linux GOARCH=386 ./run-go.sh
	GOOS=linux GOARCH=amd64 ./run-go.sh
	GOOS=linux GOARCH=arm ./run-go.sh
	GOOS=linux GOARCH=arm64 ./run-go.sh
	GOOS=windows GOARCH=386 ./run-go.sh
	GOOS=windows GOARCH=amd64 ./run-go.sh
	GOOS=windows GOARCH=arm ./run-go.sh
	GOOS=windows GOARCH=arm64 ./run-go.sh
	GOOS=darwin GOARCH=amd64 ./run-go.sh
	GOOS=darwin GOARCH=arm64 ./run-go.sh
