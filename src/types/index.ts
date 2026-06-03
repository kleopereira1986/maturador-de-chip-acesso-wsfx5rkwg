export type UserRole = 'master' | 'gerente' | 'corretor'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
  updated_at: string
}
