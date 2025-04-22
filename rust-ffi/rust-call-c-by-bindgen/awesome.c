#include <stdio.h>

typedef struct {
  int a;
  char *b;
} Foo;

void say_foo(Foo foo) {
  printf("Foo { a = %d, b = %s}\n", foo.a, foo.b);
}

void rust_call_c() {
  printf("Just called a C function from Rust!\n");
}
