const memory = new WebAssembly.Memory({
  initial: 10,
  maximum: 100,
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
  const attackWorker = new Worker('./attack.js');
  attackWorker.postMessage({memory: memory});

  attackWorker.onmessage = (event) => {
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

window.onload = () => {
  document.getElementById("btn-start-attack").onclick = start;
}

