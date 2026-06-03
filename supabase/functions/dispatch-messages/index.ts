import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'DISPARANDO')

    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ message: 'No active campaigns' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: instances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('status', 'CONECTADO')
    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ message: 'No connected instances' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let instanceIndex = 0

    for (const campaign of campaigns) {
      const { data: checkCamp } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', campaign.id)
        .single()
      if (checkCamp?.status === 'PAUSADO') continue

      const { data: queue } = await supabase
        .from('dispatch_queue')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'PENDING')
        .limit(50)

      if (!queue || queue.length === 0) {
        await supabase.from('campaigns').update({ status: 'CONCLUIDO' }).eq('id', campaign.id)
        continue
      }

      for (const item of queue) {
        const instance = instances[instanceIndex % instances.length]
        instanceIndex++

        const parseSpintax = (text: string) => {
          const spintaxRegex = /\{([^{}]+)\}/g
          let parsed = text
          let match
          while ((match = spintaxRegex.exec(parsed)) !== null) {
            const options = match[1].split('|')
            const randomOption = options[Math.floor(Math.random() * options.length)]
            parsed = parsed.replace(match[0], randomOption)
            spintaxRegex.lastIndex = 0
          }
          return parsed
        }

        const messageText = parseSpintax(campaign.message_text)

        // Mock Evolution API interaction
        const success = true

        if (success) {
          await supabase
            .from('dispatch_queue')
            .update({ status: 'SENT', instance_id: instance.id })
            .eq('id', item.id)
        } else {
          await supabase
            .from('dispatch_queue')
            .update({ status: 'FAILED', error_message: 'API Error' })
            .eq('id', item.id)
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
