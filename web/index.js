let buffer = null;

function sendResults(results) {
    console.log("sending results")
    fetch("/results", { method: "POST", body: JSON.stringify(results) }).then(() =>
        console.log("results sent!"),
    );
}

function drawChart(results, config) {
  const labelStrings = ["Square", "Reduce", "Multiply"];
  const labels = config.probe.map((_, idx) => labelStrings[idx]);
  const datasets = config.probe.map((_, dataset_idx) => {
    return {
      label: labels[dataset_idx],
      data: Array.from(results).map((d, idx) => ({ x: idx, y: d[dataset_idx]}))
    }
  })
  new Chart(document.getElementById("results"), {
    type: "scatter",
    data: {
      labels: labels,
      datasets: datasets,
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
}

async function getConfig() {
  const response = await fetch("/config");
  const configString = await response.text();
  const config = {
    threshold: 0,
    minimal_miss_ratio: 0,
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
  for(let i = 0; i < config.probe.length; i++) {
    config.probe[i] += targetPtr
  }
  const resultsPtr = targetPtr + target.byteLength + (target.byteLength % config.page_size)
  const resultsSize = 4 * config.time_slots * config.probe.length;
  const memorySize = Math.ceil((resultsPtr + resultsSize) / webassemblyPageSize);
  console.log("memorySize (number of 64 KiB pages):", memorySize);
  const memory = new WebAssembly.Memory({
    initial: memorySize,
    maximum: memorySize,
    shared: true,
  });
  // load target to memory
  const memoryRegion = new Uint8Array(memory.buffer, targetPtr, target.byteLength);
  memoryRegion.set(target)
  console.log("target:", memoryRegion)
  return memory;
}

async function start() {
  const config = await getConfig();
  const memory = await getMemory(config)
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
    const {results: raw_results, config} = event.data;
    // divide into the time slots again
    const chunk_size = config.probe.length;
    let results = [];
    for (let i = 0; i < raw_results.length; i += chunk_size) {
      results.push(raw_results.slice(i, i + chunk_size));
    }
    new Promise(() => sendResults(results));
    drawChart(results, config);
  };
}

function getTime() {
  console.log("time in memory (from JS):", buffer.getUint32(256, true));
}

window.onload = () => {
  document.getElementById("btn-get-time").onclick = getTime;
  start()
};
