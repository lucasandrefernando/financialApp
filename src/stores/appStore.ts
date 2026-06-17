import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  selectedMonth: { year: number; month: number }
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setSelectedMonth: (v: { year: number; month: number }) => void
}

const now = new Date()
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',
      selectedMonth: { year: now.getFullYear(), month: now.getMonth() + 1 },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
    }),
    { name: 'app-storage' }
  )
)
