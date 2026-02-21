export type ToastType = 'success' | 'error' | 'info'

export type ToastPayload = {
  message: string
  type?: ToastType
}

export function showToast(payload: ToastPayload) {
  window.dispatchEvent(new CustomEvent<ToastPayload>('app-toast', { detail: payload }))
}

