const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA_URL = 'https://graph.microsoft.com/beta';

const COSMOS_DATABASE = process.env.COSMOS_DATABASE_NAME || 'mspdevicemanager';

const COSMOS_CONTAINERS = {
    customers: 'customers',
    tenants: 'tenants',
    tokens: 'tokens',
    auditLog: 'auditLog'
};

const GRAPH_SCOPES = [
    'DeviceManagementManagedDevices.ReadWrite.All',
    'DeviceManagementConfiguration.ReadWrite.All',
    'DeviceManagementApps.ReadWrite.All',
    'DeviceManagementServiceConfig.ReadWrite.All',
    'DeviceManagementRBAC.ReadWrite.All',
    'Directory.Read.All',
    'User.Read.All',
    'Group.Read.All',
    'Organization.Read.All'
];

const TOKEN_EXPIRY_BUFFER = 300;
const MAX_RETRY = 3;
const SESSION_COOKIE_NAME = 'msp_session';

module.exports = {
    GRAPH_BASE_URL,
    GRAPH_BETA_URL,
    COSMOS_DATABASE,
    COSMOS_CONTAINERS,
    GRAPH_SCOPES,
    TOKEN_EXPIRY_BUFFER,
    MAX_RETRY,
    SESSION_COOKIE_NAME
};
