use std::env;
use std::path::PathBuf;

fn main() {
    let source = "awesome.c";

    println!("cargo:rerun-if-changed={source}");
    cc::Build::new().file(source).compile("awesome");

    let bindings = bindgen::Builder::default()
        .header(source)
        .parse_callbacks(Box::new(bindgen::CargoCallbacks))
        .generate()
        .expect("Unable to generate bindings");

    // Write the bindings to the $OUT_DIR/bindings.rs file.
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
