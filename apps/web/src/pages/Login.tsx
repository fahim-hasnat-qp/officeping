import { useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { DEMO_USERS } from '@officeping/shared';
import { demoLogin, googleLogin } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import AppShell from '@/components/Layout/AppShell';
import Icon from '@/components/Icon';

export default function Login() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const googleRef = useRef<HTMLDivElement>(null);

  const handleAuth = async (auth: { accessToken: string; user: import('@officeping/shared').UserDto }) => {
    setAuth(auth.user, auth.accessToken);
    connectSocket(auth.accessToken);
    navigate('/');
  };

  const triggerGoogleLogin = () => {
    googleRef.current?.querySelector<HTMLElement>('div[role="button"]')?.click();
  };

  return (
    <AppShell>
      {/* Hidden Google Login */}
      <div
        ref={googleRef}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
        aria-hidden="true"
      >
        <GoogleLogin
          onSuccess={async (cred) => {
            if (!cred.credential) return;
            const auth = await googleLogin(cred.credential);
            handleAuth(auth);
          }}
          onError={() => console.error('Google login failed')}
          useOneTap={false}
        />
      </div>

      {/* Brand */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 24px',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            backgroundColor: 'var(--gold)',
            color: 'var(--surface)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="bell" size={34} stroke={2} />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: '-1px',
            lineHeight: 1,
            marginTop: 20,
            color: 'var(--ink)',
          }}
        >
          OfficePing
        </div>

        <div
          style={{
            fontSize: 15,
            color: 'var(--ink3)',
            marginTop: 10,
            lineHeight: 1.45,
            maxWidth: 260,
          }}
        >
          Your office, one ping away.
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '0 24px 40px' }}>
        <button
          onClick={triggerGoogleLogin}
          style={{
            height: 52,
            fontSize: 15,
            fontWeight: 600,
            backgroundColor: 'var(--gold)',
            color: '#fff',
            borderRadius: 12,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Icon name="arrowUpRight" size={18} stroke={2.1} />
          Continue with Google
        </button>

        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--ink3)',
            marginTop: 14,
          }}
        >
          For QuestionPro staff only.
        </div>

        {isDemoMode && (
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                height: 1,
                backgroundColor: 'var(--surface3)',
                marginBottom: 14,
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--ink3)',
                marginBottom: 10,
              }}
            >
              Demo Accounts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={async () => {
                    const auth = await demoLogin(u.email);
                    handleAuth(auth);
                  }}
                  style={{
                    backgroundColor: 'var(--surface2)',
                    border: '1px solid var(--surface3)',
                    borderRadius: 12,
                    padding: '11px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                    {u.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--ink3)',
                    }}
                  >
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
