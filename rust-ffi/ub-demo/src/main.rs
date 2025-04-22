use std::ffi::{c_char, c_int, CString};

pub struct Foo {
    pub a: c_int,
    pub b: *mut c_char,
}

fn new_foo() -> *mut Foo {
    let c_str = CString::new("hello world").unwrap();
    let foo = Box::new(Foo {
        a: 1,
        b: c_str.into_raw(),
    });

    Box::into_raw(foo)
}

fn ub_demo(foo: *mut Foo) {
    let immut_ref = unsafe { foo.as_ref() }.unwrap();
    println!("Immutable ref is {}", immut_ref.a);

    // Create mut_ref is UB, since there is already an  immutable reference and it's still alive.
    let mut_ref = unsafe { foo.as_mut() }.unwrap();
    mut_ref.a = 2;
    println!("Mutable ref is {}", mut_ref.a);

    println!("Immutable ref is {}", immut_ref.a);
}

fn main() {
    let foo = new_foo();
    ub_demo(foo);
}
