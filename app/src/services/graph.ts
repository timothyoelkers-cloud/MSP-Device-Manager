import { api } from './api';
import type { Device, GraphUser, Group, CompliancePolicy, GraphResponse } from '@/types';

export const graphService = {
  devices: {
    list: (tenantId: string) =>
      api.graph.get<GraphResponse<Device>>(tenantId, 'v1.0/deviceManagement/managedDevices?$select=id,deviceName,managementState,operatingSystem,osVersion,complianceState,userDisplayName,userPrincipalName,lastSyncDateTime,enrolledDateTime,manufacturer,model,serialNumber,totalStorageSpaceInBytes,freeStorageSpaceInBytes,managedDeviceOwnerType'),
    get: (tenantId: string, deviceId: string) =>
      api.graph.get<Device>(tenantId, `v1.0/deviceManagement/managedDevices/${deviceId}`),
    sync: (tenantId: string, deviceId: string) =>
      api.graph.post(tenantId, `v1.0/deviceManagement/managedDevices/${deviceId}/syncDevice`),
    restart: (tenantId: string, deviceId: string) =>
      api.graph.post(tenantId, `v1.0/deviceManagement/managedDevices/${deviceId}/rebootNow`),
    wipe: (tenantId: string, deviceId: string) =>
      api.graph.post(tenantId, `v1.0/deviceManagement/managedDevices/${deviceId}/wipe`),
    retire: (tenantId: string, deviceId: string) =>
      api.graph.post(tenantId, `v1.0/deviceManagement/managedDevices/${deviceId}/retire`),
    remoteLock: (tenantId: string, deviceId: string) =>
      api.graph.post(tenantId, `v1.0/deviceManagement/managedDevices/${deviceId}/remoteLock`),
    resetPasscode: (tenantId: string, deviceId: string) =>
      api.graph.post(tenantId, `v1.0/deviceManagement/managedDevices/${deviceId}/resetPasscode`),
  },

  users: {
    list: (tenantId: string) =>
      api.graph.get<GraphResponse<GraphUser>>(tenantId, 'v1.0/users?$select=id,displayName,userPrincipalName,mail,department,jobTitle,accountEnabled,assignedLicenses&$top=999'),
    get: (tenantId: string, userId: string) =>
      api.graph.get<GraphUser>(tenantId, `v1.0/users/${userId}`),
  },

  groups: {
    list: (tenantId: string) =>
      api.graph.get<GraphResponse<Group>>(tenantId, 'v1.0/groups?$select=id,displayName,description,groupTypes&$top=999'),
    get: (tenantId: string, groupId: string) =>
      api.graph.get<Group>(tenantId, `v1.0/groups/${groupId}`),
    members: (tenantId: string, groupId: string) =>
      api.graph.get<GraphResponse<GraphUser>>(tenantId, `v1.0/groups/${groupId}/members`),
  },

  compliance: {
    policies: (tenantId: string) =>
      api.graph.get<GraphResponse<CompliancePolicy>>(tenantId, 'v1.0/deviceManagement/deviceCompliancePolicies'),
  },

  configurations: {
    list: (tenantId: string) =>
      api.graph.get<GraphResponse<Record<string, unknown>>>(tenantId, 'v1.0/deviceManagement/deviceConfigurations'),
  },

  autopilot: {
    devices: (tenantId: string) =>
      api.graph.get<GraphResponse<Record<string, unknown>>>(tenantId, 'v1.0/deviceManagement/windowsAutopilotDeviceIdentities'),
  },

  licenses: {
    list: (tenantId: string) =>
      api.graph.get<GraphResponse<Record<string, unknown>>>(tenantId, 'v1.0/subscribedSkus'),
  },

  organization: {
    get: (tenantId: string) =>
      api.graph.get<GraphResponse<Record<string, unknown>>>(tenantId, 'v1.0/organization'),
  },
};
