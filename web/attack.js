import init, { flush_reload } from "./pkg/flush_reload.js";
init().then(() => {
  flush_reload("WebAssembly");
});
