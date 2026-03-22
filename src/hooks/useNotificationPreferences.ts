import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNotificationPreferences, createNotificationPreferences, updateNotificationPreferences, updateNotificationPreference } from '@/services/api/notificationPreferences'
import { useAuthStore } from '@/stores/authStore'
import type { NotificationPreference } from '@/types/database'

export const notificationPrefsKeys = {
  all: ['notificationPrefs'] as const,
  detail: () => [...notificationPrefsKeys.all, 'detail'] as const,
}

/**
 * Hook para obter preferências de notificações
 */
export function useNotificationPreferences() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: notificationPrefsKeys.detail(),
    queryFn: fetchNotificationPreferences,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para criar preferências de notificações
 */
export function useCreateNotificationPreferences() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (preferences: Omit<NotificationPreference, 'id' | 'created_at' | 'updated_at'>) =>
      createNotificationPreferences(preferences),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationPrefsKeys.all })
    },
  })
}

/**
 * Hook para atualizar preferências de notificações
 */
export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<Omit<NotificationPreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) =>
      updateNotificationPreferences(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationPrefsKeys.all })
    },
  })
}

/**
 * Hook para atualizar uma preferência específica
 */
export function useUpdateNotificationPreference() {
  const qc = useQueryClient()

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ key, value }: { key: keyof NotificationPreference; value: any }) =>
      updateNotificationPreference(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationPrefsKeys.all })
    },
  })
}
