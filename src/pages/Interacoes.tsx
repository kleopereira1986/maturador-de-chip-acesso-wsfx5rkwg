import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import {
  MessageSquare,
  Send,
  User,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { WhatsappMessage, WhatsappInstance, WebhookLog } from '@/types'

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return ''
  let cleanPhone = phone
  if (cleanPhone.includes('@')) {
    cleanPhone = cleanPhone.split('@')[0]
  }
  const cleaned = cleanPhone.replace(/\D/g, '')
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    return `+55 (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.startsWith('55') && cleaned.length === 12) {
    return `+55 (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`
  }
  return cleaned || cleanPhone
}

export default function Interacoes() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [pendingContacts, setPendingContacts] = useState<WhatsappMessage[]>([])
  const [selectedContact, setSelectedContact] = useState<{
    phone: string
    instance_id: string
    name: string | null
    remote_jid?: string | null
  } | null>(null)
  const [messages, setMessages] = useState<WhatsappMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [instancesMap, setInstancesMap] = useState<Record<string, WhatsappInstance>>({})
  const selectedContactRef = useRef(selectedContact)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>(
    'connecting',
  )
  const [realtimeError, setRealtimeError] = useState<string | null>(null)
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null)
  const [logs, setLogs] = useState<WebhookLog[]>([])

  useEffect(() => {
    selectedContactRef.current = selectedContact
  }, [selectedContact])

  const fetchLogs = async () => {
    if (profile?.role !== 'master' && profile?.role !== 'gerente') return
    const { data } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) setLogs(data as WebhookLog[])
  }

  const setupRealtime = () => {
    setRealtimeStatus('connecting')

    // Remove existing channels
    supabase.getChannels().forEach((ch) => supabase.removeChannel(ch))

    const channel = supabase
      .channel('interacoes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          setLastEventTime(new Date())
          fetchPending()

          if (selectedContactRef.current) {
            if (
              payload.eventType === 'INSERT' &&
              payload.new &&
              payload.new.instance_id === selectedContactRef.current.instance_id &&
              payload.new.contact_phone === selectedContactRef.current.phone
            ) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.new.id)) return prev
                return [...prev, payload.new as WhatsappMessage]
              })
            } else {
              fetchMessages(
                selectedContactRef.current.instance_id,
                selectedContactRef.current.phone,
              )
            }
          }
        },
      )

    if (profile?.role === 'master' || profile?.role === 'gerente') {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webhook_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as WebhookLog, ...prev].slice(0, 5))
        },
      )
    }

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected')
        setRealtimeError(null)
        toast({ title: 'Conexão Real-time', description: 'Sistema Online e escutando eventos.' })
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setRealtimeStatus('error')
        const errorMsg = err
          ? (err as any).message || JSON.stringify(err)
          : 'A comunicação em tempo real falhou.'
        setRealtimeError(errorMsg)
        toast({
          title: 'Conexão Perdida',
          description: `Erro: ${errorMsg}`,
          variant: 'destructive',
        })
      }
    })
  }

  useEffect(() => {
    fetchInstances()
    fetchPending()

    if (profile) {
      fetchLogs()
      setupRealtime()
    }

    return () => {
      supabase.getChannels().forEach((ch) => supabase.removeChannel(ch))
    }
  }, [profile])

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.instance_id, selectedContact.phone)
    } else {
      setMessages([])
    }
  }, [selectedContact])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const fetchInstances = async () => {
    const { data } = await supabase.from('whatsapp_instances').select('*')
    if (data) {
      const map: Record<string, WhatsappInstance> = {}
      data.forEach((i) => {
        map[i.id] = i as WhatsappInstance
      })
      setInstancesMap(map)
    }
  }

  const fetchPending = async () => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('direction', 'incoming')
      .eq('is_responded', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    if (data) {
      const grouped: Record<string, WhatsappMessage> = {}
      data.forEach((msg) => {
        const key = `${msg.instance_id}_${msg.contact_phone}`
        if (!grouped[key]) {
          grouped[key] = msg as WhatsappMessage
        }
      })
      setPendingContacts(Object.values(grouped))
    }
  }

  const fetchMessages = async (instanceId: string, phone: string) => {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('contact_phone', phone)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data as WhatsappMessage[])
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedContact || isSending) return

    setIsSending(true)
    try {
      const instance = instancesMap[selectedContact.instance_id]
      if (!instance) throw new Error('Instância não encontrada')

      // Dest Number Logic & Sanitization
      // We prioritize the clean contact phone for 1-on-1 chats to ensure a pure numeric destination as requested.
      // We fall back to remote_jid mainly for groups (@g.us).
      let destination = selectedContact.remote_jid?.includes('@g.us')
        ? selectedContact.remote_jid
        : selectedContact.phone

      if (!destination) {
        throw new Error('Destinatário inválido (sem número).')
      }

      // If it's a group, we MUST keep @g.us
      if (!destination.includes('@g.us')) {
        // Sanitize to pure numeric for 1-on-1
        destination = destination.replace(/\D/g, '')

        if (!destination || destination.length < 10) {
          throw new Error('Número de destino inválido após sanitização (muito curto ou vazio).')
        }

        // Add default country code if missing for normal numbers
        if (destination.length >= 10 && destination.length <= 11 && !destination.startsWith('55')) {
          destination = '55' + destination
        }
      }

      // Check to prevent self-messaging (instance sending to itself)
      const instancePhone = instance.name.replace(/\D/g, '')
      if (instancePhone && destination === instancePhone) {
        throw new Error(
          'Não é possível enviar mensagem para o próprio número da instância (loop evitado).',
        )
      }

      // Allow up to 30 characters to support long numeric LIDs
      if (!destination || destination.length < 10 || destination.length > 30) {
        console.error(`Invalid recipient identifier: ${destination}`)
        throw new Error('O identificador do destinatário é inválido ou não pôde ser resolvido.')
      }

      const { data: config, error: configError } = await supabase
        .from('configuracoes_api')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (configError) throw new Error(`Erro ao buscar configuração: ${configError.message}`)
      if (!config || !config.global_api_key)
        throw new Error('Configuração de API não encontrada ou sem Global API Key')

      const endpoint = `${config.url_servidor}/message/sendText/${instance.name}`

      console.log(`[Dispatch] Sending message via ${instance.name} to ${destination}`)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.global_api_key,
        },
        body: JSON.stringify({
          number: destination,
          textMessage: { text: newMessage.trim() },
        }),
      })

      if (!res.ok) {
        let errorMessage = 'Falha ao enviar mensagem pela API. Verifique a conexão da instância.'
        try {
          const errData = await res.json()
          if (errData?.response?.data?.message) {
            errorMessage =
              typeof errData.response.data.message === 'string'
                ? errData.response.data.message
                : JSON.stringify(errData.response.data.message)
          } else if (errData?.response?.message) {
            errorMessage = Array.isArray(errData.response.message)
              ? errData.response.message.join(', ')
              : typeof errData.response.message === 'string'
                ? errData.response.message
                : JSON.stringify(errData.response.message)
          } else if (errData?.data?.message) {
            errorMessage = Array.isArray(errData.data.message)
              ? errData.data.message.join(', ')
              : typeof errData.data.message === 'string'
                ? errData.data.message
                : JSON.stringify(errData.data.message)
          } else if (errData?.message) {
            errorMessage = Array.isArray(errData.message)
              ? errData.message.join(', ')
              : typeof errData.message === 'string'
                ? errData.message
                : JSON.stringify(errData.message)
          } else if (errData?.error) {
            errorMessage =
              typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error)
          }
        } catch (e) {
          // Fallback caso não seja JSON
        }

        // Ensure errorMessage is a string
        if (typeof errorMessage !== 'string') {
          try {
            errorMessage = JSON.stringify(errorMessage)
          } catch (e) {
            errorMessage = String(errorMessage)
          }
        }
        if (errorMessage === '[object Object]' || errorMessage === '{}') {
          errorMessage = 'Erro interno na API da Evolution. Verifique se o número é válido.'
        }

        throw new Error(errorMessage)
      }

      const { error } = await supabase.from('whatsapp_messages').insert({
        instance_id: instance.id,
        contact_phone: selectedContact.phone, // Mantém o contact_phone original para consistência da conversa
        contact_name: selectedContact.name,
        message_body: newMessage.trim(),
        direction: 'outgoing',
        is_responded: true,
      })

      if (error) throw error

      setNewMessage('')
    } catch (error: any) {
      let description = 'Erro ao enviar mensagem. Verifique a conexão da instância.'

      if (error instanceof Error && error.message) {
        description = error.message
      } else if (typeof error === 'string') {
        description = error
      } else if (error && typeof error === 'object') {
        try {
          description = error.message || error.error || JSON.stringify(error)
        } catch {
          /* intentionally ignored */
        }
      }

      if (description === '[object Object]' || description === '{}') {
        description = 'Erro ao enviar mensagem pela API. O destino pode ser inválido.'
      }

      toast({
        title: 'Erro ao enviar',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleMarkResponded = async () => {
    if (!selectedContact) return

    const { error } = await supabase
      .from('whatsapp_messages')
      .update({ is_responded: true })
      .eq('contact_phone', selectedContact.phone)
      .eq('instance_id', selectedContact.instance_id)

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Sucesso',
      description: 'Conversa marcada como respondida.',
    })
    setSelectedContact(null)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Sidebar - Contatos Pendentes */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Interações Pendentes
          </h2>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            {lastEventTime && <span>Último evento: {format(lastEventTime, 'HH:mm:ss')}</span>}
            {!lastEventTime && <span>Aguardando eventos...</span>}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {pendingContacts.length === 0 ? (
              <div className="text-center text-slate-500 py-8 text-sm">
                Nenhuma mensagem pendente.
              </div>
            ) : (
              pendingContacts.map((contact) => (
                <button
                  key={`${contact.instance_id}_${contact.contact_phone}`}
                  onClick={() =>
                    setSelectedContact({
                      phone: contact.contact_phone,
                      instance_id: contact.instance_id,
                      name: contact.contact_name,
                      remote_jid: (contact as any).remote_jid,
                    })
                  }
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3',
                    selectedContact?.phone === contact.contact_phone &&
                      selectedContact?.instance_id === contact.instance_id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  <Avatar
                    className={cn(
                      'h-10 w-10 border',
                      selectedContact?.phone === contact.contact_phone &&
                        selectedContact?.instance_id === contact.instance_id
                        ? 'border-primary-foreground/20'
                        : 'border-slate-200',
                    )}
                  >
                    <AvatarFallback className="bg-transparent">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="font-medium truncate text-sm leading-tight">
                      {contact.contact_name || 'Desconhecido'}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] mb-0.5 truncate',
                        selectedContact?.phone === contact.contact_phone &&
                          selectedContact?.instance_id === contact.instance_id
                          ? 'text-primary-foreground/70'
                          : 'text-slate-400',
                      )}
                    >
                      {formatPhone(contact.contact_phone)}
                    </p>
                    <p
                      className={cn(
                        'text-xs truncate mt-0.5',
                        selectedContact?.phone === contact.contact_phone &&
                          selectedContact?.instance_id === contact.instance_id
                          ? 'text-primary-foreground/90'
                          : 'text-slate-500',
                      )}
                    >
                      {contact.message_body}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Diagnostic Panel */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-medium text-sm">
              {realtimeStatus === 'connected' ? (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  🟢 Sistema Online
                </span>
              ) : realtimeStatus === 'connecting' ? (
                <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Conectando...
                </span>
              ) : (
                <span
                  className="text-red-600 dark:text-red-400 flex items-center gap-1.5"
                  title={realtimeError || 'Erro de conexão'}
                >
                  🔴 Conexão Perdida{' '}
                  {realtimeError && (
                    <span className="text-[10px] ml-1 opacity-80 truncate max-w-[150px]">
                      ({realtimeError})
                    </span>
                  )}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={setupRealtime}
            >
              Testar Conexão
            </Button>
          </div>

          {(profile?.role === 'master' || profile?.role === 'gerente') && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-7 flex items-center justify-between text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Ver Logs Técnicos
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ScrollArea className="h-40 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-950/50">
                  <div className="p-2 space-y-2">
                    {logs.length === 0 ? (
                      <div className="text-xs text-center text-slate-500 py-4">
                        Nenhum log recente.
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-xs"
                        >
                          <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500">
                            <span className="font-mono text-primary font-medium">
                              {log.event_type}
                            </span>
                            <span>{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                          </div>
                          <pre className="text-[10px] overflow-x-auto text-slate-700 dark:text-slate-300 font-mono">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
        {selectedContact ? (
          <>
            {/* Header do Chat */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium leading-tight">
                    {selectedContact.name
                      ? `${selectedContact.name} - ${formatPhone(selectedContact.phone)}`
                      : formatPhone(selectedContact.phone)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Via {instancesMap[selectedContact.instance_id]?.name || '...'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkResponded}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como Respondida
              </Button>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4 max-w-3xl mx-auto flex flex-col">
                {messages.map((msg) => {
                  const isMe = msg.direction === 'outgoing'
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message_body}</p>
                        <div
                          className={cn(
                            'text-[10px] mt-1 text-right',
                            isMe ? 'text-primary-foreground/70' : 'text-slate-400',
                          )}
                        >
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-slate-400" />
            </div>
            <p>Selecione uma conversa para visualizar</p>
          </div>
        )}
      </div>
    </div>
  )
}
