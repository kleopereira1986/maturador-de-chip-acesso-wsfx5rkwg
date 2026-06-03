import { supabase } from '@/lib/supabase/client'
import { Campaign } from '@/types'

export const campaignsService = {
  async getCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Campaign[]
  },
  async createCampaign(campaign: Partial<Campaign>) {
    const { data: user } = await supabase.auth.getUser()

    // Determine profile to enforce specific instance routing if it's a Corretor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.user?.id)
      .single()

    let instanceIds = campaign.instance_ids || []

    if (profile?.role === 'corretor') {
      const { data: instances } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('owner_id', user.user?.id)

      if (instances && instances.length > 0) {
        instanceIds = instances.map((i) => i.id)
      }
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({ ...campaign, instance_ids: instanceIds, created_by: user.user?.id })
      .select()
      .single()
    if (error) throw error
    return data as Campaign
  },
  async updateCampaign(id: string, updates: Partial<Campaign>) {
    const { error } = await supabase.from('campaigns').update(updates).eq('id', id)
    if (error) throw error
  },
  async deleteCampaign(id: string) {
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) throw error
  },
  async uploadMedia(file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const { error } = await supabase.storage.from('campaign-media').upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('campaign-media').getPublicUrl(fileName)
    return data.publicUrl
  },
  async getDispatchStats(campaignId: string) {
    const { data, error } = await supabase
      .from('dispatch_queue')
      .select('status', { count: 'exact' })
      .eq('campaign_id', campaignId)
    if (error) throw error

    let sent = 0
    let failed = 0
    let pending = 0
    let processing = 0

    data.forEach((q) => {
      if (q.status === 'SENT') sent++
      else if (q.status === 'FAILED' || q.status === 'ERROR') failed++
      else if (q.status === 'PROCESSING') processing++
      else pending++
    })

    return { sent, failed, pending, processing, total: sent + failed + pending + processing }
  },
  async addLeads(campaignId: string, leads: { lead_name: string | null; phone: string }[]) {
    const payload = leads.map((l) => ({
      campaign_id: campaignId,
      lead_name: l.lead_name,
      phone: l.phone,
    }))
    const { error } = await supabase.from('dispatch_queue').insert(payload)
    if (error) throw error
  },
  async getCampaignErrors(campaignId: string) {
    const { data, error } = await supabase
      .from('dispatch_queue')
      .select('id, lead_name, phone, status, error_message, updated_at')
      .eq('campaign_id', campaignId)
      .in('status', ['ERROR', 'FAILED'])
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data
  },
}
