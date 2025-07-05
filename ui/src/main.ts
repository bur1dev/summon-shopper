import App from "./App.svelte";
import "./app.css";

// Svelte 4 app initialization
const app = new App({
  target: document.getElementById("app")!,
});

export default app;
