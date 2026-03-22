import { supabase } from '@/services/supabase'
import type { Notification } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as Notification[]
}

export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread')
  if (error) throw error
  return count ?? 0
}

export async function markAsRead(id: string) {
  const { error } = await (supabase
    .from('notifications') as AnyTable)
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function markAllAsRead() {
  const { error } = await (supabase
    .from('notifications') as AnyTable)
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('status', 'unread')
  if (error) throw error
}

export async function dismissNotification(id: string) {
  const { error } = await (supabase
    .from('notifications') as AnyTable)
    .update({ status: 'dismissed' })
    .eq('id', id)
  if (error) throw error
}
