import { supabase } from '@/services/supabase'
import type { Profile, Database } from '@/types/database'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function fetchProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(payload: ProfileUpdate) {
  const { data, error } = await (supabase
    .from('profiles') as AnyTable)
    .update(payload)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

export async function uploadAvatar(file: File) {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Usuário não autenticado')

  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)

  await updateProfile({ avatar_url: data.publicUrl })
  return data.publicUrl
}
