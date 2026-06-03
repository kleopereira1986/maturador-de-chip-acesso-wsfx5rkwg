import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Phone, PhoneOff, User, Mic, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function Dialer() {
  const { profile } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [registrationStatus, setRegistrationStatus] = useState<
    'Disconnected' | 'Connecting' | 'Registered' | 'Error'
  >('Disconnected')

  // WebRTC Simulator (mocking Asterisk Bridge)
  useEffect(() => {
    let interval: any
    let ws: WebSocket | null = null
    let timer: any

    if (isReady && !activeCall && profile?.sip_extension && profile?.sip_password) {
      setRegistrationStatus('Connecting')

      try {
        const wssUrl = import.meta.env.VITE_RTC_WSS_URL || 'wss://rtc.imobixcrm.com:8089'
        ws = new WebSocket(wssUrl)

        ws.onopen = () => {
          console.log('Connected to Asterisk WebRTC (WSS)')

          // Send SIP credentials (mock)
          ws?.send(
            JSON.stringify({
              action: 'register',
              extension: profile.sip_extension,
              password: profile.sip_password,
              domain: profile.sip_domain,
            }),
          )

          setRegistrationStatus('Registered')
        }

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          if (data.event === 'incoming_call') {
            setActiveCall({
              leadName: data.leadName || 'Cliente Desconhecido',
              phone: data.phone || '0000000000',
              status: 'CONECTADO',
            })
          }
        }

        ws.onerror = () => {
          console.warn('Asterisk WSS Connection Failed, falling back to mock simulator.')
          setRegistrationStatus('Error')

          // Fallback to registered for UI demonstration purposes
          setTimeout(() => setRegistrationStatus('Registered'), 1000)
        }

        ws.onclose = () => {
          setRegistrationStatus('Disconnected')
        }
      } catch (e) {
        console.warn('Invalid WSS URL', e)
        setRegistrationStatus('Error')
        setTimeout(() => setRegistrationStatus('Registered'), 1000)
      }

      // Simulate incoming bridged call fallback if WSS doesn't provide one
      timer = setTimeout(() => {
        if (!activeCall && isReady) {
          setActiveCall({
            leadName: 'João da Silva',
            phone: '+55 11 99999-9999',
            status: 'CONECTADO',
          })
        }
      }, 5000)
    } else if (!isReady) {
      setRegistrationStatus('Disconnected')
    }

    if (activeCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      if (ws) {
        ws.close()
      }
    }
  }, [isReady, activeCall, profile])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const endCall = () => {
    setActiveCall(null)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Discador Preditivo</h1>
          <p className="text-slate-500">Painel do Corretor / WebRTC Asterisk</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm px-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}
            />
            <span className="font-medium text-sm">
              {isReady ? 'Disponível para Chamadas' : 'Pausado'}
            </span>
          </div>
          <Switch
            checked={isReady}
            onCheckedChange={setIsReady}
            disabled={!!activeCall || !profile?.sip_extension || !profile?.sip_password}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Softphone Panel */}
        <Card
          className={`border-2 transition-all duration-300 ${activeCall ? 'border-primary ring-4 ring-primary/20' : 'border-slate-200'}`}
        >
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Softphone WebRTC
              </div>
              <div className="flex items-center gap-2 text-sm font-normal">
                {registrationStatus === 'Registered' && (
                  <span className="flex h-2 w-2 rounded-full bg-green-500" />
                )}
                {registrationStatus === 'Connecting' && (
                  <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                )}
                {registrationStatus === 'Error' && (
                  <span className="flex h-2 w-2 rounded-full bg-red-500" />
                )}
                {registrationStatus === 'Disconnected' && (
                  <span className="flex h-2 w-2 rounded-full bg-slate-300" />
                )}
                <span className="text-slate-500 capitalize">{registrationStatus}</span>
              </div>
            </CardTitle>
            <CardDescription>
              {profile?.sip_extension
                ? `Ramal SIP: ${profile.sip_extension} @ ${profile.sip_domain || 'local'}`
                : 'Sem credenciais SIP configuradas'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 min-h-[300px]">
            {!profile?.sip_extension || !profile?.sip_password ? (
              <Alert variant="destructive" className="max-w-sm w-full text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Credenciais SIP Ausentes</AlertTitle>
                <AlertDescription>
                  Seu perfil não possui credenciais SIP configuradas. Solicite as credenciais ao
                  administrador para receber chamadas.
                </AlertDescription>
              </Alert>
            ) : !activeCall ? (
              <div className="text-center space-y-4">
                <div
                  className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center transition-colors ${isReady && registrationStatus === 'Registered' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Phone
                    className={`h-10 w-10 ${isReady && registrationStatus === 'Registered' ? 'animate-pulse' : ''}`}
                  />
                </div>
                <p className="text-slate-500">
                  {isReady
                    ? registrationStatus === 'Registered'
                      ? 'Aguardando distribuição pelo Preditivo...'
                      : 'Conectando ramal SIP...'
                    : 'Fique online para receber chamadas.'}
                </p>
              </div>
            ) : (
              <div className="text-center w-full space-y-6">
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-full inline-block font-mono font-bold text-xl mb-4 animate-pulse">
                  {formatTime(callDuration)}
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-slate-900">{activeCall.leadName}</h3>
                  <p className="text-xl text-slate-600 font-mono">{activeCall.phone}</p>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="rounded-full h-16 w-16 p-0 shadow-lg"
                    onClick={endCall}
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Info Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ficha do Cliente
            </CardTitle>
            <CardDescription>Informações injetadas automaticamente no atendimento</CardDescription>
          </CardHeader>
          <CardContent>
            {activeCall ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Nome</p>
                    <p className="font-medium text-slate-900">{activeCall.leadName}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Telefone</p>
                    <p className="font-medium text-slate-900 font-mono">{activeCall.phone}</p>
                  </div>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-500 uppercase font-semibold mb-2">
                    Script Sugerido
                  </p>
                  <p className="text-sm text-slate-700 italic">
                    "Olá {activeCall.leadName}, meu nome é {profile?.full_name}, sou da área de
                    qualidade, tudo bem? Notamos um interesse na nossa campanha e gostaria de
                    repassar as condições exclusivas..."
                  </p>
                </div>
                <div className="space-y-2 pt-4">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Qualificar Lead (Venda)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                  >
                    Não Tem Interesse
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[250px] text-slate-400">
                Aguardando conexão para exibir os dados do cliente.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
