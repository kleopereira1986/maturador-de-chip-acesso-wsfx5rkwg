import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Users,
  UserCog,
  ShieldCheck,
  UserCheck,
  Play,
  Pause,
  Edit,
  Smartphone,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usersService } from '@/services/users'
import { campaignsService } from '@/services/campaigns'
import { instancesService } from '@/services/instances'
import { Profile, Campaign, WhatsappInstance } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { USER_AGENT_PRESETS } from '@/lib/constants'

export default function Dashboard() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [stats, setStats] = useState({ total: 0, master: 0, gerente: 0, corretor: 0 })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [editForm, setEditForm] = useState({ message_text: '', media_url: '' })

  const [isCreateInstOpen, setIsCreateInstOpen] = useState(false)
  const [newInstName, setNewInstName] = useState('')
  const [newInstToken, setNewInstToken] = useState('')
  const [newInstProxyHost, setNewInstProxyHost] = useState('')
  const [newInstProxyPort, setNewInstProxyPort] = useState('')
  const [newInstProxyUser, setNewInstProxyUser] = useState('')
  const [newInstProxyPassword, setNewInstProxyPassword] = useState('')
  const [showNewInstProxyPassword, setShowNewInstProxyPassword] = useState(false)
  const [newInstUserAgent, setNewInstUserAgent] = useState('')
  const [isCreatingInst, setIsCreatingInst] = useState(false)

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      if (profile?.role === 'master' || profile?.role === 'gerente') {
        const users = await usersService.getProfiles()
        const counts = users.reduce(
          (acc: any, user: Profile) => {
            acc.total++
            acc[user.role] = (acc[user.role] || 0) + 1
            return acc
          },
          { total: 0, master: 0, gerente: 0, corretor: 0 },
        )
        setStats(counts)

        const camps = await campaignsService.getCampaigns()
        setCampaigns(camps)

        const insts = await instancesService.getInstances()
        setInstances(insts)
      } else if (profile?.role === 'corretor') {
        const insts = await instancesService.getInstances()
        setInstances(insts)
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()

    if (profile?.role === 'master' || profile?.role === 'gerente' || profile?.role === 'corretor') {
      const sub = supabase
        .channel('dashboard-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'whatsapp_instances' },
          (payload) => {
            setInstances((prev) => {
              if (payload.eventType === 'UPDATE') {
                return prev.map((i) =>
                  i.id === payload.new.id ? ({ ...i, ...payload.new } as WhatsappInstance) : i,
                )
              }
              if (payload.eventType === 'INSERT') {
                return [payload.new as WhatsappInstance, ...prev]
              }
              if (payload.eventType === 'DELETE') {
                return prev.filter((i) => i.id !== payload.old.id)
              }
              return prev
            })
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'campaigns' },
          (payload) => {
            setCampaigns((prev) =>
              prev.map((c) =>
                c.id === payload.new.id ? ({ ...c, ...payload.new } as Campaign) : c,
              ),
            )
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(sub)
      }
    }
  }, [profile])

  const toggleCampaignStatus = async (c: Campaign) => {
    const newStatus = c.status === 'DISPARANDO' ? 'PAUSADO' : 'DISPARANDO'
    await campaignsService.updateCampaign(c.id, { status: newStatus })
    setCampaigns((prev) =>
      prev.map((camp) => (camp.id === c.id ? { ...camp, status: newStatus } : camp)),
    )
  }

  const openEditDialog = (c: Campaign) => {
    setEditCampaign(c)
    setEditForm({ message_text: c.message_text, media_url: c.media_url || '' })
  }

  const saveCampaignEdit = async () => {
    if (!editCampaign) return
    try {
      await campaignsService.updateCampaign(editCampaign.id, {
        message_text: editForm.message_text,
        media_url: editForm.media_url || null,
      })
      toast({ title: 'Sucesso', description: 'Campanha atualizada.' })
      setCampaigns((prev) =>
        prev.map((c) => (c.id === editCampaign.id ? { ...c, ...editForm } : c)),
      )
      setEditCampaign(null)
    } catch {
      toast({ title: 'Erro', description: 'Erro ao atualizar.', variant: 'destructive' })
    }
  }

  const handleCreateInstance = async () => {
    if (!newInstName || !newInstToken) return

    if (
      (newInstProxyHost || newInstProxyPort || newInstProxyUser || newInstProxyPassword) &&
      (!newInstProxyHost || !newInstProxyPort)
    ) {
      toast({
        title: 'Aviso',
        description: 'Se for utilizar proxy, os campos Host e Porta são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setIsCreatingInst(true)
    try {
      await instancesService.createInstance(newInstName, newInstToken, {
        proxy_host: newInstProxyHost,
        proxy_port: newInstProxyPort,
        proxy_user: newInstProxyUser,
        proxy_password: newInstProxyPassword,
        user_agent: newInstUserAgent,
      })
      toast({ title: 'Sucesso', description: 'Instância criada com sucesso.' })
      setIsCreateInstOpen(false)
      setNewInstName('')
      setNewInstToken('')
      setNewInstProxyHost('')
      setNewInstProxyPort('')
      setNewInstProxyUser('')
      setNewInstProxyPassword('')
      setNewInstUserAgent('')
      loadDashboardData()
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Erro ao criar instância.',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingInst(false)
    }
  }

  const handleDeleteInstance = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta instância?')) return
    try {
      await instancesService.deleteInstance(id)
      toast({ title: 'Sucesso', description: 'Instância excluída.' })
      setInstances((prev) => prev.filter((i) => i.id !== id))
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Erro ao excluir instância.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel de Controle</h1>
        <p className="text-slate-500">Gestão centralizada do Maturador de Chip.</p>
      </div>

      {(profile?.role === 'master' || profile?.role === 'gerente') && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total de Usuários"
              value={stats.total}
              icon={Users}
              loading={isLoading}
              className="border-slate-200"
            />
            <StatsCard
              title="Masters"
              value={stats.master}
              icon={ShieldCheck}
              loading={isLoading}
              className="border-purple-100 bg-purple-50/30"
              iconColor="text-purple-600"
            />
            <StatsCard
              title="Gerentes"
              value={stats.gerente}
              icon={UserCog}
              loading={isLoading}
              className="border-blue-100 bg-blue-50/30"
              iconColor="text-blue-600"
            />
            <StatsCard
              title="Corretores"
              value={stats.corretor}
              icon={UserCheck}
              loading={isLoading}
              className="border-green-100 bg-green-50/30"
              iconColor="text-green-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Campanhas Ativas
                </CardTitle>
                <CardDescription>Controle de campanhas e disparos</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                      Nenhuma campanha encontrada.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg bg-slate-50/50 gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">{c.name}</h3>
                              <Badge variant={c.status === 'DISPARANDO' ? 'default' : 'secondary'}>
                                {c.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-1">{c.message_text}</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleCampaignStatus(c)}
                              className="flex-1 sm:flex-none"
                            >
                              {c.status === 'DISPARANDO' ? (
                                <>
                                  <Pause className="mr-1 h-4 w-4" /> Pausar
                                </>
                              ) : (
                                <>
                                  <Play className="mr-1 h-4 w-4" /> Iniciar
                                </>
                              )}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(c)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  Instâncias WhatsApp
                </CardTitle>
                <CardDescription>Status em tempo real</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : instances.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                      Nenhuma instância conectada.
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {instances.map((inst) => (
                        <div
                          key={inst.id}
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <div className="font-medium text-sm text-slate-900">{inst.name}</div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${inst.status === 'CONECTADO' ? 'bg-green-500' : 'bg-red-500'}`}
                            />
                            <span className="text-xs text-slate-500 font-medium">
                              {inst.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {profile?.role === 'corretor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-slate-200 lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Nome</p>
                <p className="text-lg text-slate-900">{profile.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Email</p>
                <p className="text-lg text-slate-900">{profile.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Nível de Acesso</p>
                <p className="text-lg text-slate-900 capitalize">{profile.role}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  Minhas Instâncias
                </CardTitle>
                <CardDescription>Gerencie suas conexões de WhatsApp</CardDescription>
              </div>
              <Button onClick={() => setIsCreateInstOpen(true)} size="sm">
                Nova Instância
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : instances.length === 0 ? (
                  <div className="text-center text-slate-500 py-10">
                    Você ainda não possui instâncias.
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {instances.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg bg-slate-50/50 gap-4"
                      >
                        <div>
                          <div className="font-medium text-sm text-slate-900 mb-1">{inst.name}</div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${inst.status === 'CONECTADO' ? 'bg-green-500' : inst.status === 'DESCONECTADO' ? 'bg-red-500' : 'bg-yellow-500'}`}
                            />
                            <span className="text-xs text-slate-500 font-medium">
                              {inst.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              • Criado em {new Date(inst.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteInstance(inst.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isCreateInstOpen} onOpenChange={setIsCreateInstOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Instância</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label>Nome da Instância</Label>
              <Input
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
                placeholder="Ex: Meu WhatsApp"
              />
            </div>
            <div className="space-y-2">
              <Label>Token da API</Label>
              <Input
                value={newInstToken}
                onChange={(e) => setNewInstToken(e.target.value)}
                placeholder="Ex: token123"
                type="password"
              />
            </div>

            <div className="p-4 border rounded-md bg-slate-50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Host (Proxy)</Label>
                  <Input
                    value={newInstProxyHost}
                    onChange={(e) => setNewInstProxyHost(e.target.value)}
                    placeholder="proxy.exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input
                    value={newInstProxyPort}
                    onChange={(e) => setNewInstProxyPort(e.target.value)}
                    placeholder="8080"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário Proxy</Label>
                  <Input
                    value={newInstProxyUser}
                    onChange={(e) => setNewInstProxyUser(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha Proxy</Label>
                  <div className="relative">
                    <Input
                      type={showNewInstProxyPassword ? 'text' : 'password'}
                      value={newInstProxyPassword}
                      onChange={(e) => setNewInstProxyPassword(e.target.value)}
                      placeholder="Opcional"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewInstProxyPassword(!showNewInstProxyPassword)}
                    >
                      {showNewInstProxyPassword ? (
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
              <Label>User-Agent (Opcional)</Label>
              <Select onValueChange={(val) => setNewInstUserAgent(val)}>
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
                value={newInstUserAgent}
                onChange={(e) => setNewInstUserAgent(e.target.value)}
                placeholder="Mozilla/5.0..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateInstOpen(false)}
              disabled={isCreatingInst}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateInstance}
              disabled={isCreatingInst || !newInstName || !newInstToken}
            >
              {isCreatingInst ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCampaign} onOpenChange={(open) => !open && setEditCampaign(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Campanha</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={editForm.message_text}
                onChange={(e) => setEditForm({ ...editForm, message_text: e.target.value })}
                className="h-32"
              />
            </div>
            <div className="space-y-2">
              <Label>URL da Mídia (opcional)</Label>
              <Input
                value={editForm.media_url}
                onChange={(e) => setEditForm({ ...editForm, media_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCampaign(null)}>
              Cancelar
            </Button>
            <Button onClick={saveCampaignEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  loading,
  className = '',
  iconColor = 'text-slate-600',
}: any) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold text-slate-900">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}
