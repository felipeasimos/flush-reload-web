const CACHE_LINE_SIZE = 64
const CACHE_ASSOCIATIVITY = 16

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

const sab = new Uint32Array(new SharedArrayBuffer(8))
function initializeTimer() {

  if(window.Worker) {
    Atomics.store(sab, 0, 1)
    console.log("initializing worker")
    const worker = new Worker("counter.js");
    console.log("posting message")
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
    if(typeof(index) == "Number") {
      newNode = new List(index);
    } else {
      newNode = index;
    }
    if(Boolean(list)) {
      list.next = newNode
      newNode.prev = list;
      list.size++;
      newNode.size = list.size;
    } else {
      list = newNode
    }
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
    return Math.round(Math.random() * (list.size - 1))
  }
  static filter(list, func) {
    const result = null;
    for(; list; list = List.next(list)) {
      if(func(list)) {
        result = List.add(List.copy(list), result);
      }
    }
    return result;
  }
  static union(list1, list2) {
    const result = null;
    for(let list1c = list1; list1c; list1c = List.next(list1c)) {
      result = List.add(result, List.copy(list1c));
    }
    for(let list2c = list2; list2c; list2c = List.next(list2c)) {
      result = List.add(result, List.copy(list2c));
    }
    return result
  }
}

function generateCandidateSet() {
  const candidateBuffer = new ArrayBuffer(1000000);
  let list = null;
  for(let i = 0; i < candidateBuffer.byteLength; i+=CACHE_LINE_SIZE) {
    list = List.add(index, list)
  }
  return list
}

function generateEvictionSet(target, offset, candidateSet) {
  // naive eviction set generation
  const ev = null;

  while(!ev || ev.size < CACHE_ASSOCIATIVITY) {

    const randomIndex = candidateSet.getRandomIndex()
    const randomOffset = candidateSet.getIndex(randomIndex)
    const withoutCandidate = List.filter(candidateSet, (l) => l.index != randomOffset)
    if(!IsValidEvictionSet(List.union(ev, withoutCandidate), target, offset)) {
      ev = List.add(randomOffset, ev);
    }
    candidateSet = withoutCandidate
  }
  return ev
}

function generateConflictSet(offset, targets, eviction_sets) {
  // 1. generate naive conflict set by joining all eviction sets
  // 2. reduce conflict set
}

window.onload = async () => {
  // TARGET
  const target = await getTargetArrayBuffer();
  const config = await getConfig();

  // CLOCK
  initializeTimer()

  // GENERATE EVICTION SETS
  const candidateList = generateCandidateSet()


  // EVICT
  // 1. go through evict sets

  // PROBE
  // 1. get time
  // 2. access address
  // 3. get time diff
  // 4. evict

  // ATTACK
  // 1. get offsets
  // 2. go through time slots
  // 3. go through each offset
  // 4. probe each address (probe)
}
