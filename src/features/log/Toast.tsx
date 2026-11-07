import { useEffect } from 'react'
import { useUi } from '../../state/ui'

export function Toast() {
  const toast = useUi((s) => s.toast)
  const clear = useUi((s) => s.clearToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clear, 4200)
    return () => clearTimeout(t)
  }, [toast, clear])
  if (!toast) return null
  return (
    <div className="toast" role="status" onClick={clear}>
      {toast.text}
    </div>
  )
}
