'use client';

import { motion } from 'framer-motion';

export default function BanPickBoard({ lobby }) {
  const resolvedSeq = lobby.resolvedSequence || [];
  const mapStates = lobby.mapStates || {};
  const currentStep = lobby.currentStep ?? 0;
  const phase = lobby.phase;

  // Build a map from state -> map name for completed steps
  function getMapForStep(stepIndex) {
    const step = resolvedSeq[stepIndex];
    if (!step) return null;

    if (step.action === 'ban') {
      // Find in result.banned
      const banned = lobby.result?.banned || [];
      // Count how many ban steps have occurred before this index
      let banCount = 0;
      for (let i = 0; i < stepIndex; i++) {
        if (resolvedSeq[i]?.action === 'ban') banCount++;
      }
      return banned[banCount]?.map || null;
    } else if (step.action === 'pick') {
      const picked = lobby.result?.picked || [];
      let pickCount = 0;
      for (let i = 0; i < stepIndex; i++) {
        if (resolvedSeq[i]?.action === 'pick') pickCount++;
      }
      return picked[pickCount]?.map || null;
    } else if (step.action === 'decider') {
      return lobby.result?.decider || null;
    }
    return null;
  }

  function getTeamName(team) {
    if (team === 'auto') return 'Auto';
    return lobby.teams?.[team]?.name || (team === 'team1' ? 'Team 1' : 'Team 2');
  }

  function getTeamColor(team) {
    if (team === 'team1') return '#3b82f6';
    if (team === 'team2') return '#ef4444';
    return '#f59e0b';
  }

  const steps = resolvedSeq.length > 0 ? resolvedSeq : lobby.sequence || [];

  return (
    <div style={styles.container}>
      <div style={styles.headerLabel}>BAN/PICK ORDER</div>

      <div style={styles.stepList}>
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isCurrent = index === currentStep && phase === 'ban_pick';
          const isFuture = index > currentStep;
          const mapName = isDone ? getMapForStep(index) : null;
          const teamColor = getTeamColor(step.team);
          const teamName = getTeamName(step.team);

          let actionColor = '#9ca3af';
          if (step.action === 'ban') actionColor = '#ef4444';
          else if (step.action === 'pick') actionColor = '#3b82f6';
          else if (step.action === 'decider') actionColor = '#f59e0b';

          return (
            <motion.div
              key={index}
              style={{
                ...styles.stepItem,
                opacity: isFuture ? 0.4 : 1,
                ...(isCurrent ? styles.stepItemCurrent : {}),
                ...(isDone ? styles.stepItemDone : {}),
              }}
              animate={isCurrent ? { boxShadow: ['0 0 0 0 rgba(255,70,85,0.4)', '0 0 0 6px rgba(255,70,85,0)', '0 0 0 0 rgba(255,70,85,0.4)'] } : {}}
              transition={isCurrent ? { duration: 1.5, repeat: Infinity } : {}}
              layout
            >
              {/* Step number */}
              <div
                style={{
                  ...styles.stepNum,
                  background: isDone
                    ? 'rgba(34,197,94,0.15)'
                    : isCurrent
                    ? 'rgba(255,70,85,0.15)'
                    : '#1a1a1a',
                  color: isDone
                    ? '#22c55e'
                    : isCurrent
                    ? '#ff4655'
                    : 'rgba(255,255,255,0.3)',
                  borderColor: isDone
                    ? 'rgba(34,197,94,0.3)'
                    : isCurrent
                    ? 'rgba(255,70,85,0.4)'
                    : '#2a2a2a',
                }}
              >
                {isDone ? '✓' : index + 1}
              </div>

              {/* Action label */}
              <div
                style={{
                  ...styles.actionBadge,
                  color: actionColor,
                  background: `${actionColor}18`,
                  borderColor: `${actionColor}30`,
                }}
              >
                {step.action === 'decider' ? 'DEC' : step.action.toUpperCase()}
              </div>

              {/* Team name */}
              <div style={styles.stepTeam}>
                <div
                  style={{
                    ...styles.teamDot,
                    background: step.action === 'decider' ? '#f59e0b' : teamColor,
                  }}
                />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
                  {step.action === 'decider' ? 'Remaining Map' : teamName}
                </span>
              </div>

              {/* Map result */}
              {mapName && (
                <motion.div
                  style={styles.stepMap}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {mapName}
                </motion.div>
              )}

              {/* Current indicator */}
              {isCurrent && (
                <div style={styles.currentPulse}>
                  <span style={styles.currentText}>NOW</span>
                </div>
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
    gap: '0.75rem',
  },
  headerLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.25em',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.6rem 0.75rem',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  stepItemCurrent: {
    background: 'rgba(255,70,85,0.05)',
    borderColor: 'rgba(255,70,85,0.3)',
  },
  stepItemDone: {
    background: 'rgba(34,197,94,0.03)',
    borderColor: 'rgba(34,197,94,0.15)',
  },
  stepNum: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 700,
    flexShrink: 0,
    transition: 'all 0.3s ease',
  },
  actionBadge: {
    fontSize: '0.65rem',
    fontWeight: 800,
    padding: '0.15rem 0.4rem',
    borderRadius: '3px',
    border: '1px solid',
    letterSpacing: '0.05em',
    flexShrink: 0,
    minWidth: '36px',
    textAlign: 'center',
  },
  stepTeam: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flex: 1,
    minWidth: 0,
  },
  teamDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  stepMap: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#ffffff',
    background: 'rgba(255,255,255,0.08)',
    padding: '0.15rem 0.5rem',
    borderRadius: '3px',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  },
  currentPulse: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
  },
  currentText: {
    fontSize: '0.6rem',
    fontWeight: 800,
    color: '#ff4655',
    letterSpacing: '0.15em',
  },
};
