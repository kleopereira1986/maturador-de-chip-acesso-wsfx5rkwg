import { useState, useEffect } from 'react'
import { instancesService } from '@/services/instances'
import { WhatsappInstance } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Smartphone, Loader2, QrCode, Settings } from 'lucide-react'
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

export default function Instances() {
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [token, setToken] = useState('')

  const [urlServidor, setUrlServidor] = useState('https://api.primaziainvestimentos.com')
  const [globalApiKey, setGlobalApiKey] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  const { toast } = useToast()

  const fetchInstances = async () => {
    setIsLoading(true)
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
  }, [])

  const handleCreate = async () => {
    try {
      await instancesService.createInstance(name, token)
      toast({ title: 'Sucesso', description: 'Instância criada' })
      setIsModalOpen(false)
      fetchInstances()
    } catch {
      toast({ title: 'Erro', description: 'Erro ao criar instância', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await instancesService.deleteInstance(id)
      fetchInstances()
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsConfigModalOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> Configurações Globais API
          </Button>
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
                    onClick={() =>
                      toast({
                        title: 'QR Code',
                        description: 'Escaneie o QR Code na API Evolution.',
                      })
                    }
                  >
                    <QrCode className="mr-2 h-4 w-4" /> Conectar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(instance.id)}
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
            <DialogDescription>Adicione as credenciais da Evolution API.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Instância</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Financeiro"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Token da API</label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token Global / Instância"
                type="password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name || !token}>
              Salvar
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
