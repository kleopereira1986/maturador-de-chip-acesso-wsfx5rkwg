import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

function normalizePhone(identifier: string | null | undefined): string {
  if (!identifier) return ''
  return identifier.split('@')[0].replace(/\D/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await req.json()
    const event = body.event?.toLowerCase()

    // Log the webhook payload
    try {
      await supabase.from('webhook_logs').insert({
        payload: body,
        event_type: event || 'unknown',
      })
    } catch (logErr: any) {
      console.error('Error logging webhook:', logErr.message)
    }

    // Evolution API webhook payload for messages
    if (
      event === 'messages.upsert' ||
      event === 'messages_upsert' ||
      event === 'send.message' ||
      event === 'send_message'
    ) {
      const instanceName = body.instance || body.instanceName
      const rootSender = body.sender

      let messagesToProcess: any[] = []

      if (Array.isArray(body.data)) {
        messagesToProcess = body.data
      } else if (body.data?.messages && Array.isArray(body.data.messages)) {
        messagesToProcess = body.data.messages
      } else if (body.data) {
        messagesToProcess = [body.data]
      }

      for (const msgItem of messagesToProcess) {
        try {
          const msgData = msgItem.message || msgItem
          const key = msgItem.key ||
            msgData.key || {
              remoteJid: msgItem.remoteJid || msgData.remoteJid,
              id: msgItem.id || msgItem.messageId || msgData.messageId,
              fromMe: msgItem.fromMe !== false,
            }
          const pushName = msgItem.pushName || msgData.pushName || ''

          // Process both incoming and outgoing messages
          if (
            key &&
            (msgData.conversation ||
              msgData.extendedTextMessage ||
              msgData.imageMessage ||
              msgData.videoMessage ||
              msgData.documentMessage ||
              msgData.audioMessage ||
              msgData.text)
          ) {
            const remoteJid = key.remoteJid
            const messageId = key.id
            // Avoid status broadcasts or non-standard JIDs
            if (remoteJid && remoteJid !== 'status@broadcast' && !remoteJid.includes('@g.us')) {
              const isIncoming = key.fromMe === false && !event?.includes('send')
              const direction = isIncoming ? 'incoming' : 'outgoing'
              const isResponded = !isIncoming // Outgoing messages mean we responded

              let contactPhone = ''

              // Extract the true remote JID (the client)
              // If it's a group, keep the full group JID for proper routing, otherwise normalize to pure numeric
              const rawSender = msgData.sender || msgItem.sender || rootSender || key.participant

              if (remoteJid && remoteJid.includes('@g.us')) {
                contactPhone = remoteJid
              } else {
                // Feature: Extract real phone from sender instead of remoteJid to avoid LIDs
                if (isIncoming && rawSender) {
                  contactPhone = normalizePhone(rawSender)
                } else {
                  contactPhone = normalizePhone(remoteJid)
                }
              }

              // Prevent Self-Messaging Loop or weird instance sender bugs
              const potentialSender = normalizePhone(rawSender)
              if (
                potentialSender &&
                contactPhone &&
                potentialSender === contactPhone &&
                !isIncoming
              ) {
                console.log('Self-Messaging Loop prevented: sender matches remoteJid', contactPhone)
                continue
              }

              if (!contactPhone) continue

              const contactName = pushName || null

              let messageBody =
                msgData.conversation ||
                msgData.extendedTextMessage?.text ||
                msgData.text ||
                msgData.imageMessage?.caption ||
                msgData.videoMessage?.caption ||
                msgData.documentMessage?.caption ||
                msgData.audioMessage?.caption ||
                ''

              if (!messageBody) {
                if (msgData.imageMessage) messageBody = '📷 Imagem'
                else if (msgData.videoMessage) messageBody = '🎥 Vídeo'
                else if (msgData.audioMessage) messageBody = '🎵 Áudio'
                else if (msgData.documentMessage) messageBody = '📄 Documento'
                else if (msgData.stickerMessage) messageBody = '🧩 Figurinha'
                else if (msgData.contactMessage) messageBody = '👤 Contato'
                else if (msgData.locationMessage) messageBody = '📍 Localização'
                else messageBody = 'Mensagem não suportada'
              }

              if (instanceName) {
                const { data: instance, error: instanceError } = await supabase
                  .from('whatsapp_instances')
                  .select('id')
                  .eq('name', instanceName)
                  .single()

                if (instanceError) {
                  console.error(
                    `Instance not found or error fetching: ${instanceName}`,
                    instanceError,
                  )
                  continue
                }

                if (instance) {
                  // Check if message already exists to ensure idempotency
                  const { data: existingMsg } = await supabase
                    .from('whatsapp_messages')
                    .select('id')
                    .eq('message_id', messageId)
                    .maybeSingle()

                  if (!existingMsg) {
                    const insertPayload: any = {
                      instance_id: instance.id,
                      contact_phone: contactPhone,
                      contact_name: contactName,
                      message_body: messageBody,
                      direction: direction,
                      is_responded: isResponded,
                      message_id: messageId,
                      remote_jid: remoteJid,
                    }

                    const { error: insertError } = await supabase
                      .from('whatsapp_messages')
                      .insert(insertPayload)

                    if (insertError) {
                      if (insertError.code === '23505') {
                        // Unique constraint violation
                        console.log('Duplicate message skipped via unique constraint:', messageId)
                      } else {
                        console.error('Error inserting message into DB:', insertError)
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (msgErr: any) {
          console.error('Error processing individual message mapping:', msgErr.message)
        }
      }
    }

    // Evolution API webhook payload for connection
    if (event === 'connection.update' || event === 'connection_update') {
      const instanceName = body.instance
      const state = body.data?.state
      const statusReason = body.data?.statusReason || body.data?.reason || null

      let newStatus = 'CONECTANDO'
      const updatePayload: any = { updated_at: new Date().toISOString() }

      if (state === 'open') {
        newStatus = 'CONECTADO'
        updatePayload.last_error = null
      } else if (state === 'close') {
        newStatus = 'DESCONECTADO'
        if (statusReason && statusReason !== 428) {
          let reasonText = `Conexão fechada. Código: ${statusReason}`
          if (statusReason === 401) reasonText = 'Desconectado: Aparelho deslogado (401)'
          else if (statusReason === 408) reasonText = 'Desconectado: Timeout de conexão (408)'
          else if (statusReason === 440) reasonText = 'Desconectado: Conflito de sessão (440)'
          else if (statusReason === 500) reasonText = 'Desconectado: Erro interno do servidor (500)'
          updatePayload.last_error = reasonText
        }
      }

      updatePayload.status = newStatus

      if (instanceName) {
        await supabase.from('whatsapp_instances').update(updatePayload).eq('name', instanceName)
      }
    }

    // Return 200 OK to Evolution API to prevent webhook retries
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Webhook global processing error:', error.message, error.stack)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
