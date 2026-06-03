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

        // Filter instance to match campaign instance_ids (Round-Robin with selection)
        let availableInstances = instances
        if (campaign.instance_ids && campaign.instance_ids.length > 0) {
          availableInstances = instances.filter((i: any) => campaign.instance_ids.includes(i.id))
        }

        if (availableInstances.length === 0) {
          console.warn(`No matching connected instances for campaign ${campaign.name}`)
          break // skip processing this campaign queue if no valid instance
        }

        const instance = availableInstances[instanceIndex % availableInstances.length]
        instanceIndex++

        const parseMessage = (text: string, leadName: string | null) => {
          // Replace placeholders
          let parsed = text.replace(/\{\{nome\}\}/gi, leadName || 'Amigo(a)')

          // Spintax {A|B|C}
          const spintaxRegex = /\{([^{}]+)\}/g
          let match
          while ((match = spintaxRegex.exec(parsed)) !== null) {
            const options = match[1].split('|')
            const randomOption = options[Math.floor(Math.random() * options.length)]
            parsed = parsed.replace(match[0], randomOption)
            spintaxRegex.lastIndex = 0
          }
          return parsed
        }

        const messageText = parseMessage(campaign.message_text, item.lead_name)

        // Simulated Wait Time - random delay based on campaign settings
        const delayMs =
          Math.floor(
            Math.random() * ((campaign.max_delay || 30) - (campaign.min_delay || 10) + 1) +
              (campaign.min_delay || 10),
          ) * 1000
        // console.log(`Waiting ${delayMs}ms before sending...`);

        // Mock Evolution API interaction. In a real scenario you would call evolution webhook
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
