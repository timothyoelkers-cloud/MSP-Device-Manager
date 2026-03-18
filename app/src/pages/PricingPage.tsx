import { PRICING_TIERS } from '@/types/pricing';
import { Check, Star, Zap, Crown } from 'lucide-react';

const tierIcons = { free: Star, pro: Zap, enterprise: Crown };

export function PricingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Pricing & Plans</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: 15 }}>
          Choose the plan that fits your MSP needs
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {PRICING_TIERS.map((tier) => {
          const Icon = tierIcons[tier.id as keyof typeof tierIcons] || Star;
          const isPopular = tier.id === 'pro';

          return (
            <div
              key={tier.id}
              className="card"
              style={{
                padding: 28,
                position: 'relative',
                border: isPopular ? '2px solid var(--primary)' : undefined,
              }}
            >
              {isPopular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--primary)', color: 'white', padding: '4px 16px',
                  borderRadius: 12, fontSize: 12, fontWeight: 600,
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Icon size={28} style={{ color: 'var(--primary)', marginBottom: 8 }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{tier.name}</h2>
                <div style={{ fontSize: 32, fontWeight: 800, margin: '8px 0' }}>
                  {tier.pricePerTenant === 0 ? 'Free' : `£${tier.pricePerTenant}`}
                  {tier.pricePerTenant > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>/tenant/month</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  {tier.maxTenants ? `Up to ${tier.maxTenants} tenants` : 'Unlimited tenants'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {tier.features.map((feature) => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Check size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`btn ${isPopular ? 'btn-primary' : ''}`}
                style={{ width: '100%', padding: '10px 20px' }}
              >
                {tier.pricePerTenant === 0 ? 'Get Started Free' : `Choose ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>Need a custom plan?</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px', fontSize: 14 }}>
          For large MSPs managing 100+ tenants, we offer custom pricing and dedicated support.
        </p>
        <button className="btn btn-primary">Contact Sales</button>
      </div>
    </div>
  );
}
