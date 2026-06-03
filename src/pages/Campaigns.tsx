import { useState, useEffect } from 'react'
import { campaignsService } from '@/services/campaigns'
import { instancesService } from '@/services/instances'
import { Campaign, WhatsappInstance } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Dialer from '@/pages/Dialer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Play, Pause, Plus, Trash2, Loader2, Edit, UploadCloud, List } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Record<string, any>>({})
  const [activeInstances, setActiveInstances] = useState<WhatsappInstance[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const defaultForm = {
    name: '',
    message_text: '',
    media_type: 'TEXT' as any,
    media_url: '',
    min_delay: 10,
    max_delay: 30,
    instance_ids: [] as string[],
    leads: '',
  }
  const [form, setForm] = useState(defaultForm)
  const [file, setFile] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  const [campaignLogs, setCampaignLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logStatusFilter, setLogStatusFilter] = useState('ALL')
  const [selectedLogCampaignId, setSelectedLogCampaignId] = useState<string | null>(null)

  const fetchLogs = async (campaignId: string, filter: string) => {
    setIsLoadingLogs(true)
    try {
      const logs = await campaignsService.getCampaignLogs(campaignId, filter)
      setCampaignLogs(logs)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar logs.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const openLogs = (campaignId: string) => {
    setSelectedLogCampaignId(campaignId)
    setLogStatusFilter('ALL')
    setIsLogsModalOpen(true)
  }

  useEffect(() => {
    if (isLogsModalOpen && selectedLogCampaignId) {
      fetchLogs(selectedLogCampaignId, logStatusFilter)
    }
  }, [isLogsModalOpen, selectedLogCampaignId, logStatusFilter])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [camps, insts] = await Promise.all([
        campaignsService.getCampaigns(),
        instancesService.getInstances(),
      ])
      setCampaigns(camps)
      setActiveInstances(insts.filter((i) => i.status === 'CONECTADO'))

      const st: any = {}
      for (const c of camps) {
        st[c.id] = await campaignsService.getDispatchStats(c.id)
      }
      setStats(st)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar campanhas.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Poll stats every 5 seconds if there are active campaigns
    const interval = setInterval(() => {
      setCampaigns((currentCampaigns) => {
        const activeCamps = currentCampaigns.filter((c) => c.status === 'DISPARANDO')
        if (activeCamps.length > 0) {
          activeCamps.forEach((c) => {
            campaignsService.getDispatchStats(c.id).then((st) => {
              setStats((prev) => ({ ...prev, [c.id]: st }))
            })
          })
        }
        return currentCampaigns
      })
    }, 5000)

    const sub = supabase
      .channel('campaigns-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns' },
        (payload) => {
          setCampaigns((prev) =>
            prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c)),
          )
        },
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(sub)
    }
  }, [])

  const parseCSV = async (file: File): Promise<{ lead_name: string | null; phone: string }[]> => {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
    const parsed = []
    for (const line of lines) {
      const parts = line.split(',')
      const phone = parts[0]?.replace(/\D/g, '') // extrai os números
      const name = parts[1]?.trim() || null
      if (phone && phone.length >= 10) {
        parsed.push({ phone, lead_name: name })
      }
    }
    return parsed
  }

  const handleSave = async () => {
    if (!form.name || !form.message_text.trim() || form.instance_ids.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Preencha nome, mensagem e selecione pelo menos uma instância.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      let media_url = form.media_url
      if (file) {
        media_url = await campaignsService.uploadMedia(file)
      }

      let campaignId = editingId

      const campaignPayload = {
        name: form.name,
        message_text: form.message_text,
        media_type: form.media_type,
        media_url,
        min_delay: form.min_delay,
        max_delay: form.max_delay,
        instance_ids: form.instance_ids,
      }

      if (editingId) {
        await campaignsService.updateCampaign(editingId, campaignPayload)
        toast({ title: 'Sucesso', description: 'Campanha atualizada.' })
      } else {
        const newCamp = await campaignsService.createCampaign(campaignPayload)
        campaignId = newCamp.id
        toast({ title: 'Sucesso', description: 'Campanha criada.' })
      }

      // Adiciona Leads (Textarea e CSV)
      let allLeads: any[] = []

      if (form.leads) {
        const textLeads = form.leads
          .split('\n')
          .map((l) => {
            const [phone, name] = l.split(',')
            return { phone: phone?.replace(/\D/g, ''), lead_name: name?.trim() || null }
          })
          .filter((l) => l.phone && l.phone.length >= 10)
        allLeads = [...allLeads, ...textLeads]
      }

      if (csvFile) {
        const csvLeads = await parseCSV(csvFile)
        allLeads = [...allLeads, ...csvLeads]
      }

      if (allLeads.length > 0 && campaignId) {
        await campaignsService.addLeads(campaignId, allLeads)
        toast({
          title: 'Leads Importados',
          description: `${allLeads.length} leads foram adicionados à fila.`,
        })
      }

      closeModal()
      fetchData()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar campanha.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(defaultForm)
    setFile(null)
    setCsvFile(null)
  }

  const openEdit = (c: Campaign) => {
    setForm({
      name: c.name,
      message_text: c.message_text,
      media_type: c.media_type as any,
      media_url: c.media_url || '',
      min_delay: c.min_delay || 10,
      max_delay: c.max_delay || 30,
      instance_ids: c.instance_ids || [],
      leads: '',
    })
    setEditingId(c.id)
    setIsModalOpen(true)
  }

  const toggleStatus = async (c: Campaign) => {
    const newStatus = c.status === 'DISPARANDO' ? 'PAUSADO' : 'DISPARANDO'
    await campaignsService.updateCampaign(c.id, { status: newStatus })
    fetchData()
  }

  const deleteCamp = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta campanha?')) return
    await campaignsService.deleteCampaign(id)
    fetchData()
  }

  const toggleInstanceSelection = (id: string) => {
    setForm((f) => ({
      ...f,
      instance_ids: f.instance_ids.includes(id)
        ? f.instance_ids.filter((i) => i !== id)
        : [...f.instance_ids, id],
    }))
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="whatsapp">Campanhas WhatsApp</TabsTrigger>
          <TabsTrigger value="dialer">Discador SIP</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Campanhas (Disparador)
              </h1>
              <p className="text-slate-500">
                Disparo em massa com Spintax, delays e round-robin entre instâncias.
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova Campanha
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="col-span-full text-center text-slate-500 py-10 bg-slate-50 border border-dashed rounded-lg">
                Nenhuma campanha encontrada. Comece criando uma nova.
              </div>
            ) : (
              campaigns.map((c) => {
                const s = stats[c.id] || { total: 0, sent: 0, failed: 0, pending: 0 }
                const progress = s.total > 0 ? ((s.sent + s.failed) / s.total) * 100 : 0

                return (
                  <Card key={c.id} className="overflow-hidden flex flex-col">
                    <CardHeader className="bg-slate-50/80 pb-4 border-b">
                      <div className="flex justify-between items-start">
                        <div className="pr-4">
                          <CardTitle className="text-xl flex items-center gap-2">
                            {c.name}
                            <Badge
                              variant={c.status === 'DISPARANDO' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {c.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mt-2 text-xs h-8">
                            {c.message_text}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openLogs(c.id)}
                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Ver Logs"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCamp(c.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1 text-xs">
                            <span className="font-medium text-slate-700">Progresso</span>
                            <span className="text-slate-500 font-medium">
                              {Math.round(progress)}% ({s.sent} / {s.total})
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                            <span className="text-emerald-600 font-medium">Sucesso: {s.sent}</span>
                            <span className="text-red-500 font-medium">Falhas: {s.failed}</span>
                            <span>Pendente: {s.pending}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md border">
                          <span className="font-medium">Mídia:</span> {c.media_type}
                          <span className="mx-1">•</span>
                          <span className="font-medium">Delay:</span> {c.min_delay}s - {c.max_delay}
                          s<span className="mx-1">•</span>
                          <span className="font-medium">Instâncias:</span>{' '}
                          {c.instance_ids?.length || 0}
                        </div>
                      </div>

                      <div className="mt-6">
                        <Button
                          variant={c.status === 'DISPARANDO' ? 'outline' : 'default'}
                          className="w-full"
                          onClick={() => toggleStatus(c)}
                        >
                          {c.status === 'DISPARANDO' ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" /> Pausar Disparos
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />{' '}
                              {progress === 100 && s.total > 0 ? 'Concluído' : 'Iniciar Disparos'}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="dialer">
          <Dialer />
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
            <DialogDescription>
              Configure a mensagem e selecione as instâncias para o round-robin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Nome da Campanha</Label>
              <Input
                placeholder="Ex: Oferta Black Friday"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                placeholder="Spintax suportado: {Oi|Olá} {{nome}}, tudo bem?"
                value={form.message_text}
                onChange={(e) => setForm({ ...form, message_text: e.target.value })}
                className={`h-28 ${!form.message_text.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {!form.message_text.trim() && (
                <p className="text-xs text-red-500 font-medium">
                  O texto da mensagem é obrigatório
                </p>
              )}
              <p className="text-[10px] text-slate-500">
                Use {'{texto1|texto2}'} para variações aleatórias e {'{{nome}}'} para inserir o nome
                do lead.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Mídia</Label>
                <Select
                  value={form.media_type}
                  onValueChange={(v) => setForm({ ...form, media_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Texto Simples</SelectItem>
                    <SelectItem value="IMAGE">Imagem</SelectItem>
                    <SelectItem value="VIDEO">Vídeo</SelectItem>
                    <SelectItem value="AUDIO">Áudio (Gravado)</SelectItem>
                    <SelectItem value="DOCUMENT">Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.media_type !== 'TEXT' && (
                <div className="space-y-2">
                  <Label>Arquivo de Mídia</Label>
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-sm cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delay Mín. (segundos)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.min_delay}
                  onChange={(e) => setForm({ ...form, min_delay: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Delay Máx. (segundos)</Label>
                <Input
                  type="number"
                  min="2"
                  value={form.max_delay}
                  onChange={(e) => setForm({ ...form, max_delay: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instâncias para Disparo (Round-Robin)</Label>
              {activeInstances.length === 0 ? (
                <div className="text-sm text-red-500 p-2 bg-red-50 rounded border border-red-100">
                  Nenhuma instância conectada disponível.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 border p-3 rounded-md max-h-40 overflow-y-auto bg-slate-50">
                  {activeInstances.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center space-x-2 bg-white p-2 rounded border shadow-sm"
                    >
                      <Checkbox
                        id={`inst-${inst.id}`}
                        checked={form.instance_ids.includes(inst.id)}
                        onCheckedChange={() => toggleInstanceSelection(inst.id)}
                      />
                      <label
                        htmlFor={`inst-${inst.id}`}
                        className="text-sm font-medium leading-none cursor-pointer truncate flex-1"
                      >
                        {inst.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label className="text-base font-semibold">Importar Leads na Fila</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Via Arquivo CSV</Label>
                  <div className="border border-dashed border-slate-300 rounded-md p-4 text-center hover:bg-slate-50 transition-colors">
                    <Input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      id="csv-upload"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    />
                    <Label
                      htmlFor="csv-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <UploadCloud className="h-6 w-6 text-slate-400" />
                      <span className="text-sm font-medium text-primary">
                        {csvFile ? csvFile.name : 'Selecionar arquivo CSV'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Padrão da linha: telefone, nome
                      </span>
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Ou digite manualmente</Label>
                  <Textarea
                    placeholder="5511999999999, João Silva&#10;5511888888888, Maria"
                    value={form.leads}
                    onChange={(e) => setForm({ ...form, leads: e.target.value })}
                    className="h-[104px] text-xs font-mono resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-white pt-4 mt-4">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.name ||
                !form.message_text.trim() ||
                isSaving ||
                form.instance_ids.length === 0 ||
                (form.media_type !== 'TEXT' && !file && !form.media_url)
              }
            >
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {editingId ? 'Salvar Alterações' : 'Criar Campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogsModalOpen} onOpenChange={setIsLogsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <DialogTitle>Logs da Campanha</DialogTitle>
                <DialogDescription>Relatório detalhado de envios e falhas.</DialogDescription>
              </div>
              <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Registros</SelectItem>
                  <SelectItem value="SENT">Apenas Sucesso</SelectItem>
                  <SelectItem value="ERRORS">Apenas Falhas</SelectItem>
                  <SelectItem value="PENDING">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 min-h-[300px]">
            {isLoadingLogs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : campaignLogs.length === 0 ? (
              <div className="text-center text-slate-500 py-8 bg-slate-50 border rounded-md">
                Nenhum registro encontrado para este filtro.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>Atualizado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.status === 'SENT' ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600">Enviado</Badge>
                          ) : log.status === 'ERROR' || log.status === 'FAILED' ? (
                            <Badge variant="destructive">Falhou</Badge>
                          ) : log.status === 'PROCESSING' ? (
                            <Badge className="bg-blue-500 hover:bg-blue-600">Processando</Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-amber-600 bg-amber-100 hover:bg-amber-200"
                            >
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {log.lead_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs">{log.phone}</TableCell>
                        <TableCell
                          className="text-xs max-w-[200px] truncate text-slate-500 font-mono"
                          title={log.error_message || ''}
                        >
                          {log.error_message || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.updated_at).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button onClick={() => setIsLogsModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
