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

    // Evolution API webhook payload for messages
    if (event === 'messages.upsert' || event === 'messages_upsert') {
      const instanceName = body.instance

      // Support for different Evolution API payload structures (v1 vs v2)
      let msgData = body.data?.message
      let key = body.data?.key
      let pushName = body.data?.pushName || ''

      if (!msgData && Array.isArray(body.data) && body.data.length > 0) {
        msgData = body.data[0]?.message
        key = body.data[0]?.key
        pushName = body.data[0]?.pushName || ''
      } else if (!msgData && body.data?.messages && Array.isArray(body.data.messages)) {
        msgData = body.data.messages[0]?.message
        key = body.data.messages[0]?.key
        pushName = body.data.messages[0]?.pushName || ''
      }

      if (key && !key.fromMe && msgData) {
        const remoteJid = key.remoteJid
        if (remoteJid && remoteJid.includes('@s.whatsapp.net')) {
          const contactPhone = remoteJid.split('@')[0]
          const contactName = pushName
          const messageBody =
            msgData.conversation ||
            msgData.extendedTextMessage?.text ||
            msgData.imageMessage?.caption ||
            msgData.videoMessage?.caption ||
            ''

          if (messageBody && instanceName) {
            const { data: instance } = await supabase
              .from('whatsapp_instances')
              .select('id')
              .eq('name', instanceName)
              .single()

            if (instance) {
              await supabase.from('whatsapp_messages').insert({
                instance_id: instance.id,
                contact_phone: contactPhone,
                contact_name: contactName,
                message_body: messageBody,
                direction: 'incoming',
                is_responded: false,
              })
            }
          }
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
