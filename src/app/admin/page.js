'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

export default function AdminPage() {
  const router = useRouter();
  const [format, setFormat] = useState('bo3');
  const [lobbyId, setLobbyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lobbyState, setLobbyState] = useState(null);

  const handleLobbyUpdate = useCallback((lobby) => {
    setLobbyState(lobby);
    // Auto-navigate once both teams joined
    if (lobby.teams?.team1 && lobby.teams?.team2 && lobby.phase !== 'waiting') {
      setTimeout(() => {
        router.push(`/lobby/${lobby.id}?role=admin`);
      }, 1000);
    }
  }, [router]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('lobbyUpdate', handleLobbyUpdate);
    return () => {
      socket.off('lobbyUpdate', handleLobbyUpdate);
    };
  }, [handleLobbyUpdate]);

  function createLobby() {
    setCreating(true);
    const socket = getSocket();
    socket.emit('createLobby', { format }, (res) => {
      if (res.success) {
        setLobbyId(res.lobbyId);
        localStorage.setItem(`lobby_${res.lobbyId}_role`, 'admin');
      } else {
        console.error('Failed to create lobby');
      }
      setCreating(false);
    });
  }

  function copyLobbyId() {
    if (!lobbyId) return;
    navigator.clipboard.writeText(lobbyId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function goToLobby() {
    if (lobbyId) {
      router.push(`/lobby/${lobbyId}?role=admin`);
    }
  }

  const team1Joined = lobbyState?.teams?.team1 != null;
  const team2Joined = lobbyState?.teams?.team2 != null;
  const bothJoined = team1Joined && team2Joined;

  return (
    <div style={styles.container}>
      <div style={styles.bgDecor} />

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <button
            style={styles.backBtn}
            onClick={() => router.push('/')}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4655')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            ← Back
          </button>
          <div style={styles.headerTitle}>
            <div style={styles.vctTag}>내전</div>
            <h1 style={styles.title}>Create Lobby</h1>
          </div>
        </div>

        {!lobbyId ? (
          <>
            {/* Format Selection */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Select Format</label>
              <div style={styles.formatGrid}>
                {[
                  {
                    id: 'bo1',
                    label: 'Best of 1',
                    tag: 'BO1',
                    desc: '6 bans total, 1 remaining map played',
                    steps: ['Ban', 'Ban', 'Ban', 'Ban', 'Ban', 'Ban', 'Decider'],
                  },
                  {
                    id: 'bo3',
                    label: 'Best of 3',
                    tag: 'BO3',
                    desc: '2 bans, 2 picks, 2 bans, 1 decider',
                    steps: ['Ban', 'Ban', 'Pick', 'Pick', 'Ban', 'Ban', 'Decider'],
                  },
                  {
                    id: 'bo5',
                    label: 'Best of 5',
                    tag: 'BO5',
                    desc: '2 bans, 4 picks, 1 decider',
                    steps: ['Ban', 'Ban', 'Pick', 'Pick', 'Pick', 'Pick', 'Decider'],
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    style={{
                      ...styles.formatCard,
                      ...(format === f.id ? styles.formatCardActive : {}),
                    }}
                    onClick={() => setFormat(f.id)}
                  >
                    <div style={styles.formatTag}>{f.tag}</div>
                    <div style={styles.formatLabel}>{f.label}</div>
                    <div style={styles.formatDesc}>{f.desc}</div>
                    <div style={styles.formatSteps}>
                      {f.steps.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            ...styles.stepBadge,
                            ...(s === 'Ban'
                              ? styles.stepBan
                              : s === 'Pick'
                              ? styles.stepPick
                              : styles.stepDecider),
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              style={{
                ...styles.createBtn,
                ...(creating ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
              }}
              onClick={createLobby}
              disabled={creating}
              onMouseEnter={(e) => {
                if (!creating) e.currentTarget.style.background = '#bd3944';
              }}
              onMouseLeave={(e) => {
                if (!creating) e.currentTarget.style.background = '#ff4655';
              }}
            >
              {creating ? (
                <span style={styles.spinner} />
              ) : (
                '⚙ Create Lobby'
              )}
            </button>
          </>
        ) : (
          <>
            {/* Lobby Created */}
            <div style={styles.lobbyCreated} className="fade-in">
              <div style={styles.successIcon}>✓</div>
              <div style={styles.successText}>Lobby Created!</div>
              <div style={styles.formatBadge}>{format.toUpperCase()}</div>
            </div>

            {/* Lobby ID display */}
            <div style={styles.lobbyIdSection}>
              <label style={styles.sectionLabel}>Lobby ID — Share with players</label>
              <div style={styles.lobbyIdRow}>
                <div style={styles.lobbyIdDisplay}>{lobbyId}</div>
                <button
                  style={{
                    ...styles.copyBtn,
                    ...(copied ? { background: '#22c55e' } : {}),
                  }}
                  onClick={copyLobbyId}
                  onMouseEnter={(e) => {
                    if (!copied) e.currentTarget.style.borderColor = '#ff4655';
                  }}
                  onMouseLeave={(e) => {
                    if (!copied) e.currentTarget.style.borderColor = '#2a2a2a';
                  }}
                >
                  {copied ? '✓ Copied!' : '⎘ Copy'}
                </button>
              </div>
              <p style={styles.shareHint}>
                Players should go to <span style={{ color: '#ff4655' }}>localhost:3000</span> and click "Join Lobby"
              </p>
            </div>

            {/* Team Status */}
            <div style={styles.teamStatus}>
              <label style={styles.sectionLabel}>Waiting for Players</label>
              <div style={styles.teamsGrid}>
                <div style={{ ...styles.teamCard, ...(team1Joined ? styles.teamCardJoined : {}) }}>
                  <div style={styles.teamDot(team1Joined)} />
                  <div>
                    <div style={styles.teamCardLabel}>Team 1</div>
                    <div style={styles.teamCardName}>
                      {team1Joined ? (lobbyState.teams.team1.name || 'Team 1') : 'Waiting...'}
                    </div>
                  </div>
                  {team1Joined && <div style={styles.joinedBadge}>Joined</div>}
                </div>
                <div style={{ ...styles.teamCard, ...(team2Joined ? styles.teamCardJoined : {}) }}>
                  <div style={styles.teamDot(team2Joined)} />
                  <div>
                    <div style={styles.teamCardLabel}>Team 2</div>
                    <div style={styles.teamCardName}>
                      {team2Joined ? (lobbyState.teams.team2.name || 'Team 2') : 'Waiting...'}
                    </div>
                  </div>
                  {team2Joined && <div style={styles.joinedBadge}>Joined</div>}
                </div>
              </div>

              {!bothJoined && (
                <div style={styles.waitingIndicator}>
                  <div style={styles.waitingDots}>
                    <span style={{ ...styles.dot, animationDelay: '0s' }} />
                    <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                    <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                    Waiting for players to join...
                  </span>
                </div>
              )}

              {bothJoined && (
                <div style={styles.readyBanner} className="fade-in">
                  <span>🎮 Both teams ready! Navigating to lobby...</span>
                </div>
              )}
            </div>

            <button
              style={styles.goToLobbyBtn}
              onClick={goToLobby}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ff4655')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
            >
              Go to Lobby →
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    position: 'relative',
  },
  bgDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '300px',
    background: 'linear-gradient(180deg, rgba(255,70,85,0.05) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  card: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '720px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.875rem',
    fontWeight: 600,
    transition: 'color 0.2s',
    padding: '0.25rem 0',
    marginTop: '4px',
  },
  headerTitle: {
    flex: 1,
  },
  vctTag: {
    fontSize: '0.7rem',
    letterSpacing: '0.3em',
    color: '#ff4655',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
  },
  formatCard: {
    background: '#1a1a1a',
    border: '2px solid #2a2a2a',
    borderRadius: '8px',
    padding: '1rem',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#ffffff',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  formatCardActive: {
    borderColor: '#ff4655',
    background: 'rgba(255,70,85,0.08)',
  },
  formatTag: {
    fontSize: '1.25rem',
    fontWeight: 900,
    color: '#ff4655',
  },
  formatLabel: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  formatDesc: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.4,
  },
  formatSteps: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.25rem',
    marginTop: '0.25rem',
  },
  stepBadge: {
    fontSize: '0.6rem',
    padding: '0.15rem 0.4rem',
    borderRadius: '3px',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  stepBan: {
    background: 'rgba(239,68,68,0.2)',
    color: '#ef4444',
  },
  stepPick: {
    background: 'rgba(59,130,246,0.2)',
    color: '#60a5fa',
  },
  stepDecider: {
    background: 'rgba(245,158,11,0.2)',
    color: '#f59e0b',
  },
  createBtn: {
    padding: '1rem',
    background: '#ff4655',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  lobbyCreated: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  successIcon: {
    width: '36px',
    height: '36px',
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid #22c55e',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#22c55e',
    fontWeight: 700,
    fontSize: '1.1rem',
  },
  successText: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#22c55e',
  },
  formatBadge: {
    padding: '0.25rem 0.75rem',
    background: 'rgba(255,70,85,0.15)',
    border: '1px solid rgba(255,70,85,0.3)',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#ff4655',
    letterSpacing: '0.1em',
  },
  lobbyIdSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  lobbyIdRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  lobbyIdDisplay: {
    flex: 1,
    padding: '1rem 1.25rem',
    background: '#0a0a0a',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    fontSize: '1.75rem',
    fontWeight: 900,
    letterSpacing: '0.2em',
    color: '#ff4655',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: '1rem 1.25rem',
    background: 'transparent',
    color: '#ffffff',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 700,
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  shareHint: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.35)',
  },
  teamStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  teamsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  teamCard: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    transition: 'all 0.2s ease',
  },
  teamCardJoined: {
    borderColor: '#22c55e',
    background: 'rgba(34,197,94,0.05)',
  },
  teamDot: (joined) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: joined ? '#22c55e' : '#2a2a2a',
    flexShrink: 0,
    transition: 'background 0.3s ease',
    boxShadow: joined ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
  }),
  teamCardLabel: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
  },
  teamCardName: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  joinedBadge: {
    marginLeft: 'auto',
    fontSize: '0.65rem',
    color: '#22c55e',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  waitingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
  },
  waitingDots: {
    display: 'flex',
    gap: '4px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#ff4655',
    display: 'inline-block',
    animation: 'bounce 1.4s infinite ease-in-out',
  },
  readyBanner: {
    padding: '0.875rem 1rem',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '6px',
    color: '#22c55e',
    fontSize: '0.9rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  goToLobbyBtn: {
    padding: '0.875rem',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
};
