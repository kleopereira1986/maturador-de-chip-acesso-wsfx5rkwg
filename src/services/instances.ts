import { supabase } from '@/lib/supabase/client'
import { WhatsappInstance, ConfiguracoesApi } from '@/types'

export const instancesService = {
  async getConfig() {
    const { data, error } = await supabase
      .from('configuracoes_api')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data as ConfiguracoesApi | null
  },
  async syncInstances(url_servidor: string, global_api_key: string) {
    const { data, error } = await supabase.functions.invoke('sync-instances', {
      body: { url_servidor, global_api_key },
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  },
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
      .insert({ name, token, status: 'DESCONECTADO', owner_id: user.user?.id })
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
