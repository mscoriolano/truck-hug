import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'manager' | 'driver' | 'viewer';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
}

/**
 * Hook to get the current user's role
 */
export function useUserRole() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user_profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If profile doesn't exist, return default role
        console.warn('Profile not found, using default role');
        return {
          id: '',
          user_id: user.id,
          full_name: user.email?.split('@')[0] || null,
          role: 'driver' as UserRole,
          avatar_url: null,
        };
      }

      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const role = profile?.role || 'driver';

  return {
    profile,
    role,
    isAdmin: role === 'admin',
    isManager: role === 'admin' || role === 'manager',
    isDriver: role === 'driver',
    canManageFleet: role === 'admin' || role === 'manager',
    canViewSensitiveData: role === 'admin' || role === 'manager',
    isLoading,
  };
}

/**
 * Hook to check if user has specific permissions
 */
export function usePermission(requiredRole: UserRole | UserRole[]) {
  const { role, isLoading } = useUserRole();

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasPermission = roles.includes(role);

  return {
    hasPermission,
    isLoading,
  };
}
