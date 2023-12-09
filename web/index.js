async function getTargetArrayBuffer() {
  const response = await fetch("/target_file")
  return response.arrayBuffer()
}

window.onload = async () => {
  const target = await getTargetArrayBuffer();

  // GET TIME
  // 1. clock (shared array buffer)

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
