export function formatPhoneForStorage(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1)
  return '+55' + digits
}

export function formatPhoneForDisplay(stored: string): string {
  if (!stored) return ''
  let digits: string
  if (stored.startsWith('+55')) {
    digits = stored.slice(3)
  } else {
    digits = stored.replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1)
  }
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function stripPhonePrefix(stored: string): string {
  let digits = stored.startsWith('+55') ? stored.slice(3) : stored.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1)
  return digits
}
