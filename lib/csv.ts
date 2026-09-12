export function toCSV(rows: Record<string, any>[], columns: string[]): string {
  const escape = (val: any) => {
    if (val === null || val === undefined) return ''
    let str = String(val)
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const header = columns.join(',')
  const lines = rows.map((row) => columns.map((col) => escape(row[col])).join(','))
  return [header, ...lines].join('\n')
}

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}