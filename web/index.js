const memory = new WebAssembly.Memory({
  initial: 1000,
  maximum: 1000,
  shared: true
});

const buffer = new DataView(memory.buffer)


async function start() {
  // get clock wasm started
  const clockResponse = await fetch("./eagle_timer/clock.wasm");
  const clockModule = new WebAssembly.Module(await clockResponse.arrayBuffer());
  const clockWorker = new Worker('./eagle_timer/clock.js');
  clockWorker.postMessage({module: clockModule, memory: memory}) 

  // get attack wasm worker
  const attackResponse = await fetch("./target/wasm32-unknown-unknown/release/flush_reload.wasm")
  const attackModule = new WebAssembly.Module(await attackResponse.arrayBuffer());
  const attackWorker = new Worker('./attack.js');
  attackWorker.postMessage({module: attackModule, memory: memory});

  attackWorker.onmessage = (event) => {
    const results = event.data;
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
  }
}

function getTime() {
  console.log("time in memory (from JS):", buffer.getBigUint64(1, true))
}

window.onload = () => {
  document.getElementById("btn-start-attack").onclick = start;
  document.getElementById("btn-get-time").onclick = getTime;
}

