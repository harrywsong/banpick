/**
 * Sound manager — plays audio files from /public/sounds/
 * Silently does nothing if a file is missing (placeholder-friendly).
 */

const cache = {};

function getAudio(name) {
  if (typeof window === 'undefined') return null;
  if (!cache[name]) {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.preload = 'auto';
    cache[name] = audio;
  }
  return cache[name];
}

export function playSound(name, volume = 0.6) {
  try {
    const audio = getAudio(name);
    if (!audio) return;
    // Clone so it can overlap if called quickly
    const clone = audio.cloneNode();
    clone.volume = volume;
    clone.play().catch(() => {
      // Autoplay blocked or file missing — silently ignore
    });
  } catch {
    // Never crash on missing sound
  }
}

// Named helpers so callers don't hardcode strings
export const Sounds = {
  coinFlip:    () => playSound('coin-flip', 0.7),
  coinLand:    () => playSound('coin-land', 0.8),
  winFanfare:  () => playSound('win-fanfare', 0.7),
  mapBan:      () => playSound('map-ban', 0.65),
  mapPick:     () => playSound('map-pick', 0.65),
  mapHover:    () => playSound('map-hover', 0.3),
  phaseChange: () => playSound('phase-change', 0.5),
};
