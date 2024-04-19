self.onmessage = function(e) {
  const {module, memory} = e.data;
  const instance = new WebAssembly.Instance(module, {
    env: { memory: memory }
  });
  // console.log("clock instance created")
  console.log(instance.exports.counter())
  // const arr = new Uint32Array(memory.buffer)
  // while(true) {
  //   Atomics.add(arr, 256, 1);
  //   Atomics.add(arr, 128, 1);
  // }
}
