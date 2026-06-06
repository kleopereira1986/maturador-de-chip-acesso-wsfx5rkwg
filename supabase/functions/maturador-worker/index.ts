import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: config } = await supabase.from('maturador_configs').select('*').limit(1).single()
    if (!config || !config.is_active) {
      return new Response(
        JSON.stringify({ message: 'Maturador process is inactive or not configured.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: instances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('status', 'CONECTADO')
      .eq('is_maturador_active', true)

    if (!instances || instances.length < 2) {
      return new Response(
        JSON.stringify({ message: 'Need at least 2 active instances to run maturador loop.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Logic: Pick two random distinct instances
    const inst1 = instances[Math.floor(Math.random() * instances.length)]
    let inst2 = instances[Math.floor(Math.random() * instances.length)]

    // Ensure they are distinct
    while (inst2.id === inst1.id) {
      inst2 = instances[Math.floor(Math.random() * instances.length)]
    }

    const phrases = config.dialogue_tree?.phrases || ['Oi', 'Tudo bem?', 'Como vai?']

    // Pick a random phrase
    let phrase = phrases[Math.floor(Math.random() * phrases.length)]

    // Spintax parsing support
    const spintaxRegex = /\{([^{}]+)\}/g
    let match
    while ((match = spintaxRegex.exec(phrase)) !== null) {
      const options = match[1].split('|')
      const randomOption = options[Math.floor(Math.random() * options.length)]
      phrase = phrase.replace(match[0], randomOption)
      spintaxRegex.lastIndex = 0
    }

    // Logging the simulated action: instance1 sends message to instance2
    console.log(
      `[MATURADOR-WORKER] Interaction simulated: [${inst1.name}] -> [${inst2.name}]: "${phrase}"`,
    )

    const { data: apiConfig } = await supabase
      .from('configuracoes_api')
      .select('*')
      .limit(1)
      .single()
    if (!apiConfig || !apiConfig.url_servidor) {
      return new Response(JSON.stringify({ message: 'API config not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Evolution API to dispatch the WhatsApp message to inst2 phone number using inst1 token.
    let inst2Phone = inst2.name.replace(/\D/g, '')
    // Assuming instance names sometimes contain the phone number, or we need an actual phone
    // If instance name doesn't contain a phone, this might fail unless Evolution resolves it.
    // Ideally we should know inst2's phone. For now we use the digits in its name as a fallback.
    if (inst2Phone.length >= 10 && !inst2Phone.startsWith('55')) inst2Phone = '55' + inst2Phone

    try {
      if (inst2Phone.length >= 10) {
        console.log(`[Maturador Worker] Sending message via ${inst1.name} to ${inst2Phone}`)
        await fetch(`${apiConfig.url_servidor}/message/sendText/${inst1.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiConfig.global_api_key,
          },
          body: JSON.stringify({
            number: inst2Phone,
            textMessage: { text: phrase },
            options: { delay: 1000, presence: 'composing' },
          }),
        })
      }
    } catch (e: any) {
      console.error('Failed to send maturador message:', e.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Interaction successfully simulated',
        data: { from: inst1.name, to: inst2.name, phrase },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
