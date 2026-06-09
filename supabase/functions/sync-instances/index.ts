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

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const body = await req.json()
    const { url_servidor, global_api_key } = body

    if (!url_servidor || !global_api_key) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let fetchRes
    try {
      fetchRes = await fetch(`${url_servidor}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          apikey: global_api_key,
        },
      })
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: 'Falha ao conectar no servidor. Verifique a URL.' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (fetchRes.status === 401 || fetchRes.status === 404) {
      return new Response(
        JSON.stringify({ error: 'Erro de autenticação. Verifique a Global API Key inserida.' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!fetchRes.ok) {
      let errorMsg = `API retornou erro ${fetchRes.status}`
      try {
        const errData = await fetchRes.json()
        errorMsg = errData?.response?.message?.[0] || errData?.message || errData?.error || errorMsg
      } catch (e) {}
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const instances = await fetchRes.json()
    const instancesArray = Array.isArray(instances) ? instances : []

    const { data: existingConfig } = await supabase
      .from('configuracoes_api')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existingConfig) {
      await supabase
        .from('configuracoes_api')
        .update({
          url_servidor,
          global_api_key,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
    } else {
      await supabase.from('configuracoes_api').insert({
        url_servidor,
        global_api_key,
      })
    }

    const { data: existingInstances } = await supabase.from('whatsapp_instances').select('id, name')
    const existingMap = new Map((existingInstances || []).map((i) => [i.name, i.id]))

    for (const inst of instancesArray) {
      const instanceName = inst.instance?.instanceName || inst.name
      const token = inst.instance?.token || inst.token || global_api_key
      const status = inst.instance?.status || inst.status || 'CONECTADO'

      let finalStatus = 'DESCONECTADO'
      if (status === 'open' || status === 'CONECTADO') finalStatus = 'CONECTADO'
      else if (status === 'connecting' || status === 'PAUSADO') finalStatus = 'PAUSADO'

      if (!instanceName) continue

      const updatePayload: any = {
        token: token,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      }
      if (finalStatus === 'CONECTADO') {
        updatePayload.last_error = null
      }

      if (existingMap.has(instanceName)) {
        await supabase
          .from('whatsapp_instances')
          .update(updatePayload)
          .eq('id', existingMap.get(instanceName))
      } else {
        await supabase.from('whatsapp_instances').insert({
          name: instanceName,
          token: token,
          status: finalStatus,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conexão estabelecida e instâncias sincronizadas com sucesso!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
