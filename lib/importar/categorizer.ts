import { CATEGORY_KEYWORDS, PAYMENT_KEYWORDS } from './keywords'

/**
 * Verifica se um título contém alguma palavra-chave (case-insensitive).
 * Retorna o nome da categoria ou null.
 */
export function detectCategory(title: string): string | null {
  const lower = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      if (lower.includes(kwNorm)) {
        return categoryName
      }
    }
  }

  return null
}

/** Verifica se a linha é um pagamento da fatura (não deve ser importada como despesa) */
export function isPaymentRow(title: string): boolean {
  const lower = title.toLowerCase()
  return PAYMENT_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))
}

/**
 * Limpa o título para exibição:
 * - Capitaliza a primeira letra de cada palavra
 * - Remove prefixos comuns como "Ifd*"
 * - Normaliza espaços
 */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/^ifd\*/i, 'iFood · ')
    .replace(/^dm\s*\*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Extrai informação de parcelamento do título.
 * Ex: "Fisia Nike Ecommer - Parcela 2/5" → { isInstallment: true, info: "2/5" }
 */
export function extractInstallment(title: string): { isInstallment: boolean; info?: string } {
  const match = title.match(/[- ]+parcela\s+(\d+\/\d+)/i)
    ?? title.match(/\s+(\d+\/\d+)\s*$/i)
  if (match) return { isInstallment: true, info: match[1] }
  return { isInstallment: false }
}
