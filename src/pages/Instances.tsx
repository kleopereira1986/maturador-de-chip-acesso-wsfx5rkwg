import { useState, useEffect } from 'react'
import { instancesService } from '@/services/instances'
import { WhatsappInstance } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Smartphone, Loader2, QrCode, Settings, Webhook } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export default function Instances() {
  const { profile } = useAuth()
  const canManageConfig = profile?.role === 'master' || profile?.role === 'gerente'

  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrBase64, setQrBase64] = useState('')
  const [pollingInstance, setPollingInstance] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [name, setName] = useState('')

  const [urlServidor, setUrlServidor] = useState('https://api.primaziainvestimentos.com')
  const [globalApiKey, setGlobalApiKey] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConfiguringWebhooks, setIsConfiguringWebhooks] = useState(false)

  const { toast } = useToast()

  const fetchInstances = async () => {
    try {
      const data = await instancesService.getInstances()
      setInstances(data)
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar instâncias', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const config = await instancesService.getConfig()
      if (config) {
        setUrlServidor(config.url_servidor)
        setGlobalApiKey(config.global_api_key)
      }
    } catch {
      // Ignorar erro se não houver config
    }
  }

  useEffect(() => {
    fetchInstances()
    loadConfig()

    const channel = supabase
      .channel('whatsapp_instances_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instances' }, () => {
        fetchInstances()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (qrModalOpen && pollingInstance && urlServidor && globalApiKey) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${urlServidor}/instance/connectionState/${pollingInstance}`, {
            headers: { apikey: globalApiKey },
          })
          if (res.ok) {
            const data = await res.json()
            if (data?.instance?.state === 'open') {
              setQrModalOpen(false)
              setPollingInstance(null)
              toast({ title: 'Sucesso', description: 'Instância conectada com sucesso!' })
              fetchInstances()
            }
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error)
        }
      }, 5000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [qrModalOpen, pollingInstance, urlServidor, globalApiKey, toast])

  const generateToken = () =>
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const handleCreate = async () => {
    if (!urlServidor || !globalApiKey) {
      toast({
        title: 'Aviso',
        description: 'Configure a API Global primeiro nas Configurações.',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const token = generateToken()
      const instanceNameWithoutSpaces = name.replace(/\s+/g, '-')

      const createRes = await fetch(`${urlServidor}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: globalApiKey,
        },
        body: JSON.stringify({
          instanceName: instanceNameWithoutSpaces,
          token: token,
          qrcode: true,
        }),
      })

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => null)
        throw new Error(
          errData?.response?.message?.[0] || 'Falha ao criar instância na API Evolution',
        )
      }

      const createData = await createRes.json()

      await instancesService.createInstance(instanceNameWithoutSpaces, token)

      toast({ title: 'Sucesso', description: 'Instância criada' })
      setName('')
      setIsModalOpen(false)

      if (createData.qrcode && createData.qrcode.base64) {
        setQrBase64(createData.qrcode.base64)
        setPollingInstance(instanceNameWithoutSpaces)
        setQrModalOpen(true)
      }

      fetchInstances()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleConnectExisting = async (instanceName: string) => {
    if (!urlServidor || !globalApiKey) {
      toast({
        title: 'Aviso',
        description: 'Configure a API Global primeiro nas Configurações.',
        variant: 'destructive',
      })
      return
    }
    try {
      toast({ title: 'Conectando...', description: 'Solicitando QR Code...' })
      const res = await fetch(`${urlServidor}/instance/connect/${instanceName}`, {
        headers: { apikey: globalApiKey },
      })
      if (!res.ok) throw new Error('Falha ao conectar')
      const data = await res.json()

      if (data.base64) {
        setQrBase64(data.base64)
        setPollingInstance(instanceName)
        setQrModalOpen(true)
      } else if (data.instance?.state === 'open') {
        toast({ title: 'Aviso', description: 'Esta instância já está conectada.' })
      } else {
        throw new Error('QR Code não retornado pela API.')
      }
    } catch (e: any) {
      toast({
        title: 'Erro na API WhatsApp',
        description: e.message || 'Servidor Evolution API inacessível.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string, instanceName: string) => {
    try {
      if (urlServidor && globalApiKey) {
        await fetch(`${urlServidor}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { apikey: globalApiKey },
        }).catch(() => null)
      }

      await instancesService.deleteInstance(id)
      fetchInstances()
    } catch {
      toast({ title: 'Erro', description: 'Erro ao excluir instância', variant: 'destructive' })
    }
  }

  const handleConfigureWebhooks = async () => {
    if (!urlServidor || !globalApiKey) {
      toast({
        title: 'Aviso',
        description: 'Configure a API Global primeiro nas Configurações.',
        variant: 'destructive',
      })
      return
    }

    setIsConfiguringWebhooks(true)
    let successCount = 0
    let errorCount = 0

    for (const instance of instances) {
      try {
        await instancesService.configureWebhook(urlServidor, globalApiKey, instance.name)
        successCount++
      } catch (error: any) {
        errorCount++
        toast({
          title: `Erro em ${instance.name}`,
          description: error.message || 'Falha ao configurar webhook',
          variant: 'destructive',
        })
      }
    }

    setIsConfiguringWebhooks(false)

    if (successCount > 0) {
      toast({
        title: 'Concluído',
        description: `Webhooks configurados com sucesso em ${successCount} instância(s).`,
      })
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await instancesService.syncInstances(urlServidor, globalApiKey)
      toast({
        title: 'Sucesso',
        description: res.message || 'Conexão estabelecida e instâncias sincronizadas com sucesso!',
      })
      setIsConfigModalOpen(false)
      fetchInstances()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao sincronizar',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONECTADO':
      case 'CONNECTED':
        return <Badge className="bg-green-500">Conectado</Badge>
      case 'DESCONECTADO':
      case 'DISCONNECTED':
        return <Badge className="bg-red-500">Desconectado</Badge>
      case 'PAUSADO':
        return <Badge className="bg-yellow-500">Pausado</Badge>
      case 'CONECTANDO':
        return <Badge className="bg-blue-500 animate-pulse">Conectando...</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Instâncias WhatsApp</h1>
          <p className="text-slate-500">Gerencie suas conexões da Evolution API.</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
          {canManageConfig && (
            <>
              <Button
                variant="outline"
                onClick={handleConfigureWebhooks}
                disabled={isConfiguringWebhooks || instances.length === 0}
              >
                {isConfiguringWebhooks ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Webhook className="mr-2 h-4 w-4" />
                )}
                Configurar Webhooks
              </Button>
              <Button variant="outline" onClick={() => setIsConfigModalOpen(true)}>
                <Settings className="mr-2 h-4 w-4" /> Configurações Globais API
              </Button>
            </>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Instância
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : instances.length === 0 ? (
          <div className="col-span-full flex justify-center py-10 text-slate-500">
            Nenhuma instância cadastrada.
          </div>
        ) : (
          instances.map((instance) => (
            <Card key={instance.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-slate-500" />
                    {instance.name}
                  </div>
                </CardTitle>
                {getStatusBadge(instance.status)}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnectExisting(instance.name)}
                  >
                    <QrCode className="mr-2 h-4 w-4" /> Conectar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(instance.id, instance.name)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância</DialogTitle>
            <DialogDescription>Digite um nome para criar a nova instância.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Instância</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Chip Comercial 01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name || isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar Instância</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code abaixo com seu WhatsApp para conectar a instância {pollingInstance}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {qrBase64 ? (
              <img
                src={
                  qrBase64.startsWith('data:image') ? qrBase64 : `data:image/png;base64,${qrBase64}`
                }
                alt="QR Code do WhatsApp"
                className="w-64 h-64 rounded-md border p-2"
              />
            ) : (
              <div className="flex items-center justify-center w-64 h-64 bg-slate-100 rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
            <div className="flex items-center text-sm text-slate-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando leitura do QR Code...
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQrModalOpen(false)
                setPollingInstance(null)
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações Globais API</DialogTitle>
            <DialogDescription>
              Configure as credenciais da Evolution API para sincronizar instâncias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL do Servidor</label>
              <Input
                value={urlServidor}
                onChange={(e) => setUrlServidor(e.target.value)}
                placeholder="https://api.primaziainvestimentos.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Global API Key</label>
              <Input
                value={globalApiKey}
                onChange={(e) => setGlobalApiKey(e.target.value)}
                placeholder="Insira a API Key"
                type="password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigModalOpen(false)}
              disabled={isSyncing}
            >
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={!urlServidor || !globalApiKey || isSyncing}>
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar e Sincronizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
