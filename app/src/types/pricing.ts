import type { PricingTier } from './index';

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    pricePerTenant: 0,
    currency: 'GBP',
    maxTenants: 3,
    supportLevel: 'Community',
    features: [
      'Up to 3 tenants',
      'Basic device management',
      'Device compliance monitoring',
      'Standard dashboard',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    pricePerTenant: 25,
    currency: 'GBP',
    maxTenants: null,
    supportLevel: 'Priority Email',
    features: [
      'Unlimited tenants',
      'Advanced device management',
      'Bulk operations',
      'Executive dashboards',
      'Trend analytics & reporting',
      'SLA tracking',
      'Technician notes',
      'PSA integrations',
      'Export center',
      'Priority email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    pricePerTenant: 45,
    currency: 'GBP',
    maxTenants: null,
    supportLevel: 'Dedicated Account Manager',
    features: [
      'Everything in Pro',
      'Custom branding',
      'Advanced RBAC',
      'Incident response module',
      'Policy drift detection',
      'Baseline management',
      'Conditional Access management',
      'Webhook integrations',
      'API access',
      'Custom reports',
      'Dedicated account manager',
      'SLA-backed uptime guarantee',
    ],
  },
];

export function formatPrice(tier: PricingTier): string {
  if (tier.pricePerTenant === 0) return 'Free';
  return `£${tier.pricePerTenant}/tenant/month`;
}

export function getMonthlyPrice(tier: PricingTier, tenantCount: number): number {
  return tier.pricePerTenant * tenantCount;
}
