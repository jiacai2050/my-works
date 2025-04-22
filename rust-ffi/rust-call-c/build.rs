use std::env;

// https://doc.rust-lang.org/cargo/reference/build-scripts.html#outputs-of-the-build-script
fn main() {
    // https://doc.rust-lang.org/cargo/reference/environment-variables.html#environment-variables-cargo-sets-for-build-scripts
    let target = env::var("CARGO_MANIFEST_DIR").unwrap();
    println!("cargo:rustc-link-search={}", target);
    println!("cargo:rustc-link-lib=awesome");
}
