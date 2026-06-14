import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createCompliment } from '@/lib/api';
import { useRequestStore } from '@/store/requestStore';
import { useUiStore } from '@/store/uiStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import Avatar from '@/components/Avatar';
import Toggle from '@/components/Toggle';
import Icon from '@/components/Icon';

const VIBE_PRESETS = [
  'Fast and friendly',
  'Went above and beyond',
  'Made my day',
  'Always reliable',
];

export default function SendCompliment() {
  const navigate = useNavigate();
  const { staffId } = useParams<{ staffId: string }>();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') ?? undefined;

  const { requests, patchRequest } = useRequestStore();
  const { showToast } = useUiStore();

  const [selectedVibe, setSelectedVibe] = useState(VIBE_PRESETS[0]);
  const [note, setNote] = useState('');
  const [shareOnWall, setShareOnWall] = useState(false);
  const [sending, setSending] = useState(false);

  // Resolve staff name + category from request store if available
  const matchedRequest = requests.find(
    (r) => r.id === requestId || (staffId && r.staff?.id === staffId),
  );
  const staffName = matchedRequest?.staff?.name ?? 'your colleague';
  const categoryName = matchedRequest?.category?.name ?? '';

  const handleSubmit = async () => {
    if (!staffId) return;
    setSending(true);
    const message = note.trim()
      ? `${selectedVibe}. ${note.trim()}`
      : selectedVibe;
    try {
      await createCompliment({
        toStaffId: staffId,
        requestId: requestId ?? '',
        message,
      });
      if (requestId) patchRequest(requestId, { complimentSent: true });
      showToast('Compliment sent!');
      navigate(-1);
    } catch {
      showToast('Failed to send compliment');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <Header title="Send a compliment" back />

      {/* Scrollable body — leaves room for sticky footer */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px' }}>
        {/* Recipient block */}
        <div style={{ textAlign: 'center', paddingTop: 8, marginBottom: 28 }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <Avatar name={staffName} size={72} gold />
            {/* Heart badge */}
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                background: '#B07D2E',
                color: '#FFFFFF',
                border: '3px solid #F7F5F1',
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="heart" size={14} fill style={{ color: '#FFFFFF' }} />
            </div>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 500,
              color: 'var(--ink)',
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            Thank {staffName}
          </h2>
          {categoryName && (
            <p style={{ fontSize: 13.5, color: '#7A7369', marginTop: 2, marginBottom: 0 }}>
              For: {categoryName}
            </p>
          )}
        </div>

        {/* Vibe presets */}
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              color: '#7A7369',
              marginBottom: 10,
            }}
          >
            Pick a vibe
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VIBE_PRESETS.map((vibe) => {
              const isSelected = selectedVibe === vibe;
              return (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => setSelectedVibe(vibe)}
                  style={{
                    height: 'auto',
                    padding: '8px 16px',
                    border: isSelected ? '1px solid #B07D2E' : '1px solid #DDD8CF',
                    background: isSelected ? '#B07D2E' : 'transparent',
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 500,
                    color: isSelected ? '#FFFFFF' : 'var(--ink)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional note */}
        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              color: '#7A7369',
              marginBottom: 10,
            }}
          >
            Add a note · optional
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write something kind…"
            style={{
              width: '100%',
              minHeight: 84,
              border: '1px solid #DDD8CF',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 15,
              color: 'var(--ink)',
              background: '#FFFFFF',
              resize: 'none',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Share on team wall */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DDD8CF',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', margin: 0 }}>
              Share on the team wall
            </p>
            <p style={{ fontSize: 12.5, color: '#7A7369', margin: '2px 0 0' }}>
              Celebrate publicly with the whole team
            </p>
          </div>
          <Toggle
            on={shareOnWall}
            onChange={() => setShareOnWall(!shareOnWall)}
            size="md"
            color="gold"
          />
        </div>
      </div>

      {/* Sticky footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 390,
          padding: '16px 20px',
          borderTop: '1px solid #EDE9E3',
          background: '#F7F5F1',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={sending}
          style={{
            width: '100%',
            height: 52,
            fontSize: 16,
            fontWeight: 600,
            background: sending ? '#C99B4A' : '#B07D2E',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: sending ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Icon name="heart" size={19} fill style={{ color: '#FFFFFF' }} />
          {sending ? 'Sending…' : 'Send compliment'}
        </button>
      </div>
    </AppShell>
  );
}
