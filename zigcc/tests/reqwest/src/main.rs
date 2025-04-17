fn main() {
    println!("Hello, world!");
    let body = reqwest::blocking::get("https://httpbin.org/json")
        .unwrap()
        .text()
        .unwrap();

    println!("body = {:?}", body);
}
