import { useEffect, useRef } from 'react'

// Keeps lists in sync across devices without realtime: refetch when the tab
// regains focus / becomes visible, and (optionally) on a slow interval.
// Neon has no realtime, but polling every ~15s is plenty for this use case.
export function useAutoRefresh(callback, { intervalMs = 15000 } = {}) {
  const cb = useRef(callback)
  cb.current = callback

  useEffect(() => {
    const run = () => cb.current?.()
    const onVisible = () => { if (!document.hidden) run() }

    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisible)
    const id = intervalMs ? setInterval(run, intervalMs) : null

    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
      if (id) clearInterval(id)
    }
  }, [intervalMs])
}
