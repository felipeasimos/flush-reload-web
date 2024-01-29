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

const rust = import("./pkg/flush_reload.js"); 
self.onmessage = (event) => {
  rust
    .then(async (m) => {
      m.default().then(async wasm => {
        let target = await getTargetArrayBuffer();
        let config = await getConfig();
        console.log(wasm)
        let probes = new Uint32Array(config.probe);
        let results = m.flush_reload(config.threshold, config.time_slots, config.wait_cycles, config.time_slot_size, probes, target);
        console.log(results)
      })
    })
}
