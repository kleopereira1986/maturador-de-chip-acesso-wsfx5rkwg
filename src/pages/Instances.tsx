import { useState, useEffect } from 'react'
import { instancesService } from '@/services/instances'
import { WhatsappInstance } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Smartphone,
  Loader2,
  QrCode,
  Settings,
  Webhook,
  ShieldCheck,
  Monitor,
  Eye,
  EyeOff,
  Network,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { USER_AGENT_PRESETS, buildProxyString } from '@/lib/constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Instances() {
  const { profile } = useAuth()
  const canManageConfig = profile?.role === 'master' || profile?.role === 'gerente'

  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrBase64, setQrBase64] = useState('')
  const [pollingInstance, setPollingInstance] = useState<string | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [proxyHost, setProxyHost] = useState('')
  const [proxyPort, setProxyPort] = useState('')
  const [proxyUser, setProxyUser] = useState('')
  const [proxyPassword, setProxyPassword] = useState('')
  const [showProxyPassword, setShowProxyPassword] = useState(false)
  const [useProxy, setUseProxy] = useState(false)
  const [userAgent, setUserAgent] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [editInstanceId, setEditInstanceId] = useState('')
  const [editName, setEditName] = useState('')
  const [editProxyHost, setEditProxyHost] = useState('')
  const [editProxyPort, setEditProxyPort] = useState('')
  const [editProxyUser, setEditProxyUser] = useState('')
  const [editProxyPassword, setEditProxyPassword] = useState('')
  const [showEditProxyPassword, setShowEditProxyPassword] = useState(false)
  const [editUseProxy, setEditUseProxy] = useState(false)
  const [editUserAgent, setEditUserAgent] = useState('')

  const [isTestingProxy, setIsTestingProxy] = useState(false)

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

  const testProxyConnection = async (isEdit = false) => {
    const h = isEdit ? editProxyHost : proxyHost
    const p = isEdit ? editProxyPort : proxyPort
    const u = isEdit ? editProxyUser : proxyUser
    const pw = isEdit ? editProxyPassword : proxyPassword

    if (!h || !p) {
      toast({
        title: 'Aviso',
        description: 'Host e Porta são obrigatórios para testar.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingProxy(true)
    try {
      const { data, error } = await supabase.functions.invoke('test-proxy', {
        body: { host: h, port: p, username: u, password: pw },
      })

      if (error || data?.error) {
        const errorMsg = data?.error || error?.message || 'Falha na conexão com o proxy'
        const errorCode = data?.code ? ` [${data.code}]` : ''
        throw new Error(`${errorMsg}${errorCode}`)
      }

      if (data?.success) {
        toast({
          title: 'Proxy Conectado com Sucesso!',
          description: `Seu proxy está ativo e mascarando a conexão. IP Público: ${data.ip}`,
          variant: 'default',
        })
      }
    } catch (err: any) {
      toast({ title: 'Erro ao testar proxy', description: err.message, variant: 'destructive' })
    } finally {
      setIsTestingProxy(false)
    }
  }

  const handleCreate = async () => {
    if (!urlServidor || !globalApiKey) {
      toast({
        title: 'Aviso',
        description: 'Configure a API Global primeiro nas Configurações.',
        variant: 'destructive',
      })
      return
    }

    if (useProxy && (!proxyHost || !proxyPort)) {
      toast({
        title: 'Aviso',
        description: 'Se for utilizar proxy, os campos Host e Porta são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const token = generateToken()
      const instanceNameWithoutSpaces = name.replace(/\s+/g, '-')
      const constructedProxyUrl = useProxy
        ? buildProxyString(proxyHost, proxyPort, proxyUser, proxyPassword)
        : null

      const createRes = await fetch(`${urlServidor}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: globalApiKey },
        body: JSON.stringify({
          instanceName: instanceNameWithoutSpaces,
          token: token,
          qrcode: true,
          ...(constructedProxyUrl ? { proxy: constructedProxyUrl } : {}),
          ...(userAgent ? { userAgent } : {}),
        }),
      })

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => null)
        throw new Error(
          errData?.response?.message?.[0] ||
            errData?.message ||
            errData?.error ||
            'Falha ao criar instância na API Evolution',
        )
      }

      const createData = await createRes.json()

      await instancesService.createInstance(instanceNameWithoutSpaces, token, {
        proxy_host: useProxy ? proxyHost : null,
        proxy_port: useProxy ? proxyPort : null,
        proxy_user: useProxy ? proxyUser : null,
        proxy_password: useProxy ? proxyPassword : null,
        user_agent: userAgent,
      })

      toast({ title: 'Sucesso', description: 'Instância criada' })
      setName('')
      setProxyHost('')
      setProxyPort('')
      setProxyUser('')
      setProxyPassword('')
      setUseProxy(false)
      setUserAgent('')
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

  const openEditModal = (instance: WhatsappInstance) => {
    setEditInstanceId(instance.id)
    setEditName(instance.name)
    setEditProxyHost(instance.proxy_host || '')
    setEditProxyPort(instance.proxy_port || '')
    setEditProxyUser(instance.proxy_user || '')
    setEditProxyPassword(instance.proxy_password || '')
    setEditUseProxy(!!(instance.proxy_host && instance.proxy_port))
    setEditUserAgent(instance.user_agent || '')
    setIsEditModalOpen(true)
  }

  const handleEdit = async () => {
    if (editUseProxy && (!editProxyHost || !editProxyPort)) {
      toast({
        title: 'Aviso',
        description: 'Se for utilizar proxy, os campos Host e Porta são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setIsEditing(true)
    try {
      await instancesService.updateInstance(editInstanceId, {
        proxy_host: editUseProxy ? editProxyHost : null,
        proxy_port: editUseProxy ? editProxyPort : null,
        proxy_user: editUseProxy ? editProxyUser : null,
        proxy_password: editUseProxy ? editProxyPassword : null,
        user_agent: editUserAgent,
      })
      toast({ title: 'Sucesso', description: 'Instância atualizada com sucesso' })
      setIsEditModalOpen(false)
      fetchInstances()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setIsEditing(false)
    }
  }

  const handleConnectExisting = async (instance: WhatsappInstance) => {
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

      const constructedProxyUrl =
        buildProxyString(
          instance.proxy_host,
          instance.proxy_port,
          instance.proxy_user,
          instance.proxy_password,
        ) || instance.proxy_url
      const isPost = !!constructedProxyUrl || !!instance.user_agent
      const payload: any = {}
      if (constructedProxyUrl) payload.proxy = constructedProxyUrl
      if (instance.user_agent) payload.userAgent = instance.user_agent

      const res = await fetch(`${urlServidor}/instance/connect/${instance.name}`, {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', apikey: globalApiKey },
        ...(isPost ? { body: JSON.stringify(payload) } : {}),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        const specificError =
          errData?.response?.message?.[0] ||
          errData?.message ||
          errData?.error ||
          'Falha ao conectar'
        throw new Error(specificError)
      }

      const data = await res.json()

      if (data.base64) {
        setQrBase64(data.base64)
        setPollingInstance(instance.name)
        setQrModalOpen(true)
        await instancesService.updateInstance(instance.id, { last_error: null })
      } else if (data.instance?.state === 'open') {
        toast({ title: 'Aviso', description: 'Esta instância já está conectada.' })
        await instancesService.updateInstance(instance.id, { last_error: null })
      } else {
        throw new Error('QR Code não retornado pela API.')
      }

      fetchInstances()
    } catch (e: any) {
      const errorMsg = e.message || 'Servidor Evolution API inacessível.'
      toast({
        title: 'Erro na API WhatsApp',
        description: errorMsg,
        variant: 'destructive',
      })
      await instancesService
        .updateInstance(instance.id, { last_error: errorMsg, status: 'DESCONECTADO' })
        .catch(() => null)
      fetchInstances()
    }
  }

  const handleDelete = async (id: string, instanceName: string) => {
    try {
      if (urlServidor && globalApiKey) {
        const res = await fetch(`${urlServidor}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { apikey: globalApiKey },
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          const specificError =
            errData?.response?.message?.[0] || errData?.message || errData?.error
          if (specificError) {
            toast({
              title: 'Aviso Evolution API',
              description: specificError,
              variant: 'destructive',
            })
          }
        }
      }
      await instancesService.deleteInstance(id)
      fetchInstances()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao excluir instância',
        variant: 'destructive',
      })
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
      toast({ title: 'Sucesso', description: res.message || 'Sincronizadas com sucesso!' })
      setIsConfigModalOpen(false)
      fetchInstances()
    } catch (error: any) {
      toast({
        title: 'Erro de Sincronização',
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
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">{instance.name}</span>
                    {(instance.proxy_host || instance.proxy_url) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Proxy Ativo</p>
                          <p className="font-mono text-xs text-slate-300 mt-1">
                            {instance.proxy_host
                              ? `${instance.proxy_host}:${instance.proxy_port}`
                              : instance.proxy_url}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {instance.user_agent && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Monitor className="h-4 w-4 text-blue-500 flex-shrink-0 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>User-Agent Configurado</p>
                          <p className="font-mono text-xs text-slate-300 mt-1 max-w-[200px] break-all">
                            {instance.user_agent}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </CardTitle>
                {getStatusBadge(instance.status)}
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Última Sincronização:{' '}
                  {format(new Date(instance.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </div>
                {instance.last_error &&
                  (instance.status === 'DESCONECTADO' || instance.status === 'PAUSADO') && (
                    <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-100 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="break-all">
                        <span className="font-semibold block mb-0.5">Último Erro:</span>
                        {instance.last_error}
                      </div>
                    </div>
                  )}
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnectExisting(instance)}
                  >
                    <QrCode className="mr-2 h-4 w-4" /> Conectar
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(instance)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <Settings className="h-4 w-4" />
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Creation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Instância</DialogTitle>
            <DialogDescription>
              Configure os detalhes para criar uma nova conexão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Instância</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Chip Comercial 01"
              />
            </div>

            <div className="p-4 border rounded-md bg-slate-50 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Switch id="use-proxy" checked={useProxy} onCheckedChange={setUseProxy} />
                  <label htmlFor="use-proxy" className="text-sm font-semibold cursor-pointer">
                    Usar Proxy
                  </label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testProxyConnection(false)}
                  disabled={!useProxy || isTestingProxy || !proxyHost || !proxyPort}
                  className="h-8"
                >
                  {isTestingProxy ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Network className="mr-2 h-3 w-3" />
                  )}
                  Testar Conexão
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Host</label>
                  <Input
                    value={proxyHost}
                    onChange={(e) => setProxyHost(e.target.value)}
                    placeholder="proxy.exemplo.com"
                    disabled={!useProxy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Porta</label>
                  <Input
                    value={proxyPort}
                    onChange={(e) => setProxyPort(e.target.value)}
                    placeholder="8080"
                    disabled={!useProxy}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário (Opcional)</label>
                  <Input
                    value={proxyUser}
                    onChange={(e) => setProxyUser(e.target.value)}
                    placeholder="Opcional"
                    disabled={!useProxy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha (Opcional)</label>
                  <div className="relative">
                    <Input
                      type={showProxyPassword ? 'text' : 'password'}
                      value={proxyPassword}
                      onChange={(e) => setProxyPassword(e.target.value)}
                      placeholder="Opcional"
                      disabled={!useProxy}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowProxyPassword(!showProxyPassword)}
                      disabled={!useProxy}
                    >
                      {showProxyPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Útil para rotear tráfego e evitar bloqueios. Host e Porta são obrigatórios se
                utilizar proxy.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User-Agent (Opcional)</label>
              <Select onValueChange={(val) => setUserAgent(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher preset de navegador..." />
                </SelectTrigger>
                <SelectContent>
                  {USER_AGENT_PRESETS.map((p) => (
                    <SelectItem key={p.label} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                placeholder="Mozilla/5.0..."
                className="mt-2"
              />
              <p className="text-xs text-slate-500">
                Mascara a automação fingindo ser um navegador comercial.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name || isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Instância</DialogTitle>
            <DialogDescription>Atualize as configurações da instância.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Instância</label>
              <Input value={editName} disabled className="bg-slate-100 text-slate-500" />
            </div>

            <div className="p-4 border rounded-md bg-slate-50 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-use-proxy"
                    checked={editUseProxy}
                    onCheckedChange={setEditUseProxy}
                  />
                  <label htmlFor="edit-use-proxy" className="text-sm font-semibold cursor-pointer">
                    Usar Proxy
                  </label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testProxyConnection(true)}
                  disabled={!editUseProxy || isTestingProxy || !editProxyHost || !editProxyPort}
                  className="h-8"
                >
                  {isTestingProxy ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Network className="mr-2 h-3 w-3" />
                  )}
                  Testar Conexão
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Host</label>
                  <Input
                    value={editProxyHost}
                    onChange={(e) => setEditProxyHost(e.target.value)}
                    placeholder="proxy.exemplo.com"
                    disabled={!editUseProxy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Porta</label>
                  <Input
                    value={editProxyPort}
                    onChange={(e) => setEditProxyPort(e.target.value)}
                    placeholder="8080"
                    disabled={!editUseProxy}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário (Opcional)</label>
                  <Input
                    value={editProxyUser}
                    onChange={(e) => setEditProxyUser(e.target.value)}
                    placeholder="Opcional"
                    disabled={!editUseProxy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha (Opcional)</label>
                  <div className="relative">
                    <Input
                      type={showEditProxyPassword ? 'text' : 'password'}
                      value={editProxyPassword}
                      onChange={(e) => setEditProxyPassword(e.target.value)}
                      placeholder="Opcional"
                      disabled={!editUseProxy}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowEditProxyPassword(!showEditProxyPassword)}
                      disabled={!editUseProxy}
                    >
                      {showEditProxyPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User-Agent (Opcional)</label>
              <Select onValueChange={(val) => setEditUserAgent(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher preset..." />
                </SelectTrigger>
                <SelectContent>
                  {USER_AGENT_PRESETS.map((p) => (
                    <SelectItem key={p.label} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={editUserAgent}
                onChange={(e) => setEditUserAgent(e.target.value)}
                placeholder="Mozilla/5.0..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isEditing}
            >
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar
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
                alt="QR"
                className="w-64 h-64 rounded-md border p-2"
              />
            ) : (
              <div className="flex items-center justify-center w-64 h-64 bg-slate-100 rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
            <div className="flex items-center text-sm text-slate-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Aguardando leitura...
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
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar e
              Sincronizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
