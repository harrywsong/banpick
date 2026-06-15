'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';

// Current known rotation as the default pre-check
const CURRENT_ROTATION = new Set(['Ascent', 'Breeze', 'Fracture', 'Haven', 'Lotus', 'Pearl', 'Split']);

export default function MapPoolSelector({ onPoolChange }) {
  const [allMaps, setAllMaps] = useState([]); // { name, splash, listViewIcon }
  const [selected, setSelected] = useState(new Set(CURRENT_ROTATION));
  const [serverPool, setServerPool] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error' | null
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Fetch map assets from our API route + current pool from server
  useEffect(() => {
    let cancelled = false;

    async function loadMaps() {
      setLoading(true);
      try {
        // Fetch map assets
        const res = await fetch('/api/maps');
        const json = await res.json();

        if (!cancelled) {
          setAllMaps(json.maps || []);
        }
      } catch (err) {
        console.error('Failed to fetch map assets:', err);
      }

      // Fetch current pool from server
      const socket = getSocket();
      socket.emit('getMapPool', (res) => {
        if (cancelled) return;
        if (res?.success) {
          setServerPool(res.mapPool);
          setSelected(new Set(res.mapPool));
        }
        setLoading(false);
      });
    }

    loadMaps();

    // Listen for pool updates from other clients
    const socket = getSocket();
    const handlePoolUpdated = ({ mapPool }) => {
      if (cancelled) return;
      setServerPool(mapPool);
      setSelected(new Set(mapPool));
      if (onPoolChange) onPoolChange(mapPool);
    };
    socket.on('mapPoolUpdated', handlePoolUpdated);

    return () => {
      cancelled = true;
      socket.off('mapPoolUpdated', handlePoolUpdated);
    };
  }, [onPoolChange]);

  function toggleMap(mapName) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mapName)) {
        if (next.size <= 7) return prev; // enforce minimum 7
        next.delete(mapName);
      } else {
        next.add(mapName);
      }
      return next;
    });
    // Clear save status on change
    setSaveStatus(null);
  }

  function savePool() {
    const maps = Array.from(selected);
    if (maps.length < 7) {
      setSaveStatus('error');
      return;
    }
    setSaving(true);
    setSaveStatus(null);
    const socket = getSocket();
    socket.emit('setMapPool', { maps }, (res) => {
      setSaving(false);
      if (res?.success) {
        setServerPool(res.mapPool);
        setSaveStatus('saved');
        if (onPoolChange) onPoolChange(res.mapPool);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    });
  }

  function resetToRotation() {
    setSelected(new Set(CURRENT_ROTATION));
    setSaveStatus(null);
  }

  const hasChanges =
    serverPool.length > 0 &&
    (selected.size !== serverPool.length ||
      [...selected].some((m) => !serverPool.includes(m)));

  return (
    <div style={styles.wrapper}>
      {/* Collapsed header / toggle */}
      <button
        style={styles.toggleBtn}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ff4655')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = open ? '#ff4655' : '#2a2a2a')}
      >
        <div style={styles.toggleLeft}>
          <span style={styles.toggleIcon}>🗺️</span>
          <div>
            <div style={styles.toggleLabel}>MAP POOL</div>
            <div style={styles.toggleSub}>
              {loading ? 'Loading...' : `${serverPool.length} maps active`}
            </div>
          </div>
        </div>
        <div style={styles.toggleRight}>
          {hasChanges && <div style={styles.unsavedDot} title="Unsaved changes" />}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            style={styles.panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div style={styles.panelInner}>
              {/* Header row */}
              <div style={styles.panelHeader}>
                <div style={styles.panelTitle}>Active Duty Maps</div>
                <div style={styles.selectedCount}>
                  <span style={{ color: selected.size < 7 ? '#ef4444' : '#22c55e' }}>
                    {selected.size}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}> selected</span>
                </div>
              </div>

              <div style={styles.panelHint}>
                Select exactly 7+ maps for the active duty pool. Changes apply to new lobbies.
              </div>

              {/* Map list */}
              {loading ? (
                <div style={styles.loadingRow}>
                  <div style={styles.spinner} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    Fetching maps...
                  </span>
                </div>
              ) : (
                <div style={styles.mapList}>
                  {allMaps.map((map) => {
                    const isSelected = selected.has(map.name);
                    const isInCurrentRotation = CURRENT_ROTATION.has(map.name);
                    return (
                      <button
                        key={map.name}
                        style={{
                          ...styles.mapItem,
                          ...(isSelected ? styles.mapItemSelected : styles.mapItemUnselected),
                        }}
                        onClick={() => toggleMap(map.name)}
                        title={map.name}
                      >
                        {/* Splash background */}
                        {map.splash && (
                          <div
                            style={{
                              ...styles.mapSplash,
                              backgroundImage: `url(${map.splash})`,
                              opacity: isSelected ? 0.25 : 0.1,
                            }}
                          />
                        )}

                        {/* Content */}
                        <div style={styles.mapItemContent}>
                          <div style={styles.mapCheckbox}>
                            {isSelected ? (
                              <span style={{ color: '#22c55e', fontSize: '0.9rem' }}>✓</span>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>○</span>
                            )}
                          </div>
                          <div style={styles.mapItemName}>{map.name}</div>
                          {isInCurrentRotation && (
                            <div style={styles.rotationBadge} title="In current VCT rotation">
                              ●
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Legend + wiki link */}
              <div style={styles.legendRow}>
                <div style={styles.legend}>
                  <span style={styles.legendDot} /> Current VCT rotation
                </div>
                <a
                  href="https://valorant.fandom.com/wiki/Maps#Current"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.wikiLink}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4655')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                  onClick={(e) => e.stopPropagation()}
                >
                  View current rotation ↗
                </a>
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                <button
                  style={styles.resetBtn}
                  onClick={resetToRotation}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Reset to Current Rotation
                </button>
                <button
                  style={{
                    ...styles.saveBtn,
                    ...(saving || selected.size < 7
                      ? { opacity: 0.5, cursor: 'not-allowed' }
                      : {}),
                    ...(saveStatus === 'saved' ? { background: '#22c55e' } : {}),
                    ...(saveStatus === 'error' ? { background: '#ef4444' } : {}),
                  }}
                  onClick={savePool}
                  disabled={saving || selected.size < 7}
                >
                  {saving ? (
                    <span style={styles.spinnerSmall} />
                  ) : saveStatus === 'saved' ? (
                    '✓ Saved!'
                  ) : saveStatus === 'error' ? (
                    '✕ Error'
                  ) : (
                    'Apply Pool'
                  )}
                </button>
              </div>

              {selected.size < 7 && (
                <div style={styles.errorMsg}>
                  Minimum 7 maps required ({7 - selected.size} more needed)
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  wrapper: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  toggleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1rem',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #2a2a2a',
    cursor: 'pointer',
    color: '#ffffff',
    transition: 'border-color 0.2s ease',
  },
  toggleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  toggleIcon: {
    fontSize: '1rem',
  },
  toggleLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  toggleSub: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 600,
    textAlign: 'left',
  },
  toggleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  unsavedDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#f59e0b',
  },
  panel: {
    overflow: 'hidden',
  },
  panelInner: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.05em',
  },
  selectedCount: {
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  panelHint: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 1.5,
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#ff4655',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  mapList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  mapItem: {
    position: 'relative',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'all 0.15s ease',
    textAlign: 'left',
  },
  mapItemSelected: {
    borderColor: 'rgba(34,197,94,0.35)',
    background: 'rgba(34,197,94,0.06)',
  },
  mapItemUnselected: {
    borderColor: '#1f1f1f',
    background: '#0f0f0f',
  },
  mapSplash: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 0.2s ease',
  },
  mapItemContent: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    zIndex: 1,
  },
  mapCheckbox: {
    width: '16px',
    textAlign: 'center',
    flexShrink: 0,
  },
  mapItemName: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#ffffff',
    flex: 1,
  },
  rotationBadge: {
    fontSize: '0.5rem',
    color: '#ff4655',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.3)',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  wikiLink: {
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.35)',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    whiteSpace: 'nowrap',
  },
  legendDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#ff4655',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '0.25rem',
  },
  resetBtn: {
    flex: 1,
    padding: '0.5rem',
    background: 'transparent',
    border: '1px solid #2a2a2a',
    borderRadius: '5px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  saveBtn: {
    padding: '0.5rem 1rem',
    background: '#ff4655',
    border: 'none',
    borderRadius: '5px',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '90px',
    gap: '0.25rem',
  },
  spinnerSmall: {
    width: '12px',
    height: '12px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  errorMsg: {
    fontSize: '0.7rem',
    color: '#ef4444',
    fontWeight: 600,
  },
};
