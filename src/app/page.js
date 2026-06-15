'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MapPoolSelector from '@/components/MapPoolSelector';

export default function HomePage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [error, setError] = useState('');

  function handleJoin() {
    const trimmed = joinId.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a lobby ID');
      return;
    }
    router.push(`/lobby/${trimmed}`);
  }

  return (
    <div style={styles.container}>
      {/* Background decorative elements */}
      <div style={styles.bgDecor1} />
      <div style={styles.bgDecor2} />

      <div style={styles.content}>
        {/* Logo / Title */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <polygon points="24,4 44,40 4,40" fill="#ff4655" opacity="0.9" />
              <polygon points="24,12 38,38 10,38" fill="#0a0a0a" />
              <polygon points="24,20 32,36 16,36" fill="#ff4655" opacity="0.6" />
            </svg>
          </div>
          <div>
            <div style={styles.vctLabel}>내전</div>
            <h1 style={styles.title}>Ban<span style={styles.titleAccent}>/</span>Pick</h1>
            <div style={styles.subtitle}>Simulator</div>
          </div>
        </div>

        <p style={styles.description}>
          Map ban/pick simulator for BO1, BO3, and BO5 formats
        </p>

        {/* Action Buttons */}
        <div style={styles.buttonsArea}>
          <button
            style={styles.primaryBtn}
            onClick={() => router.push('/admin')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#bd3944';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ff4655';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={styles.btnIcon}>⚙</span>
            Create Lobby
            <span style={styles.btnSub}>Admin</span>
          </button>

          <button
            style={styles.secondaryBtn}
            onClick={() => setShowJoin(!showJoin)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ff4655';
              e.currentTarget.style.color = '#ff4655';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={styles.btnIcon}>🎮</span>
            Join Lobby
            <span style={styles.btnSub}>Player</span>
          </button>
        </div>

        {/* Join Input */}
        {showJoin && (
          <div style={styles.joinArea} className="fade-in">
            <div style={styles.joinRow}>
              <input
                style={styles.input}
                type="text"
                placeholder="Enter Lobby ID (e.g. AB12CD34)"
                value={joinId}
                onChange={(e) => {
                  setJoinId(e.target.value.toUpperCase());
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={8}
                autoFocus
              />
              <button
                style={styles.joinBtn}
                onClick={handleJoin}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#bd3944')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ff4655')}
              >
                Join →
              </button>
            </div>
            {error && <p style={styles.error}>{error}</p>}
          </div>
        )}

        {/* Format Info */}
        <div style={styles.formatCards}>
          {[
            { label: 'BO1', desc: '6 bans → 1 map played', detail: 'Ban ban ban ban ban ban' },
            { label: 'BO3', desc: '2 bans, 2 picks, 2 bans + decider', detail: 'Ban ban pick pick ban ban' },
            { label: 'BO5', desc: '2 bans + 4 picks + decider', detail: 'Ban ban pick pick pick pick' },
          ].map((f) => (
            <div key={f.label} style={styles.formatCard}>
              <div style={styles.formatLabel}>{f.label}</div>
              <div style={styles.formatDesc}>{f.desc}</div>
              <div style={styles.formatDetail}>{f.detail}</div>
            </div>
          ))}
        </div>

        {/* Map Pool Selector */}
        <div style={styles.mapPoolWrapper}>
          <MapPoolSelector />
        </div>
      </div>

      <footer style={styles.footer}>
        <a
          href="https://www.instagram.com/dngur.thd/"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.footerLink}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          @dngur.thd
        </a>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '3rem 2rem 4rem',
    position: 'relative',
    overflow: 'auto',
  },
  bgDecor1: {
    position: 'absolute',
    top: '-200px',
    right: '-200px',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(255,70,85,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgDecor2: {
    position: 'absolute',
    bottom: '-200px',
    left: '-200px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(255,70,85,0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    maxWidth: '720px',
    width: '100%',
    zIndex: 1,
    paddingTop: '2rem',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  logoIcon: {
    filter: 'drop-shadow(0 0 20px rgba(255,70,85,0.4))',
  },
  vctLabel: {
    fontSize: '0.75rem',
    letterSpacing: '0.3em',
    color: '#ff4655',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    color: '#ffffff',
  },
  titleAccent: {
    color: '#ff4655',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  description: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: '1rem',
    lineHeight: 1.6,
    maxWidth: '480px',
  },
  buttonsArea: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '1rem 2.5rem',
    background: '#ff4655',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
    minWidth: '180px',
  },
  secondaryBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '1rem 2.5rem',
    background: 'transparent',
    color: '#ffffff',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'all 0.2s ease',
    minWidth: '180px',
  },
  btnIcon: {
    fontSize: '1.4rem',
  },
  btnSub: {
    fontSize: '0.7rem',
    opacity: 0.7,
    letterSpacing: '0.1em',
    fontWeight: 400,
    textTransform: 'uppercase',
  },
  joinArea: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  joinRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.875rem 1rem',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    letterSpacing: '0.1em',
    transition: 'border-color 0.2s ease',
  },
  joinBtn: {
    padding: '0.875rem 1.5rem',
    background: '#ff4655',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.95rem',
    fontWeight: 700,
    transition: 'background 0.2s ease',
    whiteSpace: 'nowrap',
  },
  error: {
    color: '#ff4655',
    fontSize: '0.875rem',
  },
  formatCards: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  formatCard: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
    flex: '1',
    minWidth: '160px',
    maxWidth: '200px',
    textAlign: 'center',
  },
  formatLabel: {
    fontSize: '1.25rem',
    fontWeight: 900,
    color: '#ff4655',
    marginBottom: '0.5rem',
    letterSpacing: '0.05em',
  },
  formatDesc: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '0.25rem',
    fontWeight: 600,
  },
  formatDetail: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.3)',
  },
  mapPoolWrapper: {
    width: '100%',
    maxWidth: '700px',
  },
  footer: {
    marginTop: '2rem',
    fontSize: '0.75rem',
  },
  footerLink: {
    color: 'rgba(255,255,255,0.3)',
    textDecoration: 'none',
    fontSize: '0.75rem',
    transition: 'color 0.2s ease',
  },
};
