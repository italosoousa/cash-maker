// ── Tipos compartilhados do módulo de importação ─────────────────────────────

export type ImportType = 'fatura' | 'extrato'

export type RowConfidence = 'high' | 'low'

export interface ParsedRow {
  /** Data da transação (YYYY-MM-DD) */
  date:          string
  /** Descrição original do CSV */
  originalTitle: string
  /** Descrição limpa para exibição */
  description:   string
  /** Valor sempre positivo */
  amount:        number
  /** EXPENSE = gasto / PAYMENT = pagamento da fatura (não importar) */
  rowType:       'EXPENSE' | 'PAYMENT' | 'INCOME'
  /** true = palavra-chave encontrada */
  confidence:    RowConfidence
  /** Nome da categoria detectada (null = precisa de revisão) */
  categoryName:  string | null
  /** ID da categoria no banco (resolvido pelo server) */
  categoryId:    string | null
  /** Se contém "Parcela X/Y" */
  isInstallment: boolean
  installmentInfo?: string   // ex: "2/5"
}

export interface PreviewResult {
  bank:          string
  importType:    ImportType
  rows:          ParsedRow[]
  /** Total de despesas (exclui PAYMENT) */
  totalExpense:  number
  /** Valor do pagamento da fatura (se houver) — para deduplicação */
  paymentAmount: number | null
  /** Quantidade sem categoria definida */
  uncategorizedCount: number
}
