export function buildWhatsAppUrl(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, '')
  if (!digits.startsWith('55')) digits = '55' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
