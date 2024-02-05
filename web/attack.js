async function getTargetArrayBuffer() {
  const response = await fetch("/target_file")
  return new Uint8Array(await response.arrayBuffer())
}

async function getConfig() {
  const response = await fetch("/config")
  const configString = await response.text()
  const config = {
    threshold: 0,
    wait_cycles: 0,
    time_slots: 0 ,
    time_slot_size: 0, 
    target_file: "",
    probe: []
  }
  const lines = configString.split('\n');
  for(let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if(line.length == 0) continue
    const [key, value] = line.split(' ')
    if(key == "probe") {
      config.probe.push(Number(value))
    } else if(key == "target_file") {
      config.target_file = value
    } else {
      config[key] = Number(value)
    }
  }
  return config
}

function encrypt() {
  fetch("/encrypt", {method: "POST"})
}

function random() {
  return Math.random()
}

let buffer = null;

function getTime() {
  return buffer.getBigUint64(1, true)
}

function copyMemory(data, instance, nbytes) {
  const ptr = instance.exports.my_alloc(nbytes)
  let mem = new Uint8Array(instance.exports.memory.buffer, ptr, nbytes);
  mem.set(new Uint8Array(data))
  // mem.set(new Uint8Array(data));
  return ptr
}

self.onmessage = async (event) => {
  let target = await getTargetArrayBuffer();
  let config = await getConfig();
  const {module, memory} = event.data;
  const instance = new WebAssembly.Instance(module, {
    env: {
      memory: memory
    },
    js: {
      getTime: getTime,
      encrypt: encrypt,
      random: random,
      log: console.log
    }
  });
  memory.grow(90)
  // const buffer = new DataView(memory.buffer);
  // console.log("__data_end:", instance.exports.__data_end.value)
  // console.log("__heap_base:", instance.exports.__heap_base.value)
  // console.log("memory size:", buffer.byteLength)
  // allocate probe (u32)
  // allocate probe (u8)
  const target_ptr = instance.exports.my_alloc(target.length)
  // console.log("target_ptr and end:", target_ptr, target_ptr + target.length)
  // console.log("memory size after target alloc:", buffer.byteLength)
  // console.log("target size:", target.length)
  const bufferTarget = new Uint8Array(instance.exports.memory.buffer, target_ptr, target.length)
  bufferTarget.set(new Uint8Array(target))
  
  console.log("target:",  target)
  // console.log("target[0]:", bufferTarget.getUint8(target_ptr));
  // console.log("target[1]:", bufferTarget.getUint8(target_ptr+1));
  // console.log("target[2]:", bufferTarget.getUint8(target_ptr+2));
  const probes = new Uint32Array(config.probe)
  const probe_ptr = copyMemory(probes, instance, probes.length * 4);
  console.log("probes:", probes)
  const box_u32_length = config.probe.length * config.time_slots;
  const box_u32_ptr = instance.exports.flush_reload(config.threshold, config.time_slots, config.wait_cycles, config.time_slot_size, probe_ptr, probes.length, target_ptr, target.length)
  instance.exports.my_dealloc(probe_ptr, probes.byteLength)
  instance.exports.my_dealloc(target_ptr, target.byteLength)
  console.log("box ptr:", box_u32_ptr)
}
