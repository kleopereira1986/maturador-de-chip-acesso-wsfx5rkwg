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

  let reqBody: any = {}
  try {
    if (req.body) {
      reqBody = await req.json()
    }
  } catch (e) {
    console.warn('Could not parse request body')
  }

  try {
    const { data: config } = await supabase
      .from('configuracoes_api')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (!config || !config.url_servidor) {
      console.warn('API config not found')
      return new Response(JSON.stringify({ message: 'API config not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let campaignsQuery = supabase.from('campaigns').select('*').eq('status', 'DISPARANDO')

    if (reqBody?.campaign_id) {
      campaignsQuery = campaignsQuery.eq('id', reqBody.campaign_id)
    }

    const { data: campaigns } = await campaignsQuery

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

    let totalProcessed = 0
    let hasMore = false

    for (const campaign of campaigns) {
      const { data: checkCamp } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', campaign.id)
        .single()
      if (checkCamp?.status !== 'DISPARANDO') continue

      let availableInstances = instances
      if (campaign.instance_ids && campaign.instance_ids.length > 0) {
        availableInstances = instances.filter((i: any) => campaign.instance_ids.includes(i.id))
      }

      if (availableInstances.length === 0) {
        console.warn(`No matching connected instances for campaign ${campaign.name}`)
        continue
      }

      // Atomically fetch and lock up to 20 queue items to prevent race conditions
      const { data: queue, error: lockError } = await supabase.rpc('lock_and_get_queue', {
        p_campaign_id: campaign.id,
        p_limit: 20,
      })

      if (lockError) {
        console.error('Queue lock error:', lockError)
        continue
      }

      if (!queue || queue.length === 0) {
        const { count } = await supabase
          .from('dispatch_queue')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .in('status', ['PENDING', 'PROCESSING'])
        if (count === 0) {
          await supabase.from('campaigns').update({ status: 'CONCLUIDO' }).eq('id', campaign.id)
        }
        continue
      }

      if (queue.length === 20) {
        hasMore = true
      }

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]
        const instance = availableInstances[i % availableInstances.length]

        const parseMessage = (text: string, leadName: string | null) => {
          let parsed = text.replace(/\{\{nome\}\}/gi, leadName || 'Amigo(a)')
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

        // Automated Phone Cleaning
        let cleanPhone = item.phone.replace(/\D/g, '')
        if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
          cleanPhone = '55' + cleanPhone
        }

        let evolutionEndpoint = ''
        let payload: any = {}
        const delayMs =
          Math.floor(
            Math.random() * ((campaign.max_delay || 30) - (campaign.min_delay || 10) + 1) +
              (campaign.min_delay || 10),
          ) * 1000

        if (campaign.media_type === 'TEXT') {
          evolutionEndpoint = `/message/sendText/${instance.name}`
          payload = {
            number: cleanPhone,
            text: messageText,
            delay: delayMs,
          }
        } else {
          evolutionEndpoint = `/message/sendMedia/${instance.name}`
          let mediatype = 'image'
          let mimetype = 'image/jpeg'

          if (campaign.media_type === 'VIDEO') {
            mediatype = 'video'
            mimetype = 'video/mp4'
          } else if (campaign.media_type === 'AUDIO') {
            mediatype = 'audio'
            mimetype = 'audio/mpeg'
          }

          payload = {
            number: cleanPhone,
            mediatype: mediatype,
            mimetype: mimetype,
            media: campaign.media_url,
            caption: messageText,
            delay: delayMs,
          }
        }

        try {
          const res = await fetch(`${config.url_servidor}${evolutionEndpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: config.global_api_key || instance.token,
            },
            body: JSON.stringify(payload),
          })

          if (res.status === 200 || res.status === 201) {
            await supabase
              .from('dispatch_queue')
              .update({ status: 'SENT', instance_id: instance.id, phone: cleanPhone })
              .eq('id', item.id)
          } else {
            const errorData = await res.text()
            await supabase
              .from('dispatch_queue')
              .update({
                status: 'ERROR',
                error_message: `API Error ${res.status}: ${errorData}`,
                phone: cleanPhone,
              })
              .eq('id', item.id)
            console.error(`Evolution API Error for ${cleanPhone}:`, errorData)
          }
        } catch (err: any) {
          await supabase
            .from('dispatch_queue')
            .update({
              status: 'ERROR',
              error_message: `Fetch Error: ${err.message}`,
              phone: cleanPhone,
            })
            .eq('id', item.id)
          console.error(`Fetch Error for ${cleanPhone}:`, err)
        }
        totalProcessed++
      }
    }

    if (hasMore) {
      // Trigger next batch asynchronously to continue processing large queues
      fetch(`${supabaseUrl}/functions/v1/dispatch-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqBody?.campaign_id
          ? JSON.stringify({ campaign_id: reqBody.campaign_id })
          : undefined,
      }).catch(console.error)
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Dispatch worker error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
