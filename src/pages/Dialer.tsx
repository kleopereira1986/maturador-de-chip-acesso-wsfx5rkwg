import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Phone, PhoneOff, User, Mic } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Dialer() {
  const { profile } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [callDuration, setCallDuration] = useState(0)

  // WebRTC Simulator (mocking Asterisk Bridge)
  useEffect(() => {
    let interval: any
    if (isReady && !activeCall) {
      // Simulate incoming bridged call
      const timer = setTimeout(() => {
        setActiveCall({
          leadName: 'João da Silva',
          phone: '+55 11 99999-9999',
          status: 'CONNECTED',
        })
      }, 5000)
      return () => clearTimeout(timer)
    }

    if (activeCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }

    return () => clearInterval(interval)
  }, [isReady, activeCall])

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
          <Switch checked={isReady} onCheckedChange={setIsReady} disabled={!!activeCall} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Softphone Panel */}
        <Card
          className={`border-2 transition-all duration-300 ${activeCall ? 'border-primary ring-4 ring-primary/20' : 'border-slate-200'}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Softphone WebRTC
            </CardTitle>
            <CardDescription>Conectado ao Asterisk via wss:// :8089</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 min-h-[300px]">
            {!activeCall ? (
              <div className="text-center space-y-4">
                <div
                  className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center transition-colors ${isReady ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Phone className={`h-10 w-10 ${isReady ? 'animate-pulse' : ''}`} />
                </div>
                <p className="text-slate-500">
                  {isReady
                    ? 'Aguardando distribuição pelo Preditivo...'
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
