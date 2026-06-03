import { useState, useEffect } from 'react'
import { maturadorService } from '@/services/maturador'
import { MaturadorConfig } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Zap } from 'lucide-react'

export default function Maturador() {
  const [config, setConfig] = useState<Partial<MaturadorConfig>>({
    is_active: false,
    min_delay: 40,
    max_delay: 90,
    dialogue_tree: {},
  })
  const [dialogueText, setDialogueText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    maturadorService.getConfig().then((data) => {
      if (data) {
        setConfig(data)
        setDialogueText(JSON.stringify(data.dialogue_tree, null, 2))
      }
      setIsLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      let parsedTree = {}
      try {
        parsedTree = JSON.parse(dialogueText || '{}')
      } catch {
        toast({
          title: 'JSON Inválido',
          description: 'A árvore de diálogo precisa ser um JSON válido.',
          variant: 'destructive',
        })
        setIsSaving(false)
        return
      }
      await maturadorService.saveConfig({ ...config, dialogue_tree: parsedTree })
      toast({ title: 'Salvo', description: 'Configurações do maturador atualizadas.' })
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar configurações.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    )

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Maturador de Chip
          </h1>
          <p className="text-slate-500">
            Aumente a confiança dos seus chips simulando diálogos entre eles.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais</CardTitle>
          <CardDescription>
            O maturador usará todas as instâncias conectadas no modo "Round-Robin" interno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div>
              <p className="font-medium text-slate-900">Ativar Maturador</p>
              <p className="text-sm text-slate-500">Inicia ou pausa o algoritmo de aquecimento.</p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(c) => setConfig({ ...config, is_active: c })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delay Mínimo (segundos)</Label>
              <Input
                type="number"
                value={config.min_delay}
                onChange={(e) => setConfig({ ...config, min_delay: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Delay Máximo (segundos)</Label>
              <Input
                type="number"
                value={config.max_delay}
                onChange={(e) => setConfig({ ...config, max_delay: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Árvore de Diálogo (JSON)</Label>
            <Textarea
              className="font-mono text-sm h-64 bg-slate-50"
              value={dialogueText}
              onChange={(e) => setDialogueText(e.target.value)}
              placeholder={
                '{\n  "greetings": ["Oi", "Olá, tudo bem?"],\n  "responses": ["Tudo ótimo", "Tudo bem, e você?"]\n}'
              }
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
