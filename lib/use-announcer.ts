'use client'

import { useState, useCallback, useMemo } from 'react'
import { createElement } from 'react'

export function useAnnouncer() {
  const [message, setMessage] = useState('')

  const announce = useCallback((msg: string) => {
    setMessage('')
    requestAnimationFrame(() => setMessage(msg))
  }, [])

  const AnnouncerRegion = useMemo(
    () =>
      createElement(
        'div',
        { 'aria-live': 'polite', 'aria-atomic': true, className: 'sr-only' },
        message
      ),
    [message]
  )

  return { announce, AnnouncerRegion }
}
