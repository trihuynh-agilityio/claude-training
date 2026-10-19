const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})
const groupFormatter = new Intl.NumberFormat('vi-VN')

/** 1250000 → "1.250.000 ₫" (no-break space before the symbol). */
export function formatVND(amount: number): string {
  return vndFormatter.format(amount)
}

/** Keep only digits, drop leading zeros and cap the length, for the amount input. */
export function digitsOnly(text: string): string {
  return text
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 13)
}

/** "1250000" → "1.250.000"; "" stays "". */
export function groupDigits(digits: string): string {
  return digits === '' ? '' : groupFormatter.format(Number(digits))
}
