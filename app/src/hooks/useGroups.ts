import { useQuery } from '@tanstack/react-query';
import { graphService } from '@/services/graph';

export function useGroups(tenantId: string) {
  return useQuery({
    queryKey: ['groups', tenantId],
    queryFn: async () => {
      const response = await graphService.groups.list(tenantId);
      return (response.value || []).map((g) => ({ ...g, tenantId }));
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useAllGroups(tenantIds: string[]) {
  return useQuery({
    queryKey: ['groups', 'all', tenantIds],
    queryFn: async () => {
      const results = await Promise.all(
        tenantIds.map(async (tid) => {
          try {
            const response = await graphService.groups.list(tid);
            return (response.value || []).map((g) => ({ ...g, tenantId: tid }));
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
