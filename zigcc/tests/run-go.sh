#!/usr/bin/env bash


ROOT_DIR="$(cd `dirname $0`; pwd)"
OUTPUT="${OUTPUT:-/tmp/cross-compile.out}"

set -x
export CGO_ENABLED=1
export CC="zigcc"
export CXX="zigcxx"

if command -v xcrun;then
  # https://github.com/ziglang/zig/issues/10790
  # https://stackoverflow.com/a/68766210
  export ZIGCC_FLAGS="-I/usr/include -F/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/System/Library/Frameworks/ -L/usr/lib --sysroot=$(xcrun --show-sdk-path)"
fi

cd "${ROOT_DIR}/go-demo" && go build -ldflags="-v"

if [ $? -eq 0 ]; then
  echo "| ${GOOS} | ${GOARCH} | ✅ |" >> $OUTPUT
else
  echo "| ${GOOS} | ${GOARCH} | ❌ |" >> $OUTPUT
fi
