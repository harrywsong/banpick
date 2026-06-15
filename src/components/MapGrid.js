'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sounds } from '@/lib/sounds';

// Fallback solid colors if splash images fail to load
const MAP_COLORS = {
  Abyss:   '#1a1a2e',
  Ascent:  '#2d5a27',
  Bind:    '#5c2a00',
  Breeze:  '#1a3a4a',
  Corrode: '#1e2a1a',
  Fracture:'#2a1a2e',
  Haven:   '#1a3a5c',
  Icebox:  '#1a3a4a',
  Lotus:   '#3d1a3d',
  Pearl:   '#1a2a4a',
  Split:   '#3a1a1a',
  Sunset:  '#4a2a1a',
};

const MAP_ACCENT_COLORS = {
  Abyss:   '#4a4aff',
  Ascent:  '#7bc67e',
  Bind:    '#ff8c42',
  Breeze:  '#7fc8d9',
  Corrode: '#7bc67e',
  Fracture:'#c97fd4',
  Haven:   '#5ba3d9',
  Icebox:  '#7fc8d9',
  Lotus:   '#c97fd4',
  Pearl:   '#5b7fd9',
  Split:   '#d95b5b',
  Sunset:  '#d9885b',
};

export default function MapGrid({ lobby, myRole, onAction }) {
  const [mapAssets, setMapAssets] = useState({}); // { [name]: { splash, listViewIcon } }

  // Fetch splash images from our API route once
  useEffect(() => {
    fetch('/api/maps')
      .then((r) => r.json())
      .then((json) => {
        const assets = {};
        for (const m of json.maps || []) {
          assets[m.name] = { splash: m.splash, listViewIcon: m.listViewIcon };
        }
        setMapAssets(assets);
      })
      .catch(() => {}); // silently fall back to colors
  }, []);

  const mapStates = lobby.mapStates || {};
  const resolvedSeq = lobby.resolvedSequence || [];
  const currentStep = lobby.currentStep ?? 0;
  const phase = lobby.phase;

  const currentSeqStep = resolvedSeq[currentStep];
  const isMyTurn =
    phase === 'ban_pick' &&
    currentSeqStep &&
    currentSeqStep.team === myRole;
  const currentAction = currentSeqStep?.action;

  function handleMapClick(mapName) {
    if (!isMyTurn) return;
    if (mapStates[mapName] !== 'available') return;
    if (currentAction === 'ban') {
      Sounds.mapBan();
      onAction('ban', mapName);
    } else if (currentAction === 'pick') {
      Sounds.mapPick();
      onAction('pick', mapName);
    }
  }
  function getOverlay(mapName) {
    const state = mapStates[mapName];
    if (state === 'banned') {
      return { type: 'banned' };
    } else if (state === 'picked_team1') {
      const name = lobby.teams?.team1?.name || 'Team 1';
      return { type: 'picked', team: 'team1', name };
    } else if (state === 'picked_team2') {
      const name = lobby.teams?.team2?.name || 'Team 2';
      return { type: 'picked', team: 'team2', name };
    } else if (state === 'decider') {
      return { type: 'decider' };
    }
    return null;
  }

  const maps = lobby.maps || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLabel}>MAP POOL</div>
        {phase === 'ban_pick' && currentSeqStep && (
          <div style={styles.turnIndicator}>
            {isMyTurn ? (
              <span style={styles.yourTurn}>
                YOUR TURN — {currentAction?.toUpperCase()}
              </span>
            ) : (
              <span style={styles.waitTurn}>
                {currentSeqStep.team === 'team1'
                  ? lobby.teams?.team1?.name || 'Team 1'
                  : lobby.teams?.team2?.name || 'Team 2'}{' '}
                is {currentAction === 'ban' ? 'banning' : 'picking'}...
              </span>
            )}
          </div>
        )}
      </div>

      <div style={styles.grid}>
        {maps.map((mapName) => {
          const overlay = getOverlay(mapName);
          const isAvailable = mapStates[mapName] === 'available';
          const isClickable = isMyTurn && isAvailable;
          const bgColor = MAP_COLORS[mapName] || '#1a1a1a';
          const accentColor = MAP_ACCENT_COLORS[mapName] || '#ff4655';
          const splashUrl = mapAssets[mapName]?.splash || null;

          return (
            <motion.div
              key={mapName}
              style={{
                ...styles.mapCard,
                background: bgColor,
                cursor: isClickable ? 'pointer' : 'default',
                opacity: !isAvailable ? 0.9 : 1,
              }}
              whileHover={isClickable ? { scale: 1.03, y: -3 } : {}}
              whileTap={isClickable ? { scale: 0.97 } : {}}
              onClick={() => handleMapClick(mapName)}
              onHoverStart={() => { if (isClickable) Sounds.mapHover(); }}
              layout
            >
              {/* Splash image background */}
              {splashUrl && (
                <div
                  style={{
                    ...styles.splashBg,
                    backgroundImage: `url(${splashUrl})`,
                  }}
                />
              )}
              {/* Dark gradient overlay for readability */}
              <div style={styles.gradientOverlay} />
              {/* Map name and accent */}
              <div style={styles.mapContent}>
                <div
                  style={{
                    ...styles.mapAccentBar,
                    background: accentColor,
                  }}
                />
                <div style={styles.mapName}>{mapName}</div>
              </div>

              {/* Hover indicator for clickable */}
              {isClickable && (
                <div style={styles.hoverHint}>
                  {currentAction === 'ban' ? '✕ BAN' : '✓ PICK'}
                </div>
              )}

              {/* State overlays */}
              {overlay?.type === 'banned' && (
                <motion.div
                  style={styles.bannedOverlay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={styles.bannedX}>✕</div>
                  <div style={styles.bannedLabel}>BANNED</div>
                </motion.div>
              )}

              {overlay?.type === 'picked' && (
                <motion.div
                  style={{
                    ...styles.pickedOverlay,
                    background:
                      overlay.team === 'team1'
                        ? 'rgba(59,130,246,0.7)'
                        : 'rgba(239,68,68,0.7)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={styles.pickedIcon}>✓</div>
                  <div style={styles.pickedTeamName}>{overlay.name}</div>
                  <div style={styles.pickedLabel}>PICKED</div>
                </motion.div>
              )}

              {overlay?.type === 'decider' && (
                <motion.div
                  style={styles.deciderOverlay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div style={styles.deciderStar}>★</div>
                  <div style={styles.deciderLabel}>DECIDER</div>
                </motion.div>
              )}

              {/* Clickable action border flash */}
              {isClickable && (
                <div
                  style={{
                    ...styles.actionBorder,
                    borderColor:
                      currentAction === 'ban' ? '#ef4444' : '#3b82f6',
                  }}
                  className="pulse-border"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  headerLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.25em',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  turnIndicator: {
    display: 'flex',
    alignItems: 'center',
  },
  yourTurn: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#ff4655',
    letterSpacing: '0.1em',
    padding: '0.25rem 0.75rem',
    background: 'rgba(255,70,85,0.1)',
    border: '1px solid rgba(255,70,85,0.3)',
    borderRadius: '4px',
  },
  waitTurn: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
  },
  mapCard: {
    position: 'relative',
    borderRadius: '8px',
    aspectRatio: '16/9',
    overflow: 'hidden',
    border: '2px solid transparent',
    transition: 'border-color 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  splashBg: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    zIndex: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%)',
    zIndex: 1,
  },
  mapContent: {
    padding: '0.75rem',
    position: 'relative',
    zIndex: 2,
  },
  mapAccentBar: {
    height: '2px',
    width: '30px',
    borderRadius: '1px',
    marginBottom: '0.4rem',
  },
  mapName: {
    fontSize: '1rem',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.03em',
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  },
  hoverHint: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '0.1em',
    background: 'rgba(0,0,0,0.5)',
    padding: '0.2rem 0.4rem',
    borderRadius: '3px',
    zIndex: 2,
  },
  bannedOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(10, 10, 10, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    zIndex: 3,
  },
  bannedX: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#ef4444',
    lineHeight: 1,
  },
  bannedLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#ef4444',
    letterSpacing: '0.2em',
  },
  pickedOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem',
    zIndex: 3,
  },
  pickedIcon: {
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#ffffff',
  },
  pickedTeamName: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.05em',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  pickedLabel: {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: '0.2em',
  },
  deciderOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(245,158,11,0.65)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    zIndex: 3,
  },
  deciderStar: {
    fontSize: '2rem',
    color: '#ffffff',
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
  },
  deciderLabel: {
    fontSize: '0.7rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '0.2em',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  actionBorder: {
    position: 'absolute',
    inset: 0,
    borderRadius: '6px',
    border: '2px solid',
    pointerEvents: 'none',
    zIndex: 4,
  },
};
