import { supabase } from '@/lib/supabase/client'
import { WhatsappInstance } from '@/types'

export const instancesService = {
  async getInstances() {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as WhatsappInstance[]
  },
  async createInstance(name: string, token: string) {
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({ name, token, owner_id: user.user?.id })
      .select()
      .single()
    if (error) throw error
    return data as WhatsappInstance
  },
  async updateInstance(id: string, updates: Partial<WhatsappInstance>) {
    const { error } = await supabase.from('whatsapp_instances').update(updates).eq('id', id)
    if (error) throw error
  },
  async deleteInstance(id: string) {
    const { error } = await supabase.from('whatsapp_instances').delete().eq('id', id)
    if (error) throw error
  },
}
