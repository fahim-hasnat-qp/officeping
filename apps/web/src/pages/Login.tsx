import { useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { DEMO_USERS } from '@officeping/shared';
import { demoLogin, googleLogin } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1A1714',
        color: '#F7F5F1',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 24px 24px',
        }}
      >
        {/* Brand section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Icon tile */}
          <div
            style={{
              width: 64,
              height: 64,
              backgroundColor: '#B07D2E',
              color: '#1A1714',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="bell" size={34} stroke={2} />
          </div>

          {/* App name */}
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: '-1px',
              lineHeight: 1,
              marginTop: 20,
            }}
          >
            DingDong
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 16,
              color: '#DDD8CF',
              marginTop: 12,
              lineHeight: 1.45,
              maxWidth: 280,
            }}
          >
            Your office, one ping away. Coffee, supplies, IT — handled.
          </div>
        </div>

        {/* Actions section */}
        <div>
          {/* Primary SSO button */}
          <button
            onClick={triggerGoogleLogin}
            style={{
              height: 54,
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: '#B07D2E',
              color: '#1A1714',
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
            Continue with QuestionPro SSO
          </button>

          {/* Secondary button */}
          <button
            onClick={triggerGoogleLogin}
            style={{
              height: 50,
              marginTop: 12,
              fontSize: 15,
              backgroundColor: 'transparent',
              color: '#F7F5F1',
              border: '1px solid rgba(247,245,241,0.25)',
              borderRadius: 12,
              width: '100%',
              cursor: 'pointer',
            }}
          >
            Use work email instead
          </button>

          {/* Fine print */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: '#DDD8CF',
              marginTop: 20,
              lineHeight: 1.5,
            }}
          >
            For QuestionPro staff only.
            <br />
            By continuing you agree to the office use policy.
          </div>

          {/* Demo accounts */}
          {isDemoMode && (
            <div style={{ marginTop: 32 }}>
              {/* Divider */}
              <div
                style={{
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  marginBottom: 16,
                }}
              />

              {/* Section label */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#7A7369',
                  marginBottom: 10,
                }}
              >
                Demo Accounts
              </div>

              {/* Demo user buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={async () => {
                      const auth = await demoLogin(u.email);
                      handleAuth(auth);
                    }}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#7A7369',
                        marginBottom: 2,
                      }}
                    >
                      {u.role}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#F7F5F1',
                      }}
                    >
                      {u.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
