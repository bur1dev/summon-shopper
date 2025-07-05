fn main() {
  println!("cargo:rerun-if-changed=../workdir/summon-shopper.happ");
  tauri_build::build()
}
