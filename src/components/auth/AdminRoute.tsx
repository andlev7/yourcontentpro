import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingScreen } from '../common/LoadingScreen'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  // Check if user exists and has admin role
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.role === 'admin'

  if (!user || !isAdmin) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}