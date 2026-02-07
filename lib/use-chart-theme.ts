'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface ChartTheme {
  gridStroke: string
  axisFill: string
  axisStroke: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
}

const lightTheme: ChartTheme = {
  gridStroke: '#e5e7eb',
  axisFill: '#6b7280',
  axisStroke: '#e5e7eb',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e7eb',
  tooltipText: '#111827',
}

const darkTheme: ChartTheme = {
  gridStroke: '#374151',
  axisFill: '#9ca3af',
  axisStroke: '#374151',
  tooltipBg: '#1f2937',
  tooltipBorder: '#374151',
  tooltipText: '#f3f4f6',
}

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme()
  const [theme, setTheme] = useState<ChartTheme>(lightTheme)

  useEffect(() => {
    setTheme(resolvedTheme === 'dark' ? darkTheme : lightTheme)
  }, [resolvedTheme])

  return theme
}
