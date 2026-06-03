import { supabase } from '@/lib/supabase/client'
import { MaturadorConfig } from '@/types'

export const maturadorService = {
  async getConfig() {
    const { data, error } = await supabase.from('maturador_configs').select('*').limit(1).single()
    if (error && error.code !== 'PGRST116') throw error
    return data as MaturadorConfig | null
  },
  async saveConfig(config: Partial<MaturadorConfig>) {
    const existing = await this.getConfig()
    if (existing) {
      const { error } = await supabase
        .from('maturador_configs')
        .update(config)
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('maturador_configs').insert(config)
      if (error) throw error
    }
  },
}
