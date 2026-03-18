import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: 64, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>404</h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 24 }}>Page not found</p>
        <Link to="/dashboard" className="btn btn-primary" style={{ gap: 8 }}>
          <Home size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
