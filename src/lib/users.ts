import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

interface CreateUserData {
  email: string
  password: string
  fullName: string
  role: string
}

export async function getUsers() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    throw error
  }

  return profiles as User[]
}

export async function createUser(userData: CreateUserData) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        role: userData.role
      }
    }
  })

  if (authError) throw authError

  if (!authData.user) {
    throw new Error('No user data returned from signup')
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      full_name: userData.fullName,
      role: userData.role 
    })
    .eq('id', authData.user.id)

  if (updateError) throw updateError
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.full_name,
      role: updates.role
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteUser(id: string) {
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) throw error
}