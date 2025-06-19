import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, signIn, signUp, signOut, getCurrentUser } from '../utils/supabase'
import toast from 'react-hot-toast'

interface UserData {
  id: string
  email: string
  name?: string
  avatar_url?: string
  credits: number
  plan: 'free' | 'basic' | 'premium'
}

interface AuthContextType {
  session: Session | null
  user: User | null
  userData: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initial session and user data load
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        
        if (session) {
          // Set user and authenticated state
          setUser(session.user)
          setIsAuthenticated(true)
          
          // Fetch user data from the database
          await fetchUserData(session.user.id)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeAuth()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setIsAuthenticated(session !== null)
      
      if (session?.user) {
        await fetchUserData(session.user.id)
      } else {
        setUserData(null)
      }
    })
    
    // Cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  // Fetch user data from the database
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (error) {
        throw error
      }
      
      if (data) {
        setUserData(data as UserData)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      
      // For development only - create mock user data
      // In production, this would be handled properly with error states
      setUserData({
        id: userId,
        email: user?.email || 'user@example.com',
        name: 'User',
        credits: 5,
        plan: 'free'
      })
    }
  }
  
  // Refresh user data
  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id)
    }
  }
  
  // Sign in handler
  const handleSignIn = async (email: string, password: string) => {
    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }
      
      toast.success('Signed in successfully!')
      return { success: true }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      return { success: false, error: error.message }
    }
  }
  
  // Sign up handler
  const handleSignUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await signUp(email, password, { name })
      
      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }
      
      toast.success('Signed up successfully! Check your email for confirmation.')
      return { success: true }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up')
      return { success: false, error: error.message }
    }
  }
  
  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
    }
  }
  
  const value = {
    session,
    user,
    userData,
    isLoading,
    isAuthenticated,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshUserData
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
