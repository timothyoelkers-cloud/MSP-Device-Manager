# Partner Center GDAP Setup Guide

This guide walks through configuring Azure App Registration and GDAP relationships so MSP Device Manager can manage customer tenants via the Partner Center API.

## Prerequisites

- You are a Microsoft CSP (Cloud Solution Provider) partner
- You have Partner Center admin access
- You have an Azure AD tenant (your MSP tenant)
- GDAP relationships are established with your customer tenants

---

## Step 1: App Registration in Azure AD

1. Go to [Azure Portal > App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
3. Configure:
   - **Name**: `MSP Device Manager`
   - **Supported account types**: **Accounts in any organizational directory (Multitenant)**
   - **Redirect URI**: Select **Single-page application (SPA)** and enter:
     - `https://<your-github-username>.github.io/MSP-Device-Manager/`
     - `http://localhost:8080/` (for local testing)
4. Click **Register**
5. Copy the **Application (client) ID** — you'll put this in `js/auth.js`

## Step 2: API Permissions

In your App Registration, go to **API permissions > Add a permission**:

### Microsoft Graph (Delegated)

| Permission | Purpose |
|---|---|
| `User.Read` | Read signed-in user profile |
| `DeviceManagementManagedDevices.ReadWrite.All` | Manage Intune devices |
| `DeviceManagementConfiguration.ReadWrite.All` | Manage compliance & config policies |
| `DeviceManagementApps.ReadWrite.All` | Manage mobile apps |
| `DeviceManagementServiceConfig.ReadWrite.All` | Manage Intune service settings |
| `DeviceManagementRBAC.ReadWrite.All` | Manage role-based access |
| `Directory.Read.All` | Read directory data |
| `Group.ReadWrite.All` | Manage groups |
| `GroupMember.ReadWrite.All` | Manage group memberships |

### Partner Center API (Delegated)

1. Click **Add a permission > APIs my organization uses**
2. Search for **Microsoft Partner Center** (or `fa3d9a0c-3fb0-42cc-9193-47c7ecd2edbd`)
3. Select **Delegated permissions > user_impersonation**

### Grant Admin Consent

Click **Grant admin consent for [Your Org]** to consent to all permissions in your MSP tenant.

> **Note:** For customer tenants, permissions are granted through the GDAP relationship, not through separate consent. The GDAP security groups control which permissions your technicians have in each customer tenant.

## Step 3: Configure GDAP Relationships

GDAP (Granular Delegated Admin Privileges) replaces the older DAP model. Each customer relationship specifies exactly which Azure AD roles your MSP has access to.

### Required Azure AD Roles for Device Management

When creating or modifying GDAP relationships, request these roles:

| Azure AD Role | Purpose |
|---|---|
| **Intune Administrator** | Full Intune device management (required) |
| **Cloud Device Administrator** | Manage devices in Azure AD |
| **Security Reader** | View security policies and alerts |
| **Groups Administrator** | Manage group assignments |

### Create GDAP Relationship (Partner Center)

1. Go to [Partner Center > Customers](https://partner.microsoft.com/dashboard/commerce2/customers/list)
2. Select a customer > **Admin relationships**
3. Click **Request new GDAP relationship**
4. Configure:
   - **Name**: e.g., `Device Management - Contoso`
   - **Duration**: Choose appropriate duration (max 730 days)
   - **Azure AD Roles**: Select the roles listed above
5. Send the link to your customer for approval
6. Once approved, assign your MSP security groups to the GDAP relationship

### Assign Security Groups

After the customer approves the GDAP relationship:

1. In Partner Center, go to the approved relationship
2. Click **Add security groups**
3. Map your MSP Azure AD security groups to the GDAP roles:
   - e.g., `MSP-Intune-Admins` → Intune Administrator
   - e.g., `MSP-Device-Readers` → Security Reader
4. Technicians in those groups will now have delegated access

## Step 4: Configure the App

Update `js/auth.js` with your App Registration client ID:

```javascript
msalConfig: {
  auth: {
    clientId: 'YOUR-CLIENT-ID-HERE',  // From Step 1
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin + window.location.pathname,
  }
}
```

## Step 5: Connect via Partner Center

1. Open MSP Device Manager
2. Click **Connect Tenant**
3. Choose **Partner Center (GDAP)**
4. Sign in with your MSP partner account
5. Customer tenants with active GDAP relationships will be imported automatically
6. The app acquires delegated tokens for each customer tenant using your GDAP permissions

---

## How Authentication Flows Work

### Single Tenant (Direct)
```
User → MSAL popup → Azure AD → Access token for that tenant → Graph API
```

### Partner Center (GDAP Multi-Tenant)
```
User → MSAL popup → Partner Center token
     → Fetch customer list from Partner Center API
     → For each customer: acquire delegated Graph token via GDAP
     → Graph API calls per tenant
```

The GDAP model means:
- Your technician signs in **once** with their MSP account
- The app discovers all customer tenants via Partner Center
- Delegated tokens are acquired per-tenant using the GDAP relationship
- Permissions are scoped to the Azure AD roles in the GDAP relationship

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "AADSTS65001: consent required" | Grant admin consent in your App Registration, or the GDAP relationship may not include the required roles |
| "Partner API returned 403" | Ensure your account has Partner Center admin/agent role |
| No customers returned | Check that GDAP relationships are approved and active |
| Token acquisition fails for a tenant | Verify the GDAP relationship includes Intune Administrator role and your security group is assigned |
| "interaction_required" popup loops | Clear session storage and re-authenticate; the GDAP relationship may have expired |

---

## Security Best Practices

1. **Least privilege**: Only request the Azure AD roles you actually need in GDAP relationships
2. **Time-bound access**: Set GDAP duration to the minimum required (e.g., 365 days, not 730)
3. **Security groups**: Use dedicated security groups for GDAP role mapping — don't use broad groups
4. **Conditional Access**: Apply conditional access policies to your MSP technician accounts (MFA, compliant device, named locations)
5. **Audit logging**: Monitor Partner Center audit logs for relationship changes
6. **Session storage**: The app uses `sessionStorage` (not `localStorage`) for tokens — they clear when the browser tab closes
