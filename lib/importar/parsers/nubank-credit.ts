import type { ParsedRow } from '../types'
import { detectCategory, isPaymentRow, cleanTitle, extractInstallment } from '../categorizer'

/**
 * Parser para o CSV de fatura do cartão de crédito Nubank.
 *
 * Formato:
 *   date,title,amount
 *   2026-03-31,Cascol Combustiveis,200.00
 *   2026-03-04,Pagamento recebido,-1609.17
 *
 * Regras:
 *   - Valores positivos → EXPENSE
 *   - Valores negativos com keyword de pagamento → PAYMENT (não importar)
 *   - Valores negativos sem keyword de pagamento → INCOME (estorno, cashback)
 */
export function parseNubankCredit(csvText: string): ParsedRow[] {
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('Arquivo vazio ou inválido')

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
  const dateIdx   = header.indexOf('date')
  const titleIdx  = header.indexOf('title')
  const amountIdx = header.indexOf('amount')

  if (dateIdx === -1 || titleIdx === -1 || amountIdx === -1) {
    throw new Error(
      'Formato não reconhecido. Verifique se é o extrato de fatura do Nubank (colunas: date, title, amount).'
    )
  }

  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 3) continue

    const dateRaw   = cols[dateIdx]?.trim()
    const titleRaw  = cols[titleIdx]?.trim() ?? ''
    const amountRaw = cols[amountIdx]?.trim() ?? '0'

    const amount = parseFloat(amountRaw.replace(',', '.'))
    if (isNaN(amount)) continue

    // Detecta tipo da linha
    let rowType: ParsedRow['rowType']
    if (amount < 0) {
      rowType = isPaymentRow(titleRaw) ? 'PAYMENT' : 'INCOME'
    } else {
      rowType = 'EXPENSE'
    }

    const categoryName = rowType === 'EXPENSE' ? detectCategory(titleRaw) : null
    const { isInstallment, info: installmentInfo } = extractInstallment(titleRaw)

    rows.push({
      date:           dateRaw,
      originalTitle:  titleRaw,
      description:    cleanTitle(titleRaw.replace(/\s*-\s*parcela\s+\d+\/\d+/i, '').trim()),
      amount:         Math.abs(amount),
      rowType,
      confidence:     categoryName ? 'high' : 'low',
      categoryName,
      categoryId:     null,    // resolvido pelo server (lookup por nome)
      isInstallment,
      ...(installmentInfo && { installmentInfo }),
    })
  }

  return rows
}

// ── CSV parser com suporte a aspas e escape de "" ─────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current   = ''
  let inQuotes  = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // "" dentro de aspas = literal "
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  fields.push(current)
  return fields
}
