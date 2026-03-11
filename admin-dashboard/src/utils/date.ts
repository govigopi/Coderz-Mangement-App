function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatDisplayDate(value?: string | number | Date | null) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`
}

export function formatDisplayDateTime(value?: string | number | Date | null) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const hours = date.getHours()
  const displayHours = hours % 12 || 12
  const minutes = pad(date.getMinutes())
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  return `${formatDisplayDate(date)} ${pad(displayHours)}:${minutes} ${meridiem}`
}
