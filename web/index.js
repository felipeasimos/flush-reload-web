async function getTargetArrayBuffer() {
  const response = await fetch("/target_file")
  return response.arrayBuffer()
}

function generate_eviction_set(offset, candidate_set) {
  // naive eviction set generation
}

function generate_conflict_set(offset, targets, eviction_sets) {
  // 1. generate naive conflict set by joining all eviction sets
  // 2. reduce conflict set
}

function get_time() {
}

window.onload = async () => {
  const target = await getTargetArrayBuffer();

  // CLOCK

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
