'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sounds } from '@/lib/sounds';

export default function CoinFlip({ lobby, myRole, onChooseSide }) {
  const [flipState, setFlipState] = useState('idle'); // 'idle' | 'spinning' | 'result'
  // CSS class applied to coinInner: '' | 'spinning' | 'heads' | 'tails'
  const [coinClass, setCoinClass] = useState('');

  const isChooser = lobby.coinFlipChooser === myRole;
  const hasChosen  = lobby.coinFlipChoice !== null;
  const coinResult = lobby.coinResult;
  const coinWinner = lobby.coinWinner;

  const chooserName =
    lobby.teams?.[lobby.coinFlipChooser]?.name ||
    (lobby.coinFlipChooser === 'team1' ? 'Team 1' : 'Team 2');

  const winnerName =
    coinWinner
      ? lobby.teams?.[coinWinner]?.name || (coinWinner === 'team1' ? 'Team 1' : 'Team 2')
      : '';

  useEffect(() => {
    if (hasChosen && coinResult && flipState === 'idle') {
      Sounds.coinFlip();
      // Pick the animation that lands on the correct face:
      // coinSpin-heads ends at 3600deg (≡ 0°  → heads visible)
      // coinSpin-tails ends at 3780deg (≡ 180° → tails visible)
      setCoinClass(coinResult === 'heads' ? 'spinning-heads' : 'spinning-tails');
      setFlipState('spinning');

      const t1 = setTimeout(() => {
        Sounds.coinLand();
        // Remove animation, hold exact landing angle via transform (no transition)
        setCoinClass(coinResult === 'heads' ? 'landed-heads' : 'landed-tails');
        setFlipState('result');
        setTimeout(() => Sounds.winFanfare(), 400);
      }, 2600);

      return () => clearTimeout(t1);
    }
  }, [hasChosen, coinResult]);

  function handleChoose(choice) {
    if (!isChooser || hasChosen) return;
    onChooseSide(choice);
  }

  return (
    <div style={styles.container}>
      <div style={styles.phaseLabel}>COIN FLIP</div>
      <h2 style={styles.heading}>Who Goes First?</h2>

      {/* ── COIN ── */}
      <div style={styles.coinScene}>
        <div className={`coin-inner ${coinClass}`}>
          {/* HEADS — gold face with crown symbol */}
          <div className="coin-face coin-front">
            <div className="face-ring" />
            <div className="face-symbol heads-symbol">♛</div>
            <div className="face-label">HEADS</div>
          </div>
          {/* TAILS — silver face with wave symbol */}
          <div className="coin-face coin-back">
            <div className="face-ring" />
            <div className="face-symbol tails-symbol">≋</div>
            <div className="face-label">TAILS</div>
          </div>
        </div>
      </div>

      {/* ── WAITING FOR CHOICE ── */}
      {!hasChosen && (
        <div style={styles.stateSection}>
          {isChooser ? (
            <>
              <p style={styles.instruction}>Choose your side</p>
              <div style={styles.choiceButtons}>
                <button
                  className="choice-btn heads-btn"
                  onClick={() => handleChoose('heads')}
                >
                  <span className="choice-symbol">♛</span>
                  <span className="choice-letter">H</span>
                  <span className="choice-word">HEADS</span>
                </button>
                <button
                  className="choice-btn tails-btn"
                  onClick={() => handleChoose('tails')}
                >
                  <span className="choice-symbol tails-sym">≋</span>
                  <span className="choice-letter tails-letter">T</span>
                  <span className="choice-word tails-word">TAILS</span>
                </button>
              </div>
            </>
          ) : (
            <div style={styles.waitingText}>
              <div style={styles.waitingDots}>
                <span style={{ ...styles.dot, animationDelay: '0s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
              </div>
              <span>
                Waiting for <strong style={{ color: '#ff4655' }}>{chooserName}</strong> to choose...
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── FLIPPING ── */}
      {hasChosen && flipState === 'spinning' && (
        <div style={styles.stateSection}>
          <p style={styles.flippingText}>Flipping the coin...</p>
          <p style={styles.choiceInfo}>
            <strong style={{ color: '#ff4655' }}>{chooserName}</strong> chose{' '}
            <strong style={{ color: '#ffffff' }}>
              {lobby.coinFlipChoice === 'heads' ? 'Heads' : 'Tails'}
            </strong>
          </p>
        </div>
      )}

      {/* ── RESULT ── */}
      <AnimatePresence>
        {flipState === 'result' && coinResult && (
          <motion.div
            style={styles.resultSection}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            <div style={styles.resultLabel}>
              Result:{' '}
              <strong style={{ color: coinResult === 'heads' ? '#ffd700' : '#c0c0c0', fontSize: '1.1rem' }}>
                {coinResult === 'heads' ? '♛ HEADS' : '≋ TAILS'}
              </strong>
            </div>
            <div style={styles.winnerBanner}>
              <span style={styles.winnerIcon}>🏆</span>
              <div>
                <div style={styles.winnerLabel}>WINNER</div>
                <div style={styles.winnerName}>{winnerName}</div>
              </div>
            </div>
            {coinWinner === myRole ? (
              <p style={styles.youWon}>You won! Choosing ban order next...</p>
            ) : (
              <p style={styles.youLost}>
                <strong style={{ color: '#ff4655' }}>{winnerName}</strong> will choose the ban order
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADMIN/SPECTATOR NOTE ── */}
      {(myRole === 'admin' || myRole === 'spectator') && !hasChosen && (
        <div style={styles.spectatorNote}>
          Waiting for <strong style={{ color: '#ff4655' }}>{chooserName}</strong> to choose heads or tails
        </div>
      )}

      <style jsx global>{`
        /* ── Scene ── */
        .coin-scene-container {
          perspective: 700px;
        }

        /* ── Inner: both faces live here, preserve-3d is critical ── */
        .coin-inner {
          width: 140px;
          height: 140px;
          position: relative;
          transform-style: preserve-3d;
          transform: rotateY(0deg);
          /* no transition by default — we control everything via animation or instant snap */
        }

        /* ── Two separate spin animations, each landing on the right face ── */

        /* Heads: 10 full rotations → lands at 3600° ≡ 0° (front/heads face) */
        .coin-inner.spinning-heads {
          animation: coinSpinHeads 2.6s cubic-bezier(0.15, 0.05, 0.1, 1) forwards;
        }
        @keyframes coinSpinHeads {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(3600deg); }
        }

        /* Tails: 10 full rotations + 180° → lands at 3780° ≡ 180° (back/tails face) */
        .coin-inner.spinning-tails {
          animation: coinSpinTails 2.6s cubic-bezier(0.15, 0.05, 0.1, 1) forwards;
        }
        @keyframes coinSpinTails {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(3780deg); }
        }

        /* ── After animation ends, hold exact landing angle — NO transition so there's no jump ── */
        .coin-inner.landed-heads {
          transform: rotateY(3600deg);
          transition: none;
        }
        .coin-inner.landed-tails {
          transform: rotateY(3780deg);
          transition: none;
        }

        /* ── Faces ── */
        .coin-face {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          gap: 2px;
          user-select: none;
        }

        /* HEADS — gold */
        .coin-front {
          background: radial-gradient(circle at 38% 32%, #fff0a0, #e8c000 45%, #a07800 80%, #6b5000);
          box-shadow: inset 0 2px 6px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.3), 0 0 30px rgba(255,200,0,0.3);
          transform: rotateY(0deg);
        }
        .coin-front .face-ring {
          border-color: rgba(255,255,255,0.3);
        }

        /* TAILS — silver/dark blue — completely different color scheme */
        .coin-back {
          background: radial-gradient(circle at 38% 32%, #ddeeff, #6688bb 45%, #334466 80%, #1a2233);
          box-shadow: inset 0 2px 6px rgba(255,255,255,0.25), inset 0 -2px 6px rgba(0,0,0,0.4), 0 0 30px rgba(80,120,200,0.25);
          transform: rotateY(180deg);
        }
        .coin-back .face-ring {
          border-color: rgba(255,255,255,0.2);
        }

        .face-ring {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          border: 2px solid;
          pointer-events: none;
        }

        /* HEADS face content */
        .heads-symbol {
          font-size: 2.8rem;
          color: rgba(80, 50, 0, 0.75);
          text-shadow: 0 1px 0 rgba(255,255,255,0.4);
          line-height: 1;
        }
        .coin-front .face-label {
          font-size: 0.5rem;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: rgba(80, 50, 0, 0.6);
          text-transform: uppercase;
        }

        /* TAILS face content */
        .tails-symbol {
          font-size: 2.4rem;
          color: rgba(200, 220, 255, 0.85);
          text-shadow: 0 1px 0 rgba(0,0,0,0.3);
          line-height: 1;
        }
        .coin-back .face-label {
          font-size: 0.5rem;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: rgba(180, 210, 255, 0.7);
          text-transform: uppercase;
        }

        /* ── Choice buttons ── */
        .choice-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 1.1rem 2.2rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .choice-btn:hover {
          transform: translateY(-3px);
        }

        .heads-btn {
          background: radial-gradient(circle at 38% 32%, #fff0a0, #e8c000 50%, #8a6500);
          box-shadow: 0 4px 18px rgba(255,200,0,0.2);
        }
        .heads-btn:hover {
          box-shadow: 0 8px 28px rgba(255,200,0,0.4);
        }

        .tails-btn {
          background: radial-gradient(circle at 38% 32%, #ddeeff, #6688bb 50%, #1a2233);
          box-shadow: 0 4px 18px rgba(80,120,200,0.2);
        }
        .tails-btn:hover {
          box-shadow: 0 8px 28px rgba(80,120,200,0.35);
        }

        .choice-symbol {
          font-size: 1.75rem;
          color: rgba(80, 50, 0, 0.7);
          line-height: 1;
        }
        .tails-sym {
          color: rgba(200, 220, 255, 0.9);
        }
        .choice-letter {
          font-size: 1.6rem;
          font-weight: 900;
          color: rgba(60, 40, 0, 0.7);
          line-height: 1;
        }
        .tails-letter {
          color: rgba(180, 210, 255, 0.9);
        }
        .choice-word {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(60, 40, 0, 0.6);
        }
        .tails-word {
          color: rgba(160, 195, 255, 0.8);
        }

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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '1.5rem 2rem',
    width: '100%',
  },
  phaseLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.3em',
    color: '#ff4655',
    fontWeight: 700,
  },
  heading: {
    fontSize: '1.75rem',
    fontWeight: 900,
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  // perspective wrapper — must be separate from the rotating element
  coinScene: {
    perspective: '700px',
    perspectiveOrigin: '50% 50%',
    width: '140px',
    height: '140px',
    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
  },
  stateSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    width: '100%',
  },
  instruction: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '1rem',
  },
  choiceButtons: {
    display: 'flex',
    gap: '1rem',
  },
  waitingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.95rem',
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
  flippingText: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#ff4655',
    letterSpacing: '0.05em',
  },
  choiceInfo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    width: '100%',
  },
  resultLabel: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.6)',
  },
  winnerBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '1rem 2rem',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.35)',
    borderRadius: '10px',
    width: '100%',
    justifyContent: 'center',
  },
  winnerIcon: { fontSize: '1.75rem' },
  winnerLabel: {
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    fontWeight: 700,
  },
  winnerName: {
    fontSize: '1.3rem',
    fontWeight: 900,
    color: '#f59e0b',
  },
  youWon: {
    color: '#22c55e',
    fontSize: '0.9rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  youLost: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  spectatorNote: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '0.875rem 1.25rem',
    background: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #2a2a2a',
    width: '100%',
  },
};
