/**
 * Re-export the useAuth hook from AuthContext for convenience
 * This allows importing useAuth directly from hooks directory
 */
export { 
  useAuth, 
  useIsAuthenticated, 
  useCurrentUser, 
  useAuthActions 
} from '@/contexts/AuthContext';