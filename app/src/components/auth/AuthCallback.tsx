import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';

export function AuthCallback() {
  const { instance } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    instance.handleRedirectPromise().then((response) => {
      if (response) {
        navigate(response.state || '/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }).catch(() => {
      navigate('/login', { replace: true });
    });
  }, [instance, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)' }}>Completing sign-in...</p>
    </div>
  );
}
