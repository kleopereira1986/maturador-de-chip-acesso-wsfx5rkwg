import { supabase } from '@/lib/supabase/client'
import { Profile, UserRole } from '@/types'

export const usersService = {
  async getProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Profile[]
  },

  async createUser(email: string, fullName: string, role: UserRole, password?: string) {
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: email,
      p_full_name: fullName,
      p_role: role,
      p_password: password || 'Mudar@123',
    })

    if (error) throw error
    return data
  },

  async updateUser(userId: string, fullName: string, role: UserRole, password?: string) {
    const payload: any = {
      p_user_id: userId,
      p_full_name: fullName,
      p_role: role,
    }

    if (password) {
      payload.p_password = password
    }

    const { error } = await supabase.rpc('admin_update_user', payload)

    if (error) throw error
    return true
  },

  async deleteUser(userId: string) {
    const { error } = await supabase.rpc('admin_delete_user', {
      p_user_id: userId,
    })

    if (error) throw error
    return true
  },
}
