package main

/*
#include <stdio.h>
#include <stdlib.h>
*/
import "C"
import "unsafe"

// import "C" 与上面的注释不能有空行，否则会报下面的错误：
// cmd/cgo: could not determine kind of name for C.FILE
// https://github.com/golang/go/issues/9733

func main() {
	cs := C.CString("hello world")
	defer C.free(unsafe.Pointer(cs))

	C.fputs(cs, (*C.FILE)(C.stdout))

	// cgo 不能调用 C 里面的 printf ，因为它是变参函数（variadic functions），报错信息如下：
	// cgo: ./main.go:23:2: unexpected type: ...
	// https://stackoverflow.com/a/26853031/2163429
	// C.printf(cs)
}
