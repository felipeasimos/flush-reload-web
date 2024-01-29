self.addEventListener("message", (event) => {
  const sab = event.data;
  self.postMessage("initialized timer")
  while(1) {
    sab[0]++;
  }
});
