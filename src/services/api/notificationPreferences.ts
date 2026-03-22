import { supabase } from '@/services/supabase'
import type { NotificationPreference } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function fetchNotificationPreferences() {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') throw error // 116 = não encontrado é ok
  return data as NotificationPreference | null
}

export async function createNotificationPreferences(preferences: Omit<NotificationPreference, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await (supabase
    .from('notification_preferences') as AnyTable)
    .insert([preferences])
    .select()
    .single()

  if (error) throw error
  return data as NotificationPreference
}

export async function updateNotificationPreferences(payload: Partial<Omit<NotificationPreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await (supabase
    .from('notification_preferences') as AnyTable)
    .update(payload)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .select()
    .single()

  if (error) throw error
  return data as NotificationPreference
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateNotificationPreference(key: keyof NotificationPreference, value: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateNotificationPreferences({ [key]: value } as any)
}
