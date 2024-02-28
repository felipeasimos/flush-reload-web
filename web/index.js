const memory = new WebAssembly.Memory({
  initial: 100,
  maximum: 100,
  shared: true,
});

const buffer = new DataView(memory.buffer);

async function start() {
  // get clock wasm started
  const counterResponse = await fetch("./counter.wasm");
  const counterModule = new WebAssembly.Module(
    await counterResponse.arrayBuffer(),
  );
  const counterWorker = new Worker("./js/counter.js");
  counterWorker.postMessage({ module: counterModule, memory: memory });

  // attack utils
  const utilsResponse = await fetch("./attack.wasm");
  const utilsModule = new WebAssembly.Module(await utilsResponse.arrayBuffer());

  // get attack wasm worker
  const attackResponse = await fetch(
    "./target/wasm32-unknown-unknown/release/flush_reload.wasm",
  );
  const attackModule = new WebAssembly.Module(
    await attackResponse.arrayBuffer(),
  );
  const attackWorker = new Worker("./attack.js");
  attackWorker.postMessage({
    module: attackModule,
    memory: memory,
    utils: utilsModule,
  });

  attackWorker.onmessage = (event) => {
    const raw_results = event.data;
    console.log(raw_results);
    // divide into the time slots again
    const chunk_size = 3;
    let results = [];
    for (let i = 0; i < raw_results.length; i += chunk_size) {
      results.push(raw_results.slice(i, i + chunk_size));
    }
    console.log(results);
    new Chart(document.getElementById("results"), {
      type: "scatter",
      data: {
        labels: ["Square", "Reduce", "Multiply"],
        datasets: [
          {
            label: "Square",
            data: results.map((d, idx) => ({ x: idx, y: d[0] })),
          },
          {
            label: "Reduce",
            data: results.map((d, idx) => ({ x: idx, y: d[1] })),
          },
          {
            label: "Multiply",
            data: results.map((d, idx) => ({ x: idx, y: d[2] })),
          },
        ],
      },
      options: {
        scales: {
          y: {
            max: 1000,
          },
          x: {
            type: "linear",
            position: "bottom",
          },
        },
      },
    });
  };
}

function getTime() {
  console.log("time in memory (from JS):", buffer.getBigUint64(1, true));
}

window.onload = () => {
  document.getElementById("btn-start-attack").onclick = start;
  document.getElementById("btn-get-time").onclick = getTime;
};
