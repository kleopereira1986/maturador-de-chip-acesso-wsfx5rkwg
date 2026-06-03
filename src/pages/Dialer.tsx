import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Phone, PhoneOff, User, Mic, AlertCircle, PhoneCall, PhoneIncoming } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { UserAgent, Registerer, Inviter, SessionState, RegistererState, Invitation } from 'sip.js'

export default function Dialer() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [isReady, setIsReady] = useState(false)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [targetNumber, setTargetNumber] = useState('')
  const [registrationStatus, setRegistrationStatus] = useState<
    'Disconnected' | 'Connecting' | 'Registered' | 'Error'
  >('Disconnected')

  const [userAgent, setUserAgent] = useState<UserAgent | null>(null)
  const [registerer, setRegisterer] = useState<Registerer | null>(null)
  const [session, setSession] = useState<Inviter | Invitation | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const setupRemoteMedia = (currentSession: Inviter | Invitation) => {
    currentSession.stateChange.addListener((state) => {
      console.log(`[SIP.js] Session state changed to ${state}`)

      if (state === SessionState.Established) {
        console.log('[SIP.js] Call accepted/established')
        setActiveCall((prev: any) => (prev ? { ...prev, status: 'CONECTADO' } : prev))
        const sessionDescriptionHandler = currentSession.sessionDescriptionHandler as any
        if (!sessionDescriptionHandler) return

        const pc = sessionDescriptionHandler.peerConnection
        if (pc) {
          const remoteStream = new MediaStream()
          pc.getReceivers().forEach((receiver: any) => {
            if (receiver.track) {
              remoteStream.addTrack(receiver.track)
            }
          })
          if (audioRef.current) {
            audioRef.current.srcObject = remoteStream
            audioRef.current.play().catch((e) => console.error('Audio play error:', e))
          }
        }
      } else if (state === SessionState.Terminated || state === SessionState.Rejected) {
        console.log('[SIP.js] Call bye/terminated')
        setActiveCall(null)
        setSession(null)
      }
    })
  }

  useEffect(() => {
    if (isReady && profile?.sip_extension && profile?.sip_password) {
      if (userAgent) return

      setRegistrationStatus('Connecting')

      const domain = profile.sip_domain || window.location.hostname
      const uri = UserAgent.makeURI(`sip:${profile.sip_extension}@${domain}`)

      if (!uri) {
        setRegistrationStatus('Error')
        toast({ title: 'Erro', description: 'URI SIP inválida.', variant: 'destructive' })
        setIsReady(false)
        return
      }

      const wssUrl = import.meta.env.VITE_RTC_WSS_URL || 'wss://rtc.imobixcrm.com/ws'

      try {
        const ua = new UserAgent({
          uri,
          transportOptions: {
            server: wssUrl,
          },
          authorizationUsername: profile.sip_extension,
          authorizationPassword: profile.sip_password,
          delegate: {
            onInvite: (invitation: Invitation) => {
              console.log('[SIP.js] Incoming call received (invite)')
              setSession(invitation)
              setActiveCall({
                leadName: 'Chamada Recebida',
                phone: invitation.remoteIdentity.uri.user || 'Desconhecido',
                status: 'RECEBENDO',
              })
              setupRemoteMedia(invitation)
            },
          },
        })

        const reg = new Registerer(ua)

        reg.stateChange.addListener((state) => {
          if (state === RegistererState.Registered) {
            console.log('[SIP.js] SIP Registered (registered)')
            setRegistrationStatus('Registered')
          } else if (state === RegistererState.Unregistered) {
            console.log('[SIP.js] SIP Unregistered (unregistered)')
            setRegistrationStatus('Disconnected')
          } else if (state === RegistererState.Terminated) {
            console.log('[SIP.js] SIP Terminated')
            setRegistrationStatus('Disconnected')
          }
        })

        ua.start()
          .then(() => {
            reg
              .register()
              .then(() => {
                console.log('[SIP.js] Registration successful')
              })
              .catch((e) => {
                console.error('[SIP.js] Registration failed (registrationFailed)', e)
                setRegistrationStatus('Error')
                toast({
                  title: 'Erro de Registro SIP',
                  description: 'Falha ao registrar com as credenciais fornecidas.',
                  variant: 'destructive',
                })
                setIsReady(false)
              })
          })
          .catch((e) => {
            console.error('[SIP.js] UA Start failed', e)
            setRegistrationStatus('Error')
            toast({
              title: 'Erro de Conexão SIP',
              description: 'Falha ao conectar ao servidor WebRTC. Verifique a URL WSS.',
              variant: 'destructive',
            })
            setIsReady(false)
          })

        setUserAgent(ua)
        setRegisterer(reg)
      } catch (err) {
        console.error('[SIP.js] Setup error:', err)
        setRegistrationStatus('Error')
        setIsReady(false)
      }
    } else if (!isReady && userAgent) {
      if (registerer) {
        registerer.unregister().finally(() => {
          userAgent.stop().finally(() => {
            setUserAgent(null)
            setRegisterer(null)
          })
        })
      } else {
        userAgent.stop().finally(() => {
          setUserAgent(null)
        })
      }
      setRegistrationStatus('Disconnected')
    }
  }, [isReady, profile, toast, userAgent, registerer])

  useEffect(() => {
    return () => {
      if (userAgent) {
        userAgent.stop()
      }
    }
  }, [userAgent])

  useEffect(() => {
    let interval: any
    if (activeCall && activeCall.status === 'CONECTADO') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => clearInterval(interval)
  }, [activeCall])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const initiateCall = async () => {
    if (!targetNumber || !userAgent) return

    try {
      const domain = profile?.sip_domain || window.location.hostname
      const targetURI = UserAgent.makeURI(`sip:${targetNumber}@${domain}`)
      if (!targetURI) throw new Error('Número de destino inválido')

      const inviter = new Inviter(userAgent, targetURI, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
        },
      })

      setupRemoteMedia(inviter)

      await inviter.invite()
      setSession(inviter)

      setActiveCall({
        leadName: 'Chamada Saínte',
        phone: targetNumber,
        status: 'CONECTANDO',
      })
    } catch (e: any) {
      console.error('[SIP.js] Call initiation failed:', e)
      toast({
        title: 'Erro ao chamar',
        description: e.message || 'Falha ao iniciar chamada',
        variant: 'destructive',
      })
    }
  }

  const acceptCall = async () => {
    if (session && session instanceof Invitation) {
      try {
        await session.accept({
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
          },
        })
      } catch (e: any) {
        console.error('[SIP.js] Error accepting call:', e)
        toast({ title: 'Erro', description: 'Falha ao atender chamada.', variant: 'destructive' })
      }
    }
  }

  const endCall = () => {
    if (session) {
      if (session.state === SessionState.Established) {
        session.bye()
      } else if (
        session.state === SessionState.Initial ||
        session.state === SessionState.Establishing
      ) {
        if (session instanceof Inviter) {
          session.cancel()
        } else if (session instanceof Invitation) {
          session.reject()
        }
      }
    }
    setActiveCall(null)
    setSession(null)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Discador SIP (WebRTC)
          </h1>
          <p className="text-slate-500">Faça e receba chamadas diretamente no navegador.</p>
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
                  administrador.
                </AlertDescription>
              </Alert>
            ) : !activeCall ? (
              <div className="text-center space-y-6 w-full max-w-sm">
                <div
                  className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center transition-colors ${isReady && registrationStatus === 'Registered' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Phone
                    className={`h-10 w-10 ${isReady && registrationStatus === 'Registered' ? 'animate-pulse' : ''}`}
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-slate-500 text-sm">
                    {isReady
                      ? registrationStatus === 'Registered'
                        ? 'Pronto para fazer ou receber chamadas.'
                        : 'Conectando ramal SIP...'
                      : 'Fique online para utilizar o discador.'}
                  </p>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Número de destino"
                      value={targetNumber}
                      onChange={(e) => setTargetNumber(e.target.value)}
                      disabled={!isReady || registrationStatus !== 'Registered'}
                      className="text-center text-lg"
                    />
                    <Button
                      onClick={initiateCall}
                      disabled={!isReady || registrationStatus !== 'Registered' || !targetNumber}
                      className="bg-green-600 hover:bg-green-700 w-16"
                    >
                      <PhoneCall className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center w-full space-y-6">
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-full inline-block font-mono font-bold text-xl mb-4 animate-pulse">
                  {activeCall.status === 'CONECTADO' ? formatTime(callDuration) : activeCall.status}
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-slate-900">{activeCall.leadName}</h3>
                  <p className="text-xl text-slate-600 font-mono">{activeCall.phone}</p>
                </div>

                <div className="flex justify-center gap-4 mt-8">
                  {activeCall.status === 'RECEBENDO' && (
                    <Button
                      variant="default"
                      size="lg"
                      className="rounded-full h-16 w-16 p-0 shadow-lg bg-green-500 hover:bg-green-600"
                      onClick={acceptCall}
                    >
                      <PhoneIncoming className="h-6 w-6" />
                    </Button>
                  )}
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
          <audio ref={audioRef} autoPlay />
        </Card>

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
              <div className="flex items-center justify-center h-full min-h-[250px] text-slate-400 text-center px-6 border-2 border-dashed rounded-lg bg-slate-50">
                Aguardando conexão ou inicie uma chamada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
