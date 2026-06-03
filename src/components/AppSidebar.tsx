import { Link, useLocation } from 'react-router-dom'
import { Home, Users, LogOut, Shield, Smartphone, Megaphone, Zap, PhoneCall } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    {
      title: 'Início',
      url: '/dashboard',
      icon: Home,
      roles: ['master', 'gerente', 'corretor'],
    },
    {
      title: 'Instâncias WhatsApp',
      url: '/instancias',
      icon: Smartphone,
      roles: ['master', 'gerente'],
    },
    {
      title: 'Campanhas',
      url: '/campanhas',
      icon: Megaphone,
      roles: ['master', 'gerente'],
    },
    {
      title: 'Maturador',
      url: '/maturador',
      icon: Zap,
      roles: ['master', 'gerente'],
    },
    {
      title: 'Discador Preditivo',
      url: '/discador',
      icon: PhoneCall,
      roles: ['master', 'gerente', 'corretor'],
    },
    {
      title: 'Gestão de Usuários',
      url: '/usuarios',
      icon: Users,
      roles: ['master', 'gerente'],
    },
  ]

  return (
    <Sidebar variant="inset" className="border-r border-slate-200 bg-slate-50 dark:bg-slate-900">
      <SidebarHeader className="py-6 px-4">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="truncate">Chip Maturer</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="px-2 pt-4">
        <SidebarMenu>
          {navItems.map((item) => {
            if (!profile || !item.roles.includes(profile.role)) return null

            const isActive = location.pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="font-medium"
                >
                  <Link to={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">
              {profile?.full_name}
            </span>
            <span className="text-xs text-slate-500 capitalize">Perfil: {profile?.role}</span>
          </div>
          <SidebarMenuButton
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 font-medium justify-start"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair da conta</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
