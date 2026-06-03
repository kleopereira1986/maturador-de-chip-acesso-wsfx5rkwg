import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'

import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Instances from './pages/Instances'
import Campaigns from './pages/Campaigns'
import Maturador from './pages/Maturador'
import Dialer from './pages/Dialer'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public Login Route */}
          <Route path="/" element={<Index />} />

          {/* Protected Routes Wrapper */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Common Routes */}
              <Route path="/instancias" element={<Instances />} />
              <Route path="/campanhas" element={<Campaigns />} />
              <Route path="/discador" element={<Dialer />} />

              {/* Role Restricted Routes */}
              <Route element={<ProtectedRoute allowedRoles={['master', 'gerente']} />}>
                <Route path="/usuarios" element={<Users />} />
                <Route path="/maturador" element={<Maturador />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
