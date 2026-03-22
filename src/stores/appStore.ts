import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface AppState {
  theme: Theme
  sidebarCollapsed: boolean
  selectedMonth: { year: number; month: number }
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSelectedMonth: (year: number, month: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarCollapsed: false,
      selectedMonth: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      },
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setSelectedMonth: (year, month) => set({ selectedMonth: { year, month } }),
    }),
    { name: 'app-storage' }
  )
)
