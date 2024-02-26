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
  const target_ptr = copyMemory(target, instance, target.length)
  const probe_ptr = copyMemory(probes, instance, probes.length * 4);
  buffer = new DataView(memory.buffer)
  const box_info_ptr = instance.exports.my_alloc(8);
  console.log("box_info_ptr: ", box_info_ptr);

  instance.exports.flush_reload(box_info_ptr, config.threshold, config.time_slots, config.wait_cycles, config.time_slot_size, probe_ptr, probes.length, target_ptr, target.length)
  console.log("flush_reload function over")
  const box = new Uint32Array(instance.exports.memory.buffer, box_info_ptr, 2)
  console.log("box: ", box); // correct
  const box_ptr = box[0];
  const box_length = box[1];
  console.log(box_ptr, box_length)
  const results = new Uint32Array(instance.exports.memory.buffer, box_ptr, box_length);
  self.postMessage(results)
}
