export function normalizePhone(identifier: string | null | undefined): string {
  if (!identifier) return ''
  return identifier.split('@')[0].replace(/\D/g, '')
}
