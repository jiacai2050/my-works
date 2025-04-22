#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

use std::ffi::CString;

fn main() {
    let c_str = CString::new("hello world").unwrap();
    let foo = Foo {
        a: 1,
        // b is *mut i8
        b: c_str.into_raw(),
    };
    unsafe {
        rust_call_c();
        say_foo(foo);
    }
}
