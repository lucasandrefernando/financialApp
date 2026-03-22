import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useAppStore } from '@/stores/appStore'

const ThemeContext = createContext<null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <ThemeContext.Provider value={null}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  return useContext(ThemeContext)
}
