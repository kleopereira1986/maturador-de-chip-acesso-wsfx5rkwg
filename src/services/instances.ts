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
  async createInstance(
    name: string,
    token: string,
    options?: {
      proxy_host?: string | null
      proxy_port?: string | null
      proxy_user?: string | null
      proxy_password?: string | null
      user_agent?: string | null
    },
  ) {
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        name,
        token,
        status: 'DESCONECTADO',
        owner_id: user.user?.id,
        proxy_host: options?.proxy_host,
        proxy_port: options?.proxy_port,
        proxy_user: options?.proxy_user,
        proxy_password: options?.proxy_password,
        user_agent: options?.user_agent,
      })
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
  async configureWebhook(url_servidor: string, global_api_key: string, instance_name: string) {
    const webhookUrl = 'https://uidafexgwtplfnjrgoyi.supabase.co/functions/v1/evolution-webhook'
    const res = await fetch(`${url_servidor}/webhook/set/${instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: global_api_key,
      },
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      }),
    })

    if (!res.ok) {
      let errorMessage = `Erro HTTP ${res.status}`
      try {
        const errData = await res.json()
        errorMessage = errData?.response?.message?.[0] || errData?.message || errorMessage
      } catch (e) {
        // Ignora caso não seja JSON
      }
      throw new Error(errorMessage)
    }
    return await res.json()
  },
}
