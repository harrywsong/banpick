'use client';

export default function LobbyStatus({ lobby, myRole }) {
  const team1 = lobby.teams?.team1;
  const team2 = lobby.teams?.team2;

  function getPhaseLabel(phase) {
    switch (phase) {
      case 'waiting': return 'Waiting for Players';
      case 'coin_flip': return 'Coin Flip';
      case 'choose_order': return 'Choosing Ban Order';
      case 'ban_pick': return 'Ban / Pick';
      case 'complete': return 'Complete';
      default: return phase;
    }
  }

  function getPhaseColor(phase) {
    switch (phase) {
      case 'waiting': return '#9ca3af';
      case 'coin_flip': return '#f59e0b';
      case 'choose_order': return '#a78bfa';
      case 'ban_pick': return '#ff4655';
      case 'complete': return '#22c55e';
      default: return '#9ca3af';
    }
  }

  const phaseColor = getPhaseColor(lobby.phase);

  return (
    <div style={styles.container}>
      {/* Lobby ID + Format */}
      <div style={styles.topRow}>
        <div style={styles.idGroup}>
          <div style={styles.label}>LOBBY</div>
          <div style={styles.lobbyId}>{lobby.id}</div>
        </div>
        <div style={styles.formatGroup}>
          <div style={styles.label}>FORMAT</div>
          <div style={styles.format}>{lobby.format?.toUpperCase()}</div>
        </div>
        <div style={styles.phaseGroup}>
          <div style={styles.label}>PHASE</div>
          <div style={{ ...styles.phase, color: phaseColor }}>
            {getPhaseLabel(lobby.phase)}
          </div>
        </div>
        <div style={styles.roleGroup}>
          <div style={styles.label}>YOU ARE</div>
          <div style={styles.role}>
            {myRole === 'admin'
              ? 'Admin'
              : myRole === 'team1'
              ? team1?.name || 'Team 1'
              : myRole === 'team2'
              ? team2?.name || 'Team 2'
              : 'Spectator'}
          </div>
        </div>
      </div>

      {/* Teams Row */}
      <div style={styles.teamsRow}>
        <TeamSlot
          team={team1}
          label="TEAM 1"
          color="#3b82f6"
          isMe={myRole === 'team1'}
        />
        <div style={styles.vs}>VS</div>
        <TeamSlot
          team={team2}
          label="TEAM 2"
          color="#ef4444"
          isMe={myRole === 'team2'}
        />
      </div>
    </div>
  );
}

function TeamSlot({ team, label, color, isMe }) {
  const joined = team != null;
  return (
    <div
      style={{
        ...slotStyles.container,
        borderColor: isMe ? color : joined ? `${color}40` : '#2a2a2a',
        background: isMe
          ? `${color}0a`
          : joined
          ? `${color}05`
          : 'transparent',
      }}
    >
      <div style={{ ...slotStyles.dot, background: joined ? color : '#2a2a2a', boxShadow: joined ? `0 0 8px ${color}60` : 'none' }} />
      <div>
        <div style={slotStyles.label}>{label}</div>
        <div style={{ ...slotStyles.name, color: joined ? '#ffffff' : 'rgba(255,255,255,0.25)' }}>
          {joined ? team.name || label : 'Not joined'}
        </div>
      </div>
      {isMe && (
        <div style={{ ...slotStyles.youTag, borderColor: color, color }}>YOU</div>
      )}
      {joined && !isMe && (
        <div style={slotStyles.readyTag}>✓</div>
      )}
    </div>
  );
}

const slotStyles = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.6rem 0.875rem',
    border: '1px solid',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.3s ease',
  },
  label: {
    fontSize: '0.6rem',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 700,
  },
  name: {
    fontSize: '0.875rem',
    fontWeight: 700,
    transition: 'color 0.3s ease',
  },
  youTag: {
    marginLeft: 'auto',
    fontSize: '0.6rem',
    fontWeight: 800,
    letterSpacing: '0.15em',
    border: '1px solid',
    padding: '0.1rem 0.35rem',
    borderRadius: '3px',
  },
  readyTag: {
    marginLeft: 'auto',
    fontSize: '0.75rem',
    color: '#22c55e',
  },
};

const styles = {
  container: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '0.875rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  topRow: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  idGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  formatGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  phaseGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  roleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  label: {
    fontSize: '0.6rem',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.15em',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  lobbyId: {
    fontSize: '0.875rem',
    fontWeight: 800,
    color: '#ff4655',
    letterSpacing: '0.1em',
    fontFamily: 'monospace',
  },
  format: {
    fontSize: '0.875rem',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.1em',
  },
  phase: {
    fontSize: '0.875rem',
    fontWeight: 700,
    transition: 'color 0.3s ease',
  },
  role: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  teamsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  vs: {
    fontSize: '0.75rem',
    fontWeight: 900,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.1em',
    flexShrink: 0,
  },
};
