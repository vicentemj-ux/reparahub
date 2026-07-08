function ean13CheckDigit(first12Digits: string): string {
  const digits = first12Digits.split("").map((digit) => Number.parseInt(digit, 10))
  let sumOdd = 0
  let sumEven = 0

  for (let i = 0; i < 12; i += 1) {
    if ((i + 1) % 2 === 0) sumEven += digits[i]
    else sumOdd += digits[i]
  }

  const total = sumOdd + sumEven * 3
  return String((10 - (total % 10)) % 10)
}

export function getInventoryBarcodeDateSegment(date = new Date()): string {
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

export function generateInventoryBarcode(date = new Date(), sequence?: number): string {
  const dateSegment = getInventoryBarcodeDateSegment(date)
  const randomSegment = sequence == null
    ? Math.floor(Math.random() * 1000)
    : Math.abs(Math.floor(sequence)) % 1000
  const base = `200${dateSegment}${String(randomSegment).padStart(3, "0")}`
  return `${base}${ean13CheckDigit(base)}`
}
