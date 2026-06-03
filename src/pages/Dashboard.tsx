import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCog, ShieldCheck, UserCheck } from 'lucide-react'
import { usersService } from '@/services/users'
import { Profile } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    total: 0,
    master: 0,
    gerente: 0,
    corretor: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
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
      } catch (error) {
        console.error('Failed to fetch stats', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (profile?.role === 'master' || profile?.role === 'gerente') {
      fetchStats()
    } else {
      setIsLoading(false)
    }
  }, [profile])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Bem-vindo, {profile?.full_name.split(' ')[0]}!
        </h1>
        <p className="text-slate-500">Este é o painel de controle do Maturador de Chip.</p>
      </div>

      {(profile?.role === 'master' || profile?.role === 'gerente') && (
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
      )}

      {profile?.role === 'corretor' && (
        <Card className="border-slate-200">
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
      )}
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
}: {
  title: string
  value: number
  icon: any
  loading: boolean
  className?: string
  iconColor?: string
}) {
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
