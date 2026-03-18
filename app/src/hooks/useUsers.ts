import { useQuery } from '@tanstack/react-query';
import { graphService } from '@/services/graph';

export function useUsers(tenantId: string) {
  return useQuery({
    queryKey: ['users', tenantId],
    queryFn: async () => {
      const response = await graphService.users.list(tenantId);
      return (response.value || []).map((u) => ({ ...u, tenantId }));
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useAllUsers(tenantIds: string[]) {
  return useQuery({
    queryKey: ['users', 'all', tenantIds],
    queryFn: async () => {
      const results = await Promise.all(
        tenantIds.map(async (tid) => {
          try {
            const response = await graphService.users.list(tid);
            return (response.value || []).map((u) => ({ ...u, tenantId: tid }));
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: tenantIds.length > 0,
    staleTime: 60_000,
  });
}
