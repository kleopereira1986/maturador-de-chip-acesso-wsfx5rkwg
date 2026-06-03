import { useState, useEffect } from 'react'
import { maturadorService } from '@/services/maturador'
import { instancesService } from '@/services/instances'
import { MaturadorConfig, WhatsappInstance } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Zap, Smartphone, CheckCircle2 } from 'lucide-react'

export default function Maturador() {
  const [config, setConfig] = useState<Partial<MaturadorConfig>>({
    is_active: false,
    min_delay: 40,
    max_delay: 90,
    dialogue_tree: { phrases: [] },
  })
  const [phrasesText, setPhrasesText] = useState('')
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [confData, instData] = await Promise.all([
        maturadorService.getConfig(),
        instancesService.getInstances(),
      ])

      if (confData) {
        setConfig(confData)
        const phrases = confData.dialogue_tree?.phrases || []
        setPhrasesText(phrases.join('\n'))
      }
      setInstances(instData)
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao carregar dados.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveConfig = async () => {
    setIsSaving(true)
    try {
      const phrases = phrasesText.split('\n').filter((p) => p.trim() !== '')
      await maturadorService.saveConfig({
        ...config,
        dialogue_tree: { phrases },
      })
      toast({ title: 'Salvo com sucesso', description: 'Configurações do maturador atualizadas.' })
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar configurações.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleInstance = async (id: string, current: boolean) => {
    try {
      setInstances(
        instances.map((i) => (i.id === id ? { ...i, is_maturador_active: !current } : i)),
      )
      await instancesService.updateInstance(id, { is_maturador_active: !current })
      toast({ title: 'Atualizado', description: 'Status da instância no maturador alterado.' })
    } catch {
      setInstances(instances.map((i) => (i.id === id ? { ...i, is_maturador_active: current } : i)))
      toast({
        title: 'Erro',
        description: 'Falha ao alterar status da instância.',
        variant: 'destructive',
      })
    }
  }

  const toggleGlobal = async (checked: boolean) => {
    setConfig({ ...config, is_active: checked })
    try {
      await maturadorService.saveConfig({ ...config, is_active: checked })
      if (checked) {
        toast({
          title: 'Maturador Ativado',
          description: 'O processo de aquecimento entre os chips selecionados foi iniciado.',
        })
      } else {
        toast({
          title: 'Maturador Pausado',
          description: 'O processo de aquecimento foi interrompido.',
        })
      }
    } catch {
      setConfig({ ...config, is_active: !checked })
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status global.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    )

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Maturador de Chip
          </h1>
          <p className="text-slate-500 mt-1">
            Proteja seus chips de banimentos simulando conversas humanas automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-3 px-5 rounded-lg border">
          <Label
            className="font-semibold text-sm cursor-pointer select-none"
            htmlFor="global-toggle"
          >
            {config.is_active ? 'Maturação Ativa' : 'Maturação Pausada'}
          </Label>
          <Switch
            id="global-toggle"
            checked={config.is_active}
            onCheckedChange={toggleGlobal}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Instâncias Participantes</CardTitle>
            <CardDescription>
              Selecione quais números conectados irão interagir entre si.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {instances.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 bg-slate-50 border border-dashed rounded-lg text-center">
                Nenhuma instância cadastrada.
              </div>
            ) : (
              instances.map((inst) => (
                <div
                  key={inst.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    inst.is_maturador_active
                      ? 'bg-green-50/50 border-green-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`p-2 rounded-full ${inst.status === 'CONECTADO' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}
                    >
                      <Smartphone className="h-4 w-4 flex-shrink-0" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate text-slate-800">{inst.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">
                        {inst.status}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={inst.is_maturador_active}
                    onCheckedChange={() => toggleInstance(inst.id, inst.is_maturador_active)}
                    disabled={inst.status !== 'CONECTADO'}
                    className="data-[state=checked]:bg-green-500 ml-2"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Configurações de Diálogo</CardTitle>
            <CardDescription>
              Ajuste o tempo de espera e defina as frases que os chips enviarão uns aos outros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border">
              <div className="space-y-2">
                <Label>Delay Mínimo (segundos)</Label>
                <Input
                  type="number"
                  min="1"
                  value={config.min_delay}
                  className="bg-white"
                  onChange={(e) => setConfig({ ...config, min_delay: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Delay Máximo (segundos)</Label>
                <Input
                  type="number"
                  min="2"
                  value={config.max_delay}
                  className="bg-white"
                  onChange={(e) => setConfig({ ...config, max_delay: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-base font-semibold">Base de Frases</Label>
                <span className="text-[10px] text-slate-500 font-medium uppercase bg-slate-100 px-2 py-1 rounded">
                  Spintax Suportado {'{Opção 1|Opção 2}'}
                </span>
              </div>
              <Textarea
                className="font-mono text-sm min-h-[220px] resize-y leading-relaxed p-4"
                value={phrasesText}
                onChange={(e) => setPhrasesText(e.target.value)}
                placeholder="{Oi|Olá|Opa}, tudo bem?\nBom dia, como você está?\n{Qual a boa?|Novidades?}\nTudo ótimo por aqui!"
              />
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Insira uma frase ou Spintax por linha.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full h-11"
                size="lg"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-5 w-5" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
