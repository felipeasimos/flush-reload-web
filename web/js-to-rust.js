export function getTime() {
  return 1
}

export function encrypt() {
  fetch("/encrypt", {method: "POST"})
}

export function random() {
  return Math.random()
}
