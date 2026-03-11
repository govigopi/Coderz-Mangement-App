type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  const safePages = Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
  const items: Array<number | 'ellipsis'> = []

  safePages.forEach((page, index) => {
    const previous = safePages[index - 1]
    if (previous && page - previous > 1) {
      items.push('ellipsis')
    }
    items.push(page)
  })

  return items
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const items = buildPageItems(currentPage, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {items.map((item, index) => (
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-500">...</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm ${
              item === currentPage
                ? 'bg-[var(--brand)] text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            aria-current={item === currentPage ? 'page' : undefined}
          >
            {item}
          </button>
        )
      ))}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-[var(--brand)] disabled:opacity-50"
      >
        <span>Next</span>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 3 5 5-5 5" />
        </svg>
      </button>
    </div>
  )
}
