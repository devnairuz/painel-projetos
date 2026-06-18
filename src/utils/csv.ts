/**
 * Geração e download de CSV. Formatado para o Excel PT-BR: separador ';' e BOM
 * UTF-8 (para os acentos abrirem corretamente).
 */

// BOM UTF-8 (U+FEFF) — faz o Excel reconhecer os acentos.
const BOM = String.fromCharCode(0xfeff)

type Cell = string | number | null | undefined

function escapeCell(value: Cell): string {
  const s = value === null || value === undefined ? '' : String(value)
  // Aspas quando houver separador, aspas ou quebra de linha.
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Converte uma matriz de linhas em texto CSV (separador ';'). */
export function toCsv(rows: Cell[][]): string {
  const body = rows.map((row) => row.map(escapeCell).join(';')).join('\r\n')
  return BOM + body
}

/** Dispara o download de um CSV no navegador. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
