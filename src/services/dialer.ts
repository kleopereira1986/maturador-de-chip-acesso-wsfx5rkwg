import { supabase } from '@/lib/supabase/client'
import { DialerQueue } from '@/types'

export const dialerService = {
  async getQueue() {
    const { data, error } = await supabase
      .from('dialer_queue')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as DialerQueue[]
  },
  async addLead(lead_name: string, phone: string) {
    const { error } = await supabase.from('dialer_queue').insert({ lead_name, phone })
    if (error) throw error
  },
  async updateStatus(id: string, status: string) {
    const { error } = await supabase.from('dialer_queue').update({ status }).eq('id', id)
    if (error) throw error
  },
}
