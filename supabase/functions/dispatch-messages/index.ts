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
    let hasMoreOverall = false
    const startTime = Date.now()
    const MAX_EXECUTION_TIME = 45000 // Limit execution to 45 seconds to avoid worker timeout

    for (const campaign of campaigns) {
      let hasMoreInCampaign = true

      while (hasMoreInCampaign && Date.now() - startTime < MAX_EXECUTION_TIME) {
        const { data: checkCamp } = await supabase
          .from('campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single()
        if (checkCamp?.status !== 'DISPARANDO') {
          hasMoreInCampaign = false
          break
        }

        let availableInstances = instances
        if (campaign.instance_ids && campaign.instance_ids.length > 0) {
          availableInstances = instances.filter((i: any) => campaign.instance_ids.includes(i.id))
        }

        if (availableInstances.length === 0) {
          console.warn(`No matching connected instances for campaign ${campaign.name}`)
          hasMoreInCampaign = false
          break
        }

        // Atomically fetch and lock up to 20 queue items to prevent race conditions
        const { data: queue, error: lockError } = await supabase.rpc('lock_and_get_queue', {
          p_campaign_id: campaign.id,
          p_limit: 20,
        })

        if (lockError) {
          console.error('Queue lock error:', lockError)
          hasMoreInCampaign = false
          break
        }

        if (!queue || queue.length === 0) {
          hasMoreInCampaign = false
          const { count } = await supabase
            .from('dispatch_queue')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['PENDING', 'PROCESSING'])
          if (count === 0) {
            await supabase.from('campaigns').update({ status: 'CONCLUIDO' }).eq('id', campaign.id)
          }
          break
        }

        for (let i = 0; i < queue.length; i++) {
          const item = queue[i]
          const instance = availableInstances[i % availableInstances.length]

          const parseMessage = (text: string, leadName: string | null) => {
            let parsed = text
              .replace(/\{\{nome\}\}/gi, leadName || 'Cliente')
              .replace(/\{nome\}/gi, leadName || 'Cliente')
            const spintaxRegex = /\{([^{}]+)\}/g
            let match
            while ((match = spintaxRegex.exec(parsed)) !== null) {
              const options = match[1].split('|')
              const randomOption = options[Math.floor(Math.random() * options.length)]
              parsed = parsed.replace(match[0], randomOption)
              spintaxRegex.lastIndex = 0
            }
            return parsed.trim()
          }

          const messageText = parseMessage(campaign.message_text, item.lead_name)

          if (!messageText) {
            await supabase
              .from('dispatch_queue')
              .update({
                status: 'ERROR',
                error_message: JSON.stringify({ error: 'Mensagem vazia após processamento' }),
              })
              .eq('id', item.id)
            totalProcessed++
            continue
          }

          // Automated Phone Cleaning
          let cleanPhone = item.phone.replace(/\D/g, '')
          if (!cleanPhone.startsWith('55')) {
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
              textMessage: { text: messageText },
              options: { delay: delayMs, presence: 'composing' },
            }
          } else {
            if (!campaign.media_url || campaign.media_url.trim() === '') {
              await supabase
                .from('dispatch_queue')
                .update({
                  status: 'ERROR',
                  error_message: JSON.stringify({ error: 'URL de mídia ausente' }),
                  phone: cleanPhone,
                })
                .eq('id', item.id)
              totalProcessed++
              continue
            }

            evolutionEndpoint = `/message/sendMedia/${instance.name}`
            let mediaType = 'image'

            if (campaign.media_type === 'VIDEO') mediaType = 'video'
            else if (campaign.media_type === 'AUDIO') mediaType = 'audio'
            else if (campaign.media_type === 'DOCUMENT') mediaType = 'document'

            payload = {
              number: cleanPhone,
              options: { delay: delayMs, presence: 'composing' },
              mediaMessage: {
                mediatype: mediaType,
                media: campaign.media_url,
                caption: messageText,
              },
            }
          }

          try {
            console.log(`[Campaign Dispatch] Sending message via ${instance.name} to ${cleanPhone}`)
            const res = await fetch(`${config.url_servidor}${evolutionEndpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: config.global_api_key,
              },
              body: JSON.stringify(payload),
            })

            if (res.status === 200 || res.status === 201) {
              await supabase
                .from('dispatch_queue')
                .update({ status: 'SENT', instance_id: instance.id, phone: cleanPhone })
                .eq('id', item.id)
            } else {
              const errorText = await res.text()
              let errorData = errorText
              try {
                errorData = JSON.stringify(JSON.parse(errorText))
              } catch (e) {}
              await supabase
                .from('dispatch_queue')
                .update({ status: 'ERROR', error_message: errorData, phone: cleanPhone })
                .eq('id', item.id)
            }
          } catch (err: any) {
            await supabase
              .from('dispatch_queue')
              .update({
                status: 'ERROR',
                error_message: JSON.stringify({ error: 'Fetch Error', message: err.message }),
                phone: cleanPhone,
              })
              .eq('id', item.id)
          }
          totalProcessed++
        }
      }

      if (hasMoreInCampaign) {
        hasMoreOverall = true
      }
    }

    if (hasMoreOverall) {
      // Trigger next batch asynchronously to continue processing large queues
      fetch(`${supabaseUrl}/functions/v1/dispatch-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: reqBody?.campaign_id
          ? JSON.stringify({ campaign_id: reqBody.campaign_id })
          : undefined,
      }).catch(console.error)
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed, hasMore: hasMoreOverall }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Dispatch worker error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
