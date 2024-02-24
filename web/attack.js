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
  // memory.grow(90)
  const probes = new Uint8Array(new Uint32Array(config.probe).buffer)
  console.log(config.probe)
  console.log(probes)
  const target_ptr = copyMemory(target, instance, target.length)
  const probe_ptr = copyMemory(probes, instance, probes.length * 4);
  const box_u32_length = config.probe.length * config.time_slots;
  buffer = new DataView(memory.buffer)
  const box_u32_ptr = instance.exports.flush_reload(config.threshold, config.time_slots, config.wait_cycles, config.time_slot_size, probe_ptr, probes.length, target_ptr, target.length)
  let box = new Uint32Array(memory.buffer, box_u32_ptr, box_u32_length)
  console.log("afasdfasdfasdf")
  console.log("box ptr:", box_u32_ptr)
  self.postMessage(box)
}
