import { useEffect, useState } from 'react'
import type { ToastPayload } from '../utils/toast'

type ToastItem = {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<ToastPayload>
      const item: ToastItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message: ce.detail?.message || '',
        type: ce.detail?.type || 'info',
      }
      setToasts((prev) => [...prev, item])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== item.id))
      }, 3000)
    }
    window.addEventListener('app-toast', onToast)
    return () => window.removeEventListener('app-toast', onToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-lg shadow text-sm text-white ${
            t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-700'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
