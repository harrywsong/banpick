'use client';

import { motion } from 'framer-motion';

export default function BanPickBoard({ lobby }) {
  const resolvedSeq = lobby.resolvedSequence || [];
  const currentStep = lobby.currentStep ?? 0;
  const phase = lobby.phase;

  function getResultForStep(stepIndex) {
    const step = resolvedSeq[stepIndex];
    if (!step) return null;

    if (step.action === 'ban') {
      const banned = lobby.result?.banned || [];
      let count = 0;
      for (let i = 0; i < stepIndex; i++) {
        if (resolvedSeq[i]?.action === 'ban') count++;
      }
      const entry = banned[count];
      return entry ? { map: entry.map, side: null, sideTeam: null } : null;
    }

    if (step.action === 'pick') {
      const picked = lobby.result?.picked || [];
      let count = 0;
      for (let i = 0; i < stepIndex; i++) {
        if (resolvedSeq[i]?.action === 'pick') count++;
      }
      const entry = picked[count];
      if (!entry) return null;
      // sideTeam = the team that chose the side (opponent of picker)
      const sideTeam = entry.team === 'team1' ? 'team2' : 'team1';
      return { map: entry.map, side: entry.side, sideTeam };
    }

    if (step.action === 'decider') {
      if (!lobby.result?.decider) return null;
      return {
        map: lobby.result.decider,
        side: lobby.result.deciderSide || null,
        sideTeam: lobby.result.deciderSideChooser || null,
      };
    }
    return null;
  }

  function teamName(team) {
    if (team === 'auto') return 'Remaining';
    return lobby.teams?.[team]?.name || (team === 'team1' ? 'Team 1' : 'Team 2');
  }

  function teamColor(team) {
    if (team === 'team1') return '#3b82f6';
    if (team === 'team2') return '#ef4444';
    return '#f59e0b';
  }

  const steps = resolvedSeq.length > 0 ? resolvedSeq : lobby.sequence || [];

  return (
    <div style={s.container}>
      <div style={s.header}>BAN / PICK ORDER</div>

      <div style={s.list}>
        {steps.map((step, index) => {
          const isDone   = index < currentStep;
          const isCurrent = index === currentStep && phase === 'ban_pick';
          const isFuture = index > currentStep;
          const result   = isDone ? getResultForStep(index) : null;

          const actColor =
            step.action === 'ban'     ? '#ef4444' :
            step.action === 'pick'    ? '#3b82f6' :
            step.action === 'decider' ? '#f59e0b' : '#9ca3af';

          const tColor = step.action === 'decider' ? '#f59e0b' : teamColor(step.team);
          const tName  = step.action === 'decider' ? 'Remaining Map' : teamName(step.team);

          return (
            <motion.div
              key={index}
              style={{
                ...s.row,
                opacity: isFuture ? 0.35 : 1,
                borderColor: isCurrent
                  ? 'rgba(255,70,85,0.45)'
                  : isDone
                  ? 'rgba(255,255,255,0.07)'
                  : '#222',
                background: isCurrent
                  ? 'rgba(255,70,85,0.04)'
                  : '#141414',
              }}
              animate={isCurrent ? {
                boxShadow: [
                  '0 0 0 0 rgba(255,70,85,0.35)',
                  '0 0 0 5px rgba(255,70,85,0)',
                  '0 0 0 0 rgba(255,70,85,0.35)',
                ],
              } : {}}
              transition={isCurrent ? { duration: 1.6, repeat: Infinity } : {}}
            >
              {/* Left column: step number */}
              <div style={{
                ...s.stepNum,
                color:       isDone ? '#22c55e' : isCurrent ? '#ff4655' : 'rgba(255,255,255,0.25)',
                borderColor: isDone ? 'rgba(34,197,94,0.35)' : isCurrent ? 'rgba(255,70,85,0.5)' : '#2a2a2a',
                background:  isDone ? 'rgba(34,197,94,0.1)'  : isCurrent ? 'rgba(255,70,85,0.1)' : 'transparent',
              }}>
                {isDone ? '✓' : index + 1}
              </div>

              {/* Middle: two-line info */}
              <div style={s.mid}>
                {/* Line 1: action badge + team doing the action */}
                <div style={s.line1}>
                  <span style={{ ...s.badge, color: actColor, borderColor: `${actColor}40`, background: `${actColor}15` }}>
                    {step.action === 'decider' ? 'DECIDER' : step.action.toUpperCase()}
                  </span>
                  <span style={{ ...s.actorName, color: tColor }}>
                    {tName}
                  </span>
                  {isCurrent && (
                    <span style={s.nowPill}>NOW</span>
                  )}
                </div>

                {/* Line 2: result — map + side info (only for completed picks) */}
                {result && (
                  <motion.div
                    style={s.line2}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span style={s.mapChip}>{result.map}</span>

                    {/* Side info for picks and decider */}
                    {(step.action === 'pick' || step.action === 'decider') && (
                      result.side ? (
                        <span style={{
                          ...s.sideChip,
                          color:       result.side === 'attack' ? '#f97316' : '#60a5fa',
                          borderColor: result.side === 'attack' ? 'rgba(249,115,22,0.35)' : 'rgba(96,165,250,0.35)',
                          background:  result.side === 'attack' ? 'rgba(249,115,22,0.1)'  : 'rgba(96,165,250,0.1)',
                        }}>
                          {result.side === 'attack' ? '⚔ ATK' : '🛡 DEF'}
                          {result.sideTeam && (
                            <span style={s.sideBy}>
                              {' '}· {teamName(result.sideTeam)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={s.sidePending}>choosing side…</span>
                      )
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  header: {
    fontSize: '0.65rem',
    letterSpacing: '0.22em',
    color: 'rgba(255,255,255,0.35)',
    fontWeight: 700,
    textTransform: 'uppercase',
    paddingBottom: '0.25rem',
    borderBottom: '1px solid #1e1e1e',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
    padding: '0.55rem 0.75rem',
    border: '1px solid',
    borderRadius: '7px',
    transition: 'border-color 0.2s, background 0.2s',
  },
  stepNum: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    fontWeight: 800,
    flexShrink: 0,
    marginTop: '1px',
    transition: 'all 0.25s',
  },
  mid: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  line1: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: '0.6rem',
    fontWeight: 800,
    padding: '0.1rem 0.4rem',
    borderRadius: '3px',
    border: '1px solid',
    letterSpacing: '0.06em',
    flexShrink: 0,
  },
  actorName: {
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.01em',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nowPill: {
    fontSize: '0.55rem',
    fontWeight: 800,
    color: '#ff4655',
    letterSpacing: '0.18em',
    border: '1px solid rgba(255,70,85,0.4)',
    borderRadius: '3px',
    padding: '0.1rem 0.35rem',
    flexShrink: 0,
  },
  line2: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flexWrap: 'wrap',
    paddingLeft: '0.1rem',
  },
  mapChip: {
    fontSize: '0.8rem',
    fontWeight: 800,
    color: '#ffffff',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  },
  sideChip: {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
  },
  sideBy: {
    fontWeight: 500,
    opacity: 0.7,
    fontSize: '0.68rem',
  },
  sidePending: {
    fontSize: '0.68rem',
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
};
