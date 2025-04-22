use std::ffi::{c_char, c_int, CString};

#[repr(C)]
pub struct Foo {
    pub a: c_int,
    pub b: *const c_char,
}

extern "C" {
    fn rust_call_c();
    fn say_foo(foo: Foo);
}

fn main() {
    let c_str = CString::new("Hello, world!").unwrap();
    let foo = Foo {
        a: 1,
        b: c_str.as_ptr(),
    };

    unsafe {
        rust_call_c();
        say_foo(foo);
    }
}
