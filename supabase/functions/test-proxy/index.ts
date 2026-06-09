import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import fetch from 'npm:node-fetch@2.7.0'
import { HttpsProxyAgent } from 'npm:https-proxy-agent@7.0.2'

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
    const { host, port, username, password } = await req.json()

    if (!host || !port) {
      return new Response(JSON.stringify({ error: 'Host and port are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const proxyUrl =
      username && password
        ? `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`
        : `http://${host}:${port}`

    const agent = new HttpsProxyAgent(proxyUrl)

    // Using node-fetch with https-proxy-agent to route request through the proxy
    const response = await fetch('https://api.ipify.org?format=json', {
      agent,
      timeout: 10000,
    } as any)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - Falha ao conectar pelo proxy`)
    }

    const data: any = await response.json()

    return new Response(JSON.stringify({ success: true, ip: data.ip }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Proxy test error:', error)
    let errorMessage = error.message || 'Falha na Autenticação ou Host Inalcançável'
    let errorCode = 'UNKNOWN_ERROR'

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      errorMessage = 'Não foi possível alcançar o Host do Proxy.'
      errorCode = 'HOST_ERROR'
    } else if (
      errorMessage.includes('407') ||
      errorMessage.includes('Proxy Authentication Required')
    ) {
      errorMessage = 'Usuário ou Senha do Proxy incorretos.'
      errorCode = 'AUTH_ERROR'
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      errorMessage = 'Não foi possível alcançar o Host do Proxy.'
      errorCode = 'HOST_ERROR'
    } else {
      errorMessage = 'A Evolution API não respondeu através deste Proxy.'
      errorCode = 'API_ERROR'
    }

    return new Response(JSON.stringify({ error: errorMessage, code: errorCode }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
