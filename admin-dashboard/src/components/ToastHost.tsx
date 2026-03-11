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
          className={`border px-4 py-2 rounded-lg shadow-[0_14px_30px_rgba(44,62,80,0.14)] text-sm ${
            t.type === 'success'
              ? 'border-[#7ec8f4] bg-[#edf7fe] text-[#2c3e50]'
              : t.type === 'error'
                ? 'border-[#9cc9e8] bg-[#eef5fa] text-[#2c3e50]'
                : 'border-[#88c5eb] bg-[#2c3e50] text-white'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
