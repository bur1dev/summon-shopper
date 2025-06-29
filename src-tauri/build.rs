fn main() {
  println!("cargo:rerun-if-changed=../workdir/summon-shopper-app.happ");
  tauri_build::build()
}
