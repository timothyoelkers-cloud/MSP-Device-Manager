import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function PlaceholderPage({ title, description, icon: Icon = Construction }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center' }}>
      <Icon size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>{title}</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
        {description || 'This feature is coming soon. Stay tuned for updates.'}
      </p>
    </div>
  );
}
