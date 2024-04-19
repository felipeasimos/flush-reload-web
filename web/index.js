let buffer = null;

async function getConfig() {
  const response = await fetch("/config");
  const configString = await response.text();
  const config = {
    threshold: 0,
    wait_cycles: 0,
    time_slots: 0,
    time_slot_size: 0,
    target_file: "",
    num_candidates: 0,
    num_backtracks: 0,
    page_size: 0,
    num_measurements: 0,
    probe: [],
  };
  const lines = configString.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length == 0) continue;
    const [key, value] = line.split(" ");
    if (key == "probe") {
      config.probe.push(Number(value));
    } else if (key == "target_file") {
      config.target_file = value;
    } else {
      config[key] = Number(value);
    }
  }
  return config;
}

async function getTargetArrayBuffer() {
  const response = await fetch("/target_file");
  return new Uint8Array(await response.arrayBuffer());
}

async function getMemory(config) {
  const target = await getTargetArrayBuffer();
  const candidatePoolSize = config.num_candidates * config.page_size;
  const webassemblyPageSize = 64 * 1024;
  const targetPtr = config.page_size + candidatePoolSize + (candidatePoolSize % config.page_size);
  const memorySize = Math.ceil((targetPtr + target.byteLength) / webassemblyPageSize);
  console.log("memorySize (number of 64 KiB pages):", memorySize);
  const memory = new WebAssembly.Memory({
    initial: memorySize,
    maximum: memorySize,
    shared: true,
  });
  // load target to memory
  const memoryRegion = new Uint8Array(memory.buffer, targetPtr, target.byteLength);
  memoryRegion.set(target)
  return memory;
}

async function start() {
  const config = await getConfig();
  const memory = await getMemory(config)
  const candidatePoolSize = config.num_candidates * config.page_size;
  for(let i = 0; i < config.probe.length; i++) {
    config.probe[i] += config.page_size + candidatePoolSize + (candidatePoolSize % config.page_size)
  }
  buffer = new DataView(memory.buffer);

  // get clock wasm started
  const counterResponse = await fetch("./counter.wasm");
  const counterModule = new WebAssembly.Module(
    await counterResponse.arrayBuffer(),
  );
  const counterWorker = new Worker("./js/counter.js");
  counterWorker.postMessage({
    module: counterModule,
    memory: memory,
  });

  // attack utils
  const attackResponse = await fetch("./attack.wasm");
  const attackModule = new WebAssembly.Module(await attackResponse.arrayBuffer());

  // get attack wasm worker
  const attackWorker = new Worker("./attack.js");
  attackWorker.postMessage({
    memory: memory,
    utils: attackModule,
    config: config
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
            max: 100,
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
  console.log("time in memory (from JS):", buffer.getUint32(256, true));
}

window.onload = () => {
  document.getElementById("btn-start-attack").onclick = start;
  document.getElementById("btn-get-time").onclick = getTime;
};
