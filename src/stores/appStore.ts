import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  sidebarCollapsed: boolean
  selectedMonth: { year: number; month: number }
  toggleSidebar: () => void
  setSelectedMonth: (v: { year: number; month: number }) => void
}

const now = new Date()
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      selectedMonth: { year: now.getFullYear(), month: now.getMonth() + 1 },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
    }),
    { name: 'app-storage' }
  )
)
