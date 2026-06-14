import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CategoryDto } from '@officeping/shared';
import { createRequest, getCategories } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRequestStore } from '@/store/requestStore';
import { useUiStore } from '@/store/uiStore';
import AppShell from '@/components/Layout/AppShell';
import Header from '@/components/Layout/Header';
import Icon from '@/components/Icon';
import Toggle from '@/components/Toggle';

export default function NewRequest() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { upsertRequest } = useRequestStore();
  const { showToast } = useUiStore();

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState(user?.deskLocation ?? '');
  const [saveAsQuick, setSaveAsQuick] = useState(false);
  const [quickLabel, setQuickLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  useEffect(() => {
    getCategories()
      .then((cats) => {
        if (cats.length > 0) setCategories(cats);
      })
      .catch(() => {
        // fallback to defaults already set
      });
  }, []);

  const handleSubmit = async () => {
    if (!selectedCategoryId || !description.trim()) {
      showToast('Please select a category and add a description');
      return;
    }
    setSubmitting(true);
    try {
      const req = await createRequest({
        categoryId: selectedCategoryId,
        description: description.trim(),
        note: note.trim() || undefined,
        location: location.trim(),
        isSavedRequest: saveAsQuick,
        quickSendLabel: saveAsQuick && quickLabel.trim() ? quickLabel.trim() : undefined,
      });
      upsertRequest(req);
      showToast('Request sent!');
      navigate('/');
    } catch {
      showToast('Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!selectedCategoryId && !!description.trim() && !submitting;

  return (
    <AppShell>
      <Header title="New request" back={true} />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 20px 0' }}>

        {/* Category grid */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--ink3)',
            marginBottom: 12,
          }}
        >
          Category
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {categories.map((cat) => {
            const selected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 4px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: selected ? '#F5E8CC' : '#fff',
                  border: selected ? '1px solid #B07D2E' : '1px solid #DDD8CF',
                  color: selected ? '#B07D2E' : '#3D3830',
                  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{cat.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, textAlign: 'center' }}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Description textarea */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--ink3)',
            marginBottom: 8,
          }}
        >
          What do you need?
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={() => setDescFocused(true)}
          onBlur={() => setDescFocused(false)}
          placeholder="Oat flat white, no sugar — extra hot if you can."
          style={{
            width: '100%',
            background: '#fff',
            border: `1px solid ${descFocused ? '#B07D2E' : '#DDD8CF'}`,
            borderRadius: 10,
            padding: '12px 16px',
            fontFamily: 'inherit',
            fontSize: 15,
            color: 'var(--ink)',
            resize: 'none',
            minHeight: 88,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 24,
            transition: 'border-color 0.15s',
          }}
        />

        {/* Location input */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--ink3)',
            marginBottom: 8,
          }}
        >
          Location
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fff',
            border: '1px solid #DDD8CF',
            borderRadius: 10,
            padding: '0 16px',
            height: 48,
            color: 'var(--ink3)',
            marginBottom: 24,
          }}
        >
          <Icon name="pin" size={18} />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Meeting Room 2, Desk 14…"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: 15,
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Note input (optional) */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--ink3)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {'Note '}
          <span
            style={{
              textTransform: 'none',
              letterSpacing: 0,
              fontWeight: 500,
              fontSize: 11,
            }}
          >
            · optional
          </span>
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fff',
            border: '1px solid #DDD8CF',
            borderRadius: 10,
            padding: '0 16px',
            height: 48,
            color: 'var(--ink3)',
            marginBottom: 24,
          }}
        >
          <Icon name="edit" size={17} />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else?"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: 15,
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Save as quick send toggle card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #DDD8CF',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', margin: 0 }}>
              Save as quick send
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--ink3)', margin: '2px 0 0' }}>
              One tap next time
            </p>
          </div>
          <Toggle size="md" color="gold" on={saveAsQuick} onChange={() => setSaveAsQuick((v) => !v)} />
        </div>

        {saveAsQuick && (
          <div style={{ marginTop: -12, marginBottom: 20 }}>
            <input
              value={quickLabel}
              onChange={(e) => setQuickLabel(e.target.value)}
              placeholder={`Label (default: ${categories.find(c => c.id === selectedCategoryId)?.name ?? 'category name'})`}
              maxLength={32}
              style={{
                width: '100%',
                height: 46,
                border: '1.5px solid #DDD8CF',
                borderRadius: 10,
                padding: '0 14px',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                background: '#FAFAF8',
                outline: 'none',
                boxSizing: 'border-box',
                color: 'var(--ink)',
              }}
            />
            <p style={{ fontSize: 11.5, color: '#7A7369', margin: '5px 0 0 2px' }}>
              This label shows on the quick-send button
            </p>
          </div>
        )}
      </div>

      {/* Sticky submit bar */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #EDE9E3',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%',
            height: 52,
            background: 'var(--ink)',
            color: 'var(--surface)',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.4,
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </AppShell>
  );
}
