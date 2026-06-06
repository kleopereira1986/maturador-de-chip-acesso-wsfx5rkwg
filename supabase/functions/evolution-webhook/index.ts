import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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
    if (event === 'messages.upsert' || event === 'messages_upsert') {
      const instanceName = body.instance || body.instanceName

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
          const msgData = msgItem.message
          const key = msgItem.key
          const pushName = msgItem.pushName || ''

          // Process both incoming and outgoing messages
          if (key && msgData) {
            const remoteJid = key.remoteJid
            const messageId = key.id
            // Avoid status broadcasts or non-standard JIDs
            if (remoteJid && remoteJid !== 'status@broadcast' && !remoteJid.includes('@g.us')) {
              let contactPhone = ''

              if (remoteJid.endsWith('@lid')) {
                const sender = msgItem.sender || msgData.sender || key.participant
                if (sender) {
                  contactPhone = sender.split('@')[0]
                }
              } else if (remoteJid.includes('@s.whatsapp.net')) {
                contactPhone = remoteJid.split('@')[0]
              }

              if (!contactPhone) continue

              const contactName = pushName || null

              const isIncoming = key.fromMe === false
              const direction = isIncoming ? 'incoming' : 'outgoing'
              const isResponded = !isIncoming // Outgoing messages mean we responded

              let messageBody =
                msgData.conversation ||
                msgData.extendedTextMessage?.text ||
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
                    const { error: insertError } = await supabase.from('whatsapp_messages').insert({
                      instance_id: instance.id,
                      contact_phone: contactPhone,
                      contact_name: contactName,
                      message_body: messageBody,
                      direction: direction,
                      is_responded: isResponded,
                      message_id: messageId,
                    })

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

      let newStatus = 'CONECTANDO'
      if (state === 'open') newStatus = 'CONECTADO'
      else if (state === 'close') newStatus = 'DESCONECTADO'

      if (instanceName) {
        await supabase
          .from('whatsapp_instances')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('name', instanceName)
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
