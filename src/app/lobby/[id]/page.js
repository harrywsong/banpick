'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import CoinFlip from '@/components/CoinFlip';
import MapGrid from '@/components/MapGrid';
import BanPickBoard from '@/components/BanPickBoard';
import LobbyStatus from '@/components/LobbyStatus';
import MapPoolSelector from '@/components/MapPoolSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { Sounds } from '@/lib/sounds';

export default function LobbyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lobbyId = params.id;

  const [lobby, setLobby] = useState(null);
  const [myRole, setMyRole] = useState(null); // 'admin' | 'team1' | 'team2' | 'spectator'
  const [error, setError] = useState(null);
  const [joinStep, setJoinStep] = useState('name'); // 'name' | 'joined'
  const [teamName, setTeamName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [notification, setNotification] = useState(null);
  const notifTimerRef = useRef(null);
  const hasJoinedRef = useRef(false);

  function showNotif(msg, type = 'info') {
    setNotification({ msg, type });
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotification(null), 3000);
  }

  const handleLobbyUpdate = useCallback((updatedLobby) => {
    setLobby((prev) => {
      if (prev?.phase !== updatedLobby.phase) {
        const phaseLabels = {
          coin_flip: '🪙 Coin Flip Phase',
          choose_order: '⚔️ Choose Ban Order',
          ban_pick: '🗺️ Ban/Pick Phase',
          complete: '✅ Ban/Pick Complete!',
        };
        if (phaseLabels[updatedLobby.phase]) {
          showNotif(phaseLabels[updatedLobby.phase]);
          Sounds.phaseChange();
        }
      }
      return updatedLobby;
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('lobbyUpdate', handleLobbyUpdate);
    return () => socket.off('lobbyUpdate', handleLobbyUpdate);
  }, [handleLobbyUpdate]);

  // Restore role from localStorage or URL param
  useEffect(() => {
    const urlRole = searchParams.get('role');
    const storedRole = localStorage.getItem(`lobby_${lobbyId}_role`);
    const storedName = localStorage.getItem(`lobby_${lobbyId}_name`);

    if (urlRole === 'admin' || storedRole === 'admin') {
      setMyRole('admin');
      setJoinStep('joined');
      joinLobby('admin', '');
    } else if (storedRole === 'team1' || storedRole === 'team2') {
      setMyRole(storedRole);
      setTeamName(storedName || '');
      setJoinStep('joined');
      joinLobby(storedRole, storedName || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  function joinLobby(role, name) {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    const socket = getSocket();
    socket.emit('joinLobby', { lobbyId, teamName: name, role }, (res) => {
      if (!res) {
        setError('No response from server');
        hasJoinedRef.current = false;
        return;
      }
      if (!res.success) {
        setError(res.error || 'Failed to join lobby');
        hasJoinedRef.current = false;
        return;
      }
      const assignedRole = res.role || role;
      setMyRole(assignedRole);
      setLobby(res.lobby);
      setJoinStep('joined');

      if (assignedRole !== 'admin' && assignedRole !== 'spectator') {
        localStorage.setItem(`lobby_${lobbyId}_role`, assignedRole);
        localStorage.setItem(`lobby_${lobbyId}_name`, name);
      }
    });
  }

  function handleJoinSubmit(e) {
    e.preventDefault();
    const name = teamName.trim();
    if (!name) {
      setJoinError('Please enter your team name');
      return;
    }
    hasJoinedRef.current = false;
    joinLobby(null, name);
  }

  function handleChooseSide(choice) {
    const socket = getSocket();
    socket.emit('chooseSide', { lobbyId, choice }, (res) => {
      if (!res?.success) {
        showNotif(res?.error || 'Action failed', 'error');
      }
    });
  }

  function handleChooseOrder(banFirstChoice) {
    const socket = getSocket();
    socket.emit('chooseOrder', { lobbyId, banFirst: banFirstChoice }, (res) => {
      if (!res?.success) {
        showNotif(res?.error || 'Action failed', 'error');
      }
    });
  }

  function handleMapAction(action, mapName) {
    const socket = getSocket();
    const event = action === 'ban' ? 'banMap' : 'pickMap';
    socket.emit(event, { lobbyId, mapName }, (res) => {
      if (!res?.success) {
        showNotif(res?.error || 'Action failed', 'error');
      }
    });
  }

  function handleChooseStartSide(side) {
    const socket = getSocket();
    socket.emit('chooseStartSide', { lobbyId, side }, (res) => {
      if (!res?.success) {
        showNotif(res?.error || 'Action failed', 'error');
      }
    });
  }

  // ─── RENDER: Name Entry ──────────────────────────────────────────────────────
  if (joinStep === 'name') {
    return (
      <div style={pageStyles.centered}>
        <div style={pageStyles.joinCard}>
          <div style={pageStyles.joinHeader}>
            <div style={pageStyles.vctTag}>내전 Ban/Pick</div>
            <h2 style={pageStyles.joinTitle}>Join Lobby</h2>
            <div style={pageStyles.joinLobbyId}>{lobbyId}</div>
          </div>

          <form onSubmit={handleJoinSubmit} style={pageStyles.joinForm}>
            <label style={pageStyles.joinLabel}>Your Team Name</label>
            <input
              style={pageStyles.joinInput}
              type="text"
              placeholder="e.g. T1, GEN.G, KRX..."
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setJoinError('');
              }}
              maxLength={30}
              autoFocus
            />
            {joinError && <p style={pageStyles.joinError}>{joinError}</p>}
            <button
              type="submit"
              style={pageStyles.joinSubmitBtn}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#bd3944')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ff4655')}
            >
              Join as Captain →
            </button>
          </form>

          <button
            style={pageStyles.specBtn}
            onClick={() => {
              setMyRole('spectator');
              setJoinStep('joined');
              hasJoinedRef.current = false;
              joinLobby('spectator', '');
            }}
          >
            Join as Spectator
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Error ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={pageStyles.centered}>
        <div style={pageStyles.errorCard}>
          <div style={{ fontSize: '2rem' }}>⚠</div>
          <h2 style={{ color: '#ff4655', fontWeight: 800 }}>Error</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
          <button
            style={pageStyles.joinSubmitBtn}
            onClick={() => router.push('/')}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Loading ─────────────────────────────────────────────────────────
  if (!lobby) {
    return (
      <div style={pageStyles.centered}>
        <div style={pageStyles.loadingSpinner} />
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>
          Connecting to lobby...
        </p>
      </div>
    );
  }

  const team1Name = lobby.teams?.team1?.name || 'Team 1';
  const team2Name = lobby.teams?.team2?.name || 'Team 2';
  const winnerName =
    lobby.coinWinner === 'team1' ? team1Name : lobby.coinWinner === 'team2' ? team2Name : '';

  return (
    <div style={pageStyles.layout}>
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            style={{
              ...pageStyles.toast,
              background: notification.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.1)',
              borderColor: notification.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.3)',
              color: notification.type === 'error' ? '#ef4444' : '#22c55e',
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div style={pageStyles.topBar}>
        <button
          style={pageStyles.backBtn}
          onClick={() => router.push('/')}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4655')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          ← Home
        </button>
        <div style={pageStyles.topTitle}>
          <span style={{ color: '#ff4655', fontWeight: 900 }}>내전</span> Ban/Pick
        </div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Lobby Status bar */}
      <div style={pageStyles.statusBar}>
        <LobbyStatus lobby={lobby} myRole={myRole} />
      </div>

      {/* Main content */}
      <div style={pageStyles.mainContent}>

        {/* ── PHASE: waiting ── */}
        {lobby.phase === 'waiting' && (
          <div style={pageStyles.waitingLayout}>
            <div style={pageStyles.phaseContainer}>
              <div style={pageStyles.phaseCard}>
                <div style={pageStyles.phaseIcon}>⏳</div>
                <h2 style={pageStyles.phaseHeading}>Waiting for Players</h2>
                <p style={pageStyles.phaseDesc}>
                  Share the Lobby ID{' '}
                  <strong style={{ color: '#ff4655', fontFamily: 'monospace' }}>{lobby.id}</strong>{' '}
                  with both team captains
                </p>
                <div style={pageStyles.waitTeams}>
                  <WaitTeamSlot name={team1Name} joined={!!lobby.teams?.team1} num={1} />
                  <WaitTeamSlot name={team2Name} joined={!!lobby.teams?.team2} num={2} />
                </div>
              </div>
            </div>
            {myRole === 'admin' && (
              <div style={pageStyles.sidePanel}>
                <MapPoolSelector />
              </div>
            )}
          </div>
        )}

        {/* ── PHASE: coin_flip ── */}
        {lobby.phase === 'coin_flip' && (
          <div style={pageStyles.phaseContainer}>
            <div style={pageStyles.phaseCard}>
              <CoinFlip
                lobby={lobby}
                myRole={myRole}
                onChooseSide={handleChooseSide}
              />
            </div>
          </div>
        )}

        {/* ── PHASE: choose_order ── */}
        {lobby.phase === 'choose_order' && (
          <div style={pageStyles.phaseContainer}>
            <div style={pageStyles.phaseCard}>
              <div style={pageStyles.phaseIcon}>⚔️</div>
              <div style={pageStyles.phaseLabelSmall}>CHOOSE BAN ORDER</div>
              <h2 style={pageStyles.phaseHeading}>
                {winnerName} won the coin flip!
              </h2>

              {lobby.coinWinner === myRole ? (
                <>
                  <p style={pageStyles.phaseDesc}>
                    You won! Choose whether you want to ban first or second.
                  </p>
                  <div style={pageStyles.orderButtons}>
                    <button
                      style={pageStyles.banFirstBtn}
                      onClick={() => handleChooseOrder('self')}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      <div style={pageStyles.orderBtnIcon}>①</div>
                      <div style={pageStyles.orderBtnLabel}>Ban First</div>
                      <div style={pageStyles.orderBtnDesc}>You ban first, opponent picks side</div>
                    </button>
                    <button
                      style={pageStyles.banSecondBtn}
                      onClick={() => handleChooseOrder('opponent')}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      <div style={pageStyles.orderBtnIcon}>②</div>
                      <div style={pageStyles.orderBtnLabel}>Ban Second</div>
                      <div style={pageStyles.orderBtnDesc}>Opponent bans first, you have last ban</div>
                    </button>
                  </div>
                </>
              ) : (
                <div style={pageStyles.waitingBlock}>
                  <div style={pageStyles.waitingDotRow}>
                    <span style={{ ...pageStyles.dot, animationDelay: '0s' }} />
                    <span style={{ ...pageStyles.dot, animationDelay: '0.2s' }} />
                    <span style={{ ...pageStyles.dot, animationDelay: '0.4s' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Waiting for{' '}
                    <strong style={{ color: '#ff4655' }}>{winnerName}</strong> to choose ban order...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PHASE: ban_pick ── */}
        {lobby.phase === 'ban_pick' && (
          <div style={pageStyles.banPickLayout}>
            <div style={pageStyles.banPickLeft}>
              <MapGrid
                lobby={lobby}
                myRole={myRole}
                onAction={handleMapAction}
              />
            </div>
            <div style={pageStyles.banPickRight}>
              <BanPickBoard lobby={lobby} />
              {myRole === 'admin' && (
                <div style={{ marginTop: '1rem' }}>
                  <MapPoolSelector />
                </div>
              )}
            </div>

            {/* Side choice overlay — shown when a pick just happened */}
            <AnimatePresence>
              {lobby.pendingSideChoice && (
                <SideChoiceOverlay
                  pendingSideChoice={lobby.pendingSideChoice}
                  lobby={lobby}
                  myRole={myRole}
                  onChoose={handleChooseStartSide}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── PHASE: complete ── */}
        {lobby.phase === 'complete' && (
          <div style={pageStyles.completeLayout}>
            <div style={pageStyles.completeHeader}>
              <div style={{ fontSize: '2.5rem' }}>🏆</div>
              <div style={pageStyles.phaseLabelSmall}>BAN/PICK COMPLETE</div>
              <h2 style={pageStyles.phaseHeading}>Final Map Selection</h2>
            </div>

            <div style={pageStyles.resultSections}>
              {/* Banned maps */}
              {lobby.result?.banned?.length > 0 && (
                <div style={pageStyles.resultSection}>
                  <div style={pageStyles.resultSectionLabel}>
                    <span style={{ color: '#ef4444' }}>✕</span> BANNED MAPS
                  </div>
                  <div style={pageStyles.resultMapList}>
                    {lobby.result.banned.map((entry, i) => (
                      <div key={i} style={pageStyles.banCard}>
                        <div style={pageStyles.banCardMapName}>{entry.map}</div>
                        <div style={pageStyles.banCardRow}>
                          <span style={{
                            ...pageStyles.teamTag,
                            color: entry.team === 'team1' ? '#3b82f6' : '#ef4444',
                            borderColor: entry.team === 'team1' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)',
                            background: entry.team === 'team1' ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)',
                          }}>
                            {entry.team === 'team1' ? team1Name : team2Name}
                          </span>
                          <span style={pageStyles.actionLabel}>banned</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Picked maps */}
              {lobby.result?.picked?.length > 0 && (
                <div style={pageStyles.resultSection}>
                  <div style={pageStyles.resultSectionLabel}>
                    <span style={{ color: '#3b82f6' }}>✓</span> PICKED MAPS
                  </div>
                  <div style={pageStyles.resultMapList}>
                    {lobby.result.picked.map((entry, i) => {
                      const pickerName = entry.team === 'team1' ? team1Name : team2Name;
                      const pickerColor = entry.team === 'team1' ? '#3b82f6' : '#ef4444';
                      const sideChooserTeam = entry.team === 'team1' ? 'team2' : 'team1';
                      const sideChooserName = sideChooserTeam === 'team1' ? team1Name : team2Name;
                      const sideChooserColor = sideChooserTeam === 'team1' ? '#3b82f6' : '#ef4444';
                      return (
                        <div key={i} style={{
                          ...pageStyles.pickCard,
                          borderColor: entry.team === 'team1' ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.25)',
                        }}>
                          {/* Map name */}
                          <div style={pageStyles.pickCardMapName}>{entry.map}</div>

                          {/* Picked by row */}
                          <div style={pageStyles.pickCardRow}>
                            <span style={pageStyles.pickCardIcon}>✓</span>
                            <span style={pageStyles.pickCardLabel}>Picked by</span>
                            <span style={{
                              ...pageStyles.teamTag,
                              color: pickerColor,
                              borderColor: `${pickerColor}40`,
                              background: `${pickerColor}12`,
                            }}>
                              {pickerName}
                            </span>
                          </div>

                          {/* Side chosen row */}
                          <div style={pageStyles.pickCardRow}>
                            <span style={pageStyles.pickCardIcon}>
                              {entry.side === 'attack' ? '⚔' : entry.side === 'defense' ? '🛡' : '·'}
                            </span>
                            <span style={pageStyles.pickCardLabel}>Starting side</span>
                            {entry.side ? (
                              <>
                                <span style={{
                                  ...pageStyles.sideTag,
                                  color: entry.side === 'attack' ? '#f97316' : '#60a5fa',
                                  borderColor: entry.side === 'attack' ? 'rgba(249,115,22,0.35)' : 'rgba(96,165,250,0.35)',
                                  background: entry.side === 'attack' ? 'rgba(249,115,22,0.1)' : 'rgba(96,165,250,0.1)',
                                }}>
                                  {entry.side === 'attack' ? 'ATTACK' : 'DEFENSE'}
                                </span>
                                <span style={pageStyles.pickCardLabel}>for</span>
                                <span style={{
                                  ...pageStyles.teamTag,
                                  color: sideChooserColor,
                                  borderColor: `${sideChooserColor}40`,
                                  background: `${sideChooserColor}12`,
                                }}>
                                  {sideChooserName}
                                </span>
                              </>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Decider */}
              {lobby.result?.decider && (
                <div style={pageStyles.resultSection}>
                  <div style={pageStyles.resultSectionLabel}>
                    <span style={{ color: '#f59e0b' }}>★</span> DECIDER MAP
                  </div>
                  <div style={pageStyles.deciderCard}>
                    <div style={pageStyles.deciderMapName}>{lobby.result.decider}</div>
                    {lobby.result.deciderSide ? (
                      <>
                        <div style={pageStyles.deciderSideRow}>
                          <span style={{
                            ...pageStyles.sideTag,
                            color: lobby.result.deciderSide === 'attack' ? '#f97316' : '#60a5fa',
                            borderColor: lobby.result.deciderSide === 'attack' ? 'rgba(249,115,22,0.35)' : 'rgba(96,165,250,0.35)',
                            background: lobby.result.deciderSide === 'attack' ? 'rgba(249,115,22,0.1)' : 'rgba(96,165,250,0.1)',
                            fontSize: '0.8rem',
                            padding: '0.2rem 0.6rem',
                          }}>
                            {lobby.result.deciderSide === 'attack' ? '⚔ ATTACK' : '🛡 DEFENSE'}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>for</span>
                          <span style={{
                            ...pageStyles.teamTag,
                            color: lobby.result.deciderSideChooser === 'team1' ? '#3b82f6' : '#ef4444',
                            borderColor: lobby.result.deciderSideChooser === 'team1' ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0.35)',
                            background: lobby.result.deciderSideChooser === 'team1' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                          }}>
                            {lobby.result.deciderSideChooser === 'team1' ? team1Name : team2Name}
                          </span>
                        </div>
                        <div style={pageStyles.deciderSubLabel}>Remaining Map</div>
                      </>
                    ) : (
                      <div style={pageStyles.deciderSubLabel}>Remaining Map — sides decided at match start</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Also show the final map grid for visual reference */}
            <div style={pageStyles.finalGrid}>
              <div style={pageStyles.resultSectionLabel}>MAP OVERVIEW</div>
              <MapGrid
                lobby={lobby}
                myRole="spectator"
                onAction={() => {}}
              />
            </div>

            <button
              style={pageStyles.newLobbyBtn}
              onClick={() => router.push('/admin')}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#bd3944')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ff4655')}
            >
              Create New Lobby
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 900px) {
          .ban-pick-layout {
            flex-direction: column !important;
          }
        }
        @media (max-width: 600px) {
          .map-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

function SideChoiceOverlay({ pendingSideChoice, lobby, myRole, onChoose }) {
  const { map, pickedBy, choosingTeam, isDecider } = pendingSideChoice;
  const isChoosing = myRole === choosingTeam;

  const pickedByName = lobby.teams?.[pickedBy]?.name || (pickedBy === 'team1' ? 'Team 1' : 'Team 2');
  const choosingName = lobby.teams?.[choosingTeam]?.name || (choosingTeam === 'team1' ? 'Team 1' : 'Team 2');

  return (
    <motion.div
      style={overlayStyles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={overlayStyles.card}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div style={overlayStyles.tag}>SIDE SELECTION</div>
        <div style={overlayStyles.mapName}>{map}</div>
        <p style={overlayStyles.desc}>
          {isDecider
            ? <span>This is the <strong style={{ color: '#f59e0b' }}>decider map</strong></span>
            : <>Picked by{' '}
                <strong style={{ color: pickedBy === 'team1' ? '#3b82f6' : '#ef4444' }}>
                  {pickedByName}
                </strong>
              </>
          }
        </p>

        {isChoosing ? (
          <>
            <p style={overlayStyles.prompt}>
              You choose which side to start on
            </p>
            <div style={overlayStyles.sideButtons}>
              <button
                style={overlayStyles.attackBtn}
                onClick={() => onChoose('attack')}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(249,115,22,0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(249,115,22,0.2)'; }}
              >
                <span style={overlayStyles.sideIcon}>⚔</span>
                <span style={overlayStyles.sideName}>ATTACK</span>
                <span style={overlayStyles.sideSub}>Start as Attackers</span>
              </button>
              <button
                style={overlayStyles.defenseBtn}
                onClick={() => onChoose('defense')}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(96,165,250,0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(96,165,250,0.2)'; }}
              >
                <span style={overlayStyles.sideIcon}>🛡</span>
                <span style={overlayStyles.sideName}>DEFENSE</span>
                <span style={overlayStyles.sideSub}>Start as Defenders</span>
              </button>
            </div>
          </>
        ) : (
          <div style={overlayStyles.waiting}>
            <div style={overlayStyles.waitDots}>
              <span style={{ ...overlayStyles.dot, animationDelay: '0s' }} />
              <span style={{ ...overlayStyles.dot, animationDelay: '0.2s' }} />
              <span style={{ ...overlayStyles.dot, animationDelay: '0.4s' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              Waiting for{' '}
              <strong style={{ color: choosingTeam === 'team1' ? '#3b82f6' : '#ef4444' }}>
                {choosingName}
              </strong>{' '}
              to choose their starting side...
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const overlayStyles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '1.5rem',
  },
  card: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '16px',
    padding: '2.5rem',
    maxWidth: '480px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
  },
  tag: {
    fontSize: '0.65rem',
    letterSpacing: '0.3em',
    color: '#ff4655',
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  mapName: {
    fontSize: '2.25rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  desc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem',
    margin: 0,
  },
  prompt: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
  },
  sideButtons: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  attackBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '1.5rem 1rem',
    background: 'rgba(249,115,22,0.1)',
    border: '2px solid rgba(249,115,22,0.35)',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#ffffff',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 15px rgba(249,115,22,0.2)',
  },
  defenseBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '1.5rem 1rem',
    background: 'rgba(96,165,250,0.1)',
    border: '2px solid rgba(96,165,250,0.35)',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#ffffff',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 15px rgba(96,165,250,0.2)',
  },
  sideIcon: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  sideName: {
    fontSize: '1rem',
    fontWeight: 900,
    letterSpacing: '0.08em',
  },
  sideSub: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.45)',
    fontWeight: 500,
  },
  waiting: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 0',
  },
  waitDots: {
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
};

function WaitTeamSlot({ name, joined, num }) {
  return (
    <div
      style={{
        ...waitStyles.slot,
        borderColor: joined ? (num === 1 ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)') : '#2a2a2a',
        background: joined
          ? num === 1
            ? 'rgba(59,130,246,0.05)'
            : 'rgba(239,68,68,0.05)'
          : 'transparent',
      }}
    >
      <div
        style={{
          ...waitStyles.dot,
          background: joined ? (num === 1 ? '#3b82f6' : '#ef4444') : '#2a2a2a',
          boxShadow: joined
            ? `0 0 10px ${num === 1 ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)'}`
            : 'none',
        }}
      />
      <div>
        <div style={waitStyles.label}>TEAM {num}</div>
        <div style={{ ...waitStyles.name, color: joined ? '#ffffff' : 'rgba(255,255,255,0.3)' }}>
          {joined ? name : 'Waiting...'}
        </div>
      </div>
      {joined && <div style={waitStyles.badge}>Joined ✓</div>}
    </div>
  );
}

const waitStyles = {
  slot: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    border: '1px solid',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.3s ease',
  },
  label: {
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 700,
  },
  name: {
    fontSize: '1rem',
    fontWeight: 700,
    transition: 'color 0.3s ease',
  },
  badge: {
    marginLeft: 'auto',
    fontSize: '0.7rem',
    color: '#22c55e',
    fontWeight: 700,
  },
};

const pageStyles = {
  layout: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1.5rem',
    borderBottom: '1px solid #1a1a1a',
    background: '#0d0d0d',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'color 0.2s ease',
    padding: '0.25rem 0',
  },
  topTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: '0.05em',
  },
  statusBar: {
    padding: '0.75rem 1.5rem',
    borderBottom: '1px solid #1a1a1a',
  },
  mainContent: {
    flex: 1,
    padding: '1.5rem',
  },

  // Phase container for centered phases
  phaseContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  phaseCard: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    maxWidth: '540px',
    width: '100%',
    textAlign: 'center',
  },
  phaseIcon: {
    fontSize: '3rem',
  },
  phaseLabelSmall: {
    fontSize: '0.7rem',
    letterSpacing: '0.3em',
    color: '#ff4655',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  phaseHeading: {
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  phaseDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
  waitTeams: {
    display: 'flex',
    gap: '0.75rem',
    width: '100%',
  },

  // Order selection
  orderButtons: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  banFirstBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem',
    background: 'rgba(239,68,68,0.1)',
    border: '2px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#ffffff',
    transition: 'all 0.2s ease',
  },
  banSecondBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem',
    background: 'rgba(59,130,246,0.1)',
    border: '2px solid rgba(59,130,246,0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#ffffff',
    transition: 'all 0.2s ease',
  },
  orderBtnIcon: {
    fontSize: '2rem',
    fontWeight: 900,
  },
  orderBtnLabel: {
    fontSize: '1rem',
    fontWeight: 800,
    letterSpacing: '0.05em',
  },
  orderBtnDesc: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.4,
  },
  waitingBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  waitingDotRow: {
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

  // Waiting layout with optional side panel
  waitingLayout: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sidePanel: {
    width: '280px',
    flexShrink: 0,
    paddingTop: '0',
  },

  // Ban/Pick layout
  banPickLayout: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  banPickLeft: {
    flex: 1,
    minWidth: 0,
  },
  banPickRight: {
    width: '280px',
    flexShrink: 0,
  },

  // Complete
  completeLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  completeHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    textAlign: 'center',
  },
  resultSections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  resultSectionLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  resultMapList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  // Ban card
  banCard: {
    padding: '0.75rem 1rem',
    background: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.18)',
    borderRadius: '8px',
    minWidth: '130px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  banCardMapName: {
    fontSize: '1rem',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.01em',
  },
  banCardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  // Pick card — two-row breakdown
  pickCard: {
    padding: '0.875rem 1rem',
    background: '#111',
    border: '1px solid',
    borderRadius: '10px',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  pickCardMapName: {
    fontSize: '1.1rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.01em',
    paddingBottom: '0.35rem',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  pickCardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  pickCardIcon: {
    fontSize: '0.8rem',
    width: '16px',
    textAlign: 'center',
    flexShrink: 0,
  },
  pickCardLabel: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  // Shared tag styles
  teamTag: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.1rem 0.45rem',
    borderRadius: '4px',
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  sideTag: {
    fontSize: '0.72rem',
    fontWeight: 800,
    padding: '0.1rem 0.45rem',
    borderRadius: '4px',
    border: '1px solid',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
  actionLabel: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 500,
  },
  deciderCard: {
    padding: '1.25rem 2rem',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '10px',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.25rem',
  },
  deciderMapName: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#f59e0b',
  },
  deciderSubLabel: {
    fontSize: '0.75rem',
    color: 'rgba(245,158,11,0.6)',
    letterSpacing: '0.1em',
  },
  deciderSideRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flexWrap: 'wrap',
    marginTop: '0.25rem',
  },
  finalGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  newLobbyBtn: {
    padding: '1rem',
    background: '#ff4655',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 700,
    transition: 'background 0.2s ease',
    alignSelf: 'flex-start',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },

  // Notification toast
  toast: {
    position: 'fixed',
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 999,
    padding: '0.75rem 1.5rem',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    backdropFilter: 'blur(10px)',
    whiteSpace: 'nowrap',
  },

  // Centered layout for join/error/loading
  centered: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  joinCard: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  joinHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  vctTag: {
    fontSize: '0.7rem',
    letterSpacing: '0.3em',
    color: '#ff4655',
    fontWeight: 700,
  },
  joinTitle: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#ffffff',
  },
  joinLobbyId: {
    fontFamily: 'monospace',
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.1em',
  },
  joinForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  joinLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  joinInput: {
    padding: '0.875rem 1rem',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  joinError: {
    color: '#ef4444',
    fontSize: '0.8rem',
  },
  joinSubmitBtn: {
    padding: '0.875rem',
    background: '#ff4655',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: 700,
    transition: 'background 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  specBtn: {
    padding: '0.75rem',
    background: 'transparent',
    color: 'rgba(255,255,255,0.4)',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 600,
    transition: 'color 0.2s ease',
  },
  errorCard: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'center',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#ff4655',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
