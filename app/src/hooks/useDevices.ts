import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphService } from '@/services/graph';
import type { Device, DeviceActionType, DeviceFilter } from '@/types';

export function useDevices(tenantIds: string[], filter?: DeviceFilter) {
  return useQuery({
    queryKey: ['devices', tenantIds, filter],
    queryFn: async () => {
      const results = await Promise.all(
        tenantIds.map(async (tid) => {
          try {
            const response = await graphService.devices.list(tid);
            return (response.value || []).map((d) => ({ ...d, tenantId: tid }));
          } catch {
            return [];
          }
        })
      );
      let devices = results.flat() as Device[];

      if (filter?.search) {
        const q = filter.search.toLowerCase();
        devices = devices.filter(
          (d) =>
            d.deviceName?.toLowerCase().includes(q) ||
            d.userDisplayName?.toLowerCase().includes(q) ||
            d.userPrincipalName?.toLowerCase().includes(q) ||
            d.serialNumber?.toLowerCase().includes(q)
        );
      }
      if (filter?.complianceState) {
        devices = devices.filter((d) => d.complianceState === filter.complianceState);
      }
      if (filter?.operatingSystem) {
        devices = devices.filter((d) => d.operatingSystem === filter.operatingSystem);
      }
      if (filter?.tenantId) {
        devices = devices.filter((d) => d.tenantId === filter.tenantId);
      }

      return devices;
    },
    enabled: tenantIds.length > 0,
    staleTime: 60_000,
  });
}

export function useDevice(tenantId: string, deviceId: string) {
  return useQuery({
    queryKey: ['device', tenantId, deviceId],
    queryFn: () => graphService.devices.get(tenantId, deviceId),
    enabled: !!tenantId && !!deviceId,
  });
}

export function useDeviceAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, tenantId, deviceId }: { action: DeviceActionType; tenantId: string; deviceId: string }) => {
      const actions: Record<string, (tid: string, did: string) => Promise<unknown>> = {
        syncDevice: graphService.devices.sync,
        rebootNow: graphService.devices.restart,
        wipe: graphService.devices.wipe,
        retire: graphService.devices.retire,
        remoteLock: graphService.devices.remoteLock,
        resetPasscode: graphService.devices.resetPasscode,
      };
      const fn = actions[action];
      if (!fn) throw new Error(`Unknown action: ${action}`);
      return fn(tenantId, deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device'] });
    },
  });
}

export function useDeviceStats(devices: Device[] | undefined) {
  if (!devices) return { total: 0, compliant: 0, nonCompliant: 0, stale: 0, complianceRate: 0 };

  const total = devices.length;
  const compliant = devices.filter((d) => d.complianceState === 'compliant').length;
  const nonCompliant = devices.filter((d) => d.complianceState === 'noncompliant').length;
  const staleThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const stale = devices.filter((d) => new Date(d.lastSyncDateTime).getTime() < staleThreshold).length;
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

  return { total, compliant, nonCompliant, stale, complianceRate };
}
