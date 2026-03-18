import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { tenants } = await api.tenants.list();
      return tenants;
    },
    staleTime: 60_000,
  });
}

export function useConnectTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { tenantId: string; displayName: string; domain: string }) =>
      api.tenants.connect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useDisconnectTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.tenants.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
