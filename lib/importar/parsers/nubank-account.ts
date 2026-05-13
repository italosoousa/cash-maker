import type { ParsedRow } from '../types'
import { detectCategory, cleanTitle } from '../categorizer'

/**
 * Parser para o CSV de extrato da conta corrente Nubank.
 *
 * Formato:
 *   Data,Valor,Identificador,Descrição
 *   01/04/2026,400.00,<uuid>,Transferência recebida pelo Pix - NOME - CPF - BANCO...
 *   02/04/2026,-5703.86,<uuid>,Pagamento de fatura
 *   07/04/2026,-10.00,<uuid>,Compra no débito - NACAO BEACH
 *
 * Regras:
 *   - Positivo  → INCOME (transferências recebidas, resgates)
 *   - Negativo "Pagamento de fatura"  → PAYMENT (não importar, usada para dedup)
 *   - Negativo "Aplicação RDB"        → INVESTMENT (não importar)
 *   - Outros negativos                → EXPENSE
 */
export function parseNubankAccount(csvText: string): ParsedRow[] {
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('Arquivo vazio ou inválido')

  // A descrição pode conter vírgulas; por isso localizamos as colunas pelo header
  // e depois partimos a linha nos 3 primeiros separadores (fixo: Data,Valor,Id,Desc)
  const headerRaw = lines[0].split(',').map(h => h.toLowerCase().trim())
  const dateIdx   = headerRaw.indexOf('data')
  const valueIdx  = headerRaw.indexOf('valor')
  const descIdx   = headerRaw.findIndex(h => h.startsWith('descri'))

  if (dateIdx === -1 || valueIdx === -1 || descIdx === -1) {
    throw new Error(
      'Formato não reconhecido. Verifique se é o extrato da conta Nubank (colunas: Data, Valor, Identificador, Descrição).'
    )
  }

  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const parsed = splitExtratoLine(lines[i], descIdx)
    if (!parsed) continue

    const { cols, desc: descRaw } = parsed
    const dateRaw  = cols[dateIdx]?.trim() ?? ''
    const valueRaw = cols[valueIdx]?.trim() ?? '0'

    const value = parseFloat(valueRaw.replace(',', '.'))
    if (isNaN(value) || value === 0) continue

    const lower = descRaw.toLowerCase()

    // ── Tipo da linha ──────────────────────────────────────────────────────────
    let rowType: ParsedRow['rowType']
    if (lower.includes('pagamento de fatura')) {
      rowType = 'PAYMENT'
    } else if (lower.includes('aplicação rdb') || lower.includes('aplicacao rdb')) {
      rowType = 'INVESTMENT'
    } else if (value > 0) {
      rowType = 'INCOME'
    } else {
      rowType = 'EXPENSE'
    }

    // ── Descrição limpa ────────────────────────────────────────────────────────
    const description = extractCleanDescription(descRaw)

    // ── Categoria (apenas para EXPENSE) ────────────────────────────────────────
    // Para INCOME, passamos null → o servidor vai resolver para "Outros"
    const categoryName = rowType === 'EXPENSE' ? detectCategory(descRaw) : null

    rows.push({
      date:          convertDate(dateRaw),
      originalTitle: descRaw,
      description,
      amount:        Math.abs(value),
      rowType,
      confidence:    categoryName ? 'high' : 'low',
      categoryName,
      categoryId:    null,
      isInstallment: false,
    })
  }

  return rows
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converte DD/MM/YYYY → YYYY-MM-DD.
 */
function convertDate(d: string): string {
  const parts = d.split('/')
  if (parts.length !== 3) return d
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Extrai a descrição limpa para exibição.
 *
 * Pix: "Transferência enviada pelo Pix - NOME - CPF - BANCO..."  → "Nome"
 * Débito: "Compra no débito - LOJA"                              → "Loja"
 * Outros: usa o texto completo limpo.
 */
function extractCleanDescription(raw: string): string {
  const lower = raw.toLowerCase()

  if (lower.startsWith('transferência enviada pelo pix') ||
      lower.startsWith('transferencia enviada pelo pix') ||
      lower.startsWith('transferência recebida pelo pix') ||
      lower.startsWith('transferencia recebida pelo pix')) {
    // "Transferência XXXX pelo Pix - NOME - CPF - BANCO"
    const parts = raw.split(' - ')
    const name = parts[1]?.trim()
    return name ? cleanTitle(name) : cleanTitle(raw)
  }

  if (lower.startsWith('compra no débito - ') ||
      lower.startsWith('compra no debito - ')) {
    const name = raw.replace(/^compra no d[eé]bito - /i, '').trim()
    return cleanTitle(name)
  }

  return cleanTitle(raw)
}

/**
 * Divide uma linha do extrato nos N primeiras colunas de forma segura.
 * A última coluna (Descrição) pode conter vírgulas, por isso é extraída
 * como o restante da string após a última vírgula de índice.
 *
 * Retorna { cols: string[], desc: string } ou null se a linha for inválida.
 */
function splitExtratoLine(
  line: string,
  descColIndex: number
): { cols: string[]; desc: string } | null {
  // Encontra a posição da vírgula que inicia a coluna de descrição
  let commaCount = 0
  let descStart  = -1

  for (let i = 0; i < line.length; i++) {
    if (line[i] === ',') {
      commaCount++
      if (commaCount === descColIndex) {
        descStart = i + 1
        break
      }
    }
  }

  if (descStart === -1) return null

  const prefix = line.substring(0, descStart - 1) // tudo antes da vírgula da desc
  const desc   = line.substring(descStart).trim()
  const cols   = prefix.split(',').map(c => c.trim())

  // Preenche cols até descColIndex para manter indexação consistente
  while (cols.length < descColIndex) cols.push('')

  return { cols, desc }
}
