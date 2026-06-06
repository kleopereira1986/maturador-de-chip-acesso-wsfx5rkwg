export type UserRole = 'master' | 'gerente' | 'corretor'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  sip_extension?: string | null
  sip_password?: string | null
  sip_domain?: string | null
  created_at: string
  updated_at: string
}

export type WhatsappInstance = {
  id: string
  name: string
  token: string
  status: 'CONECTADO' | 'DESCONECTADO' | 'PAUSADO' | 'CONECTANDO'
  is_maturador_active: boolean
  owner_id: string
  created_at: string
  updated_at: string
}

export type Campaign = {
  id: string
  name: string
  message_text: string
  media_url: string | null
  media_type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'
  status: 'AGUARDANDO' | 'DISPARANDO' | 'PAUSADO' | 'CONCLUIDO'
  min_delay: number
  max_delay: number
  instance_ids: string[]
  created_by: string
  created_at: string
  updated_at: string
}

export type DispatchQueue = {
  id: string
  campaign_id: string
  instance_id: string | null
  lead_name: string | null
  phone: string
  status: 'PENDING' | 'SENT' | 'FAILED'
  error_message: string | null
  created_at: string
  updated_at: string
}

export type MaturadorConfig = {
  id: string
  dialogue_tree: any
  is_active: boolean
  min_delay: number
  max_delay: number
  created_at: string
  updated_at: string
}

export type DialerQueue = {
  id: string
  lead_name: string | null
  phone: string
  status: 'PENDING' | 'CONNECTED' | 'VOICEMAIL' | 'FAILED'
  created_at: string
  updated_at: string
}

export type ConfiguracoesApi = {
  id: string
  url_servidor: string
  global_api_key: string
  atualizado_em: string
}

export type WhatsappMessage = {
  id: string
  instance_id: string
  contact_phone: string
  contact_name: string | null
  message_body: string
  direction: 'incoming' | 'outgoing'
  is_responded: boolean
  created_at: string
}

export type WebhookLog = {
  id: string
  payload: any
  event_type: string | null
  created_at: string
}
