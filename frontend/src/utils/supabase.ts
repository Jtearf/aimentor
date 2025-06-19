import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

// Initialize the Supabase client with Vite environment variables
// These ARE environment variables, injected at build time by Vite
// They must be prefixed with VITE_ to be exposed to the client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Ensure environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anonymous Key. Please check your environment variables.')
}

// Create and export the Supabase client
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options)

// Track current session state
export const getSessionState = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Auth helper functions
export const signUp = async (email: string, password: string, metaData = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metaData
    }
  })
  
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export const getSession = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// OAuth sign in with providers
export const signInWithProvider = async (provider: 'google' | 'github') => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider
  })
  
  return { data, error }
}
