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

    // Evolution API webhook payload for messages
    if (body.event === 'messages.upsert') {
      const instanceName = body.instance
      const msgData = body.data?.message
      const key = body.data?.key

      if (key && !key.fromMe && msgData) {
        const remoteJid = key.remoteJid
        if (remoteJid && remoteJid.includes('@s.whatsapp.net')) {
          const contactPhone = remoteJid.split('@')[0]
          const contactName = body.data?.pushName || ''
          const messageBody = msgData.conversation || msgData.extendedTextMessage?.text || ''

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
    if (body.event === 'connection.update') {
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
