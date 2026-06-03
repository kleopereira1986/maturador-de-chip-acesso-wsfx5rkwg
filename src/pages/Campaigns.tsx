import { useState, useEffect } from 'react'
import { campaignsService } from '@/services/campaigns'
import { Campaign } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Play, Pause, Plus, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Record<string, any>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: '',
    message_text: '',
    media_type: 'TEXT' as any,
    media_url: '',
    leads: '',
  })
  const [file, setFile] = useState<File | null>(null)

  const fetchCampaigns = async () => {
    setIsLoading(true)
    try {
      const data = await campaignsService.getCampaigns()
      setCampaigns(data)
      const st: any = {}
      for (const c of data) {
        st[c.id] = await campaignsService.getDispatchStats(c.id)
      }
      setStats(st)
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as campanhas.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      let media_url = form.media_url
      if (file) {
        media_url = await campaignsService.uploadMedia(file)
      }

      const newCamp = await campaignsService.createCampaign({
        name: form.name,
        message_text: form.message_text,
        media_type: form.media_type,
        media_url,
      })

      if (form.leads) {
        const parsed = form.leads
          .split('\n')
          .map((l) => {
            const [phone, name] = l.split(',')
            return { phone: phone?.trim(), lead_name: name?.trim() || null }
          })
          .filter((l) => l.phone)
        if (parsed.length > 0) {
          await campaignsService.addLeads(newCamp.id, parsed)
        }
      }

      toast({ title: 'Sucesso', description: 'Campanha criada com leads.' })
      setIsModalOpen(false)
      fetchCampaigns()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar.',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const toggleStatus = async (c: Campaign) => {
    const newStatus = c.status === 'DISPARANDO' ? 'PAUSADO' : 'DISPARANDO'
    await campaignsService.updateCampaign(c.id, { status: newStatus })
    fetchCampaigns()
  }

  const deleteCamp = async (id: string) => {
    await campaignsService.deleteCampaign(id)
    fetchCampaigns()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Campanhas</h1>
          <p className="text-slate-500">Disparo em massa com Spintax e Round-Robin.</p>
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
          <div className="col-span-full text-center text-slate-500 py-10">
            Nenhuma campanha encontrada.
          </div>
        ) : (
          campaigns.map((c) => {
            const s = stats[c.id] || { total: 0, sent: 0, failed: 0, pending: 0 }
            const progress = s.total > 0 ? ((s.sent + s.failed) / s.total) * 100 : 0
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{c.name}</CardTitle>
                      <CardDescription className="line-clamp-1 mt-1">
                        {c.message_text}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(c)}>
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
                <CardContent className="pt-4">
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="font-medium text-slate-700">Progresso</span>
                    <span className="text-slate-500">
                      {s.sent} Enviados / {s.failed} Falhas / {s.total} Total
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="mt-4 flex gap-2">
                    <Badge variant={c.status === 'DISPARANDO' ? 'default' : 'outline'}>
                      {c.status}
                    </Badge>
                    <Badge variant="outline">{c.media_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nome da Campanha"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Textarea
              placeholder="Mensagem (suporta Spintax: {Oi|Olá} tudo bem?)"
              value={form.message_text}
              onChange={(e) => setForm({ ...form, message_text: e.target.value })}
              className="h-24"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={form.media_type}
                onValueChange={(v) => setForm({ ...form, media_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Mídia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Texto Simples</SelectItem>
                  <SelectItem value="IMAGE">Imagem</SelectItem>
                  <SelectItem value="VIDEO">Vídeo</SelectItem>
                  <SelectItem value="AUDIO">Áudio</SelectItem>
                </SelectContent>
              </Select>
              {form.media_type !== 'TEXT' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
            <Textarea
              placeholder="Leads: (um por linha) telefone, nome"
              value={form.leads}
              onChange={(e) => setForm({ ...form, leads: e.target.value })}
              className="h-32 font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name || !form.message_text || isCreating}
            >
              {isCreating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
