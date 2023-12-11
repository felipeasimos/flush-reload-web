self.addEventListener("message", (event) => {
  const sab = event.data;
  while(1) {
    Atomics.add(sab, 0, 1)
  }
});
