const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://40.233.95.61:4002',
      'http://localhost:4002',
    ],
    methods: ['GET', 'POST'],
  },
});

// In-memory lobby store
const lobbies = new Map();

// Global active map pool — persists across all lobbies until someone changes it
// Default: current known VCT competitive rotation (patch 12.00)
let ACTIVE_MAP_POOL = ['Ascent', 'Breeze', 'Fracture', 'Haven', 'Lotus', 'Pearl', 'Split'];

// All competitive maps (superset)
const ALL_COMPETITIVE_MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode',
  'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl',
  'Split', 'Sunset',
];

/**
 * Build the ban/pick sequence based on format and which team bans first.
 * 'first' = the team that bans first (banFirst team)
 * 'second' = the other team
 * These are resolved to actual team1/team2 after the order is known.
 */
function buildSequence(format) {
  // We'll use 'first' and 'second' placeholders, resolved later
  if (format === 'bo1') {
    return [
      { action: 'ban', team: 'first' },
      { action: 'ban', team: 'second' },
      { action: 'ban', team: 'first' },
      { action: 'ban', team: 'second' },
      { action: 'ban', team: 'first' },
      { action: 'ban', team: 'second' },
      { action: 'decider', team: 'auto' },
    ];
  } else if (format === 'bo3') {
    return [
      { action: 'ban', team: 'first' },
      { action: 'ban', team: 'second' },
      { action: 'pick', team: 'first' },
      { action: 'pick', team: 'second' },
      { action: 'ban', team: 'first' },
      { action: 'ban', team: 'second' },
      { action: 'decider', team: 'auto' },
    ];
  } else if (format === 'bo5') {
    return [
      { action: 'ban', team: 'first' },
      { action: 'ban', team: 'second' },
      { action: 'pick', team: 'first' },
      { action: 'pick', team: 'second' },
      { action: 'pick', team: 'first' },
      { action: 'pick', team: 'second' },
      { action: 'decider', team: 'auto' },
    ];
  }
  return [];
}

/**
 * Resolve 'first'/'second' placeholders to actual team1/team2 IDs
 * based on who is banFirst.
 */
function resolveSequence(sequence, banFirst) {
  const second = banFirst === 'team1' ? 'team2' : 'team1';
  return sequence.map((step) => ({
    ...step,
    team: step.team === 'first' ? banFirst : step.team === 'second' ? second : 'auto',
  }));
}

/**
 * Initialize map states: all available
 */
function initMapStates(maps) {
  const states = {};
  for (const map of maps) {
    states[map] = 'available';
  }
  return states;
}

/**
 * Get a safe lobby snapshot to send to clients (no sensitive internal data stripped)
 */
function getLobbySnapshot(lobby) {
  return { ...lobby };
}

/**
 * Emit updated lobby state to all clients in the lobby room
 */
function broadcastLobby(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;
  io.to(lobbyId).emit('lobbyUpdate', getLobbySnapshot(lobby));
}

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ─── CREATE LOBBY ────────────────────────────────────────────────────────────
  socket.on('createLobby', ({ format }, callback) => {
    const lobbyId = uuidv4().slice(0, 8).toUpperCase();
    const sequence = buildSequence(format);
    const currentMaps = [...ACTIVE_MAP_POOL];
    const mapStates = initMapStates(currentMaps);

    const lobby = {
      id: lobbyId,
      format,
      adminId: socket.id,
      teams: {
        team1: null,
        team2: null,
      },
      phase: 'waiting',
      coinFlipChooser: null,
      coinFlipChoice: null,
      coinResult: null,
      coinWinner: null,
      banFirst: null,
      maps: currentMaps,
      mapStates,
      sequence, // unresolved (first/second)
      resolvedSequence: null, // resolved after banFirst chosen
      currentStep: 0,
      result: {
        banned: [],
        picked: [],
        decider: null,
      },
    };

    lobbies.set(lobbyId, lobby);
    socket.join(lobbyId);
    console.log(`[Lobby] Created: ${lobbyId} format=${format} admin=${socket.id}`);

    if (callback) callback({ success: true, lobbyId });
  });

  // ─── JOIN LOBBY ──────────────────────────────────────────────────────────────
  socket.on('joinLobby', ({ lobbyId, teamName, role }, callback) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      if (callback) callback({ success: false, error: 'Lobby not found' });
      return;
    }

    socket.join(lobbyId);

    // Admin re-join
    if (role === 'admin') {
      console.log(`[Lobby] Admin re-joined: ${lobbyId}`);
      if (callback) callback({ success: true, role: 'admin', lobby: getLobbySnapshot(lobby) });
      broadcastLobby(lobbyId);
      return;
    }

    // Spectator / existing team re-join by socket id stored in localStorage
    if (role === 'team1' || role === 'team2') {
      // Allow re-join: update socket id
      if (lobby.teams[role]) {
        lobby.teams[role].socketId = socket.id;
        console.log(`[Lobby] ${role} re-joined: ${lobbyId} socketId=${socket.id}`);
        if (callback) callback({ success: true, role, lobby: getLobbySnapshot(lobby) });
        broadcastLobby(lobbyId);
        return;
      }
    }

    // New team joining
    if (!lobby.teams.team1) {
      lobby.teams.team1 = { socketId: socket.id, name: teamName || 'Team 1' };
      console.log(`[Lobby] Team1 joined: ${lobbyId} name=${teamName}`);
      if (callback) callback({ success: true, role: 'team1', lobby: getLobbySnapshot(lobby) });
    } else if (!lobby.teams.team2) {
      lobby.teams.team2 = { socketId: socket.id, name: teamName || 'Team 2' };
      console.log(`[Lobby] Team2 joined: ${lobbyId} name=${teamName}`);
      if (callback) callback({ success: true, role: 'team2', lobby: getLobbySnapshot(lobby) });

      // Both teams joined → move to coin flip
      lobby.phase = 'coin_flip';
      // Randomly assign who chooses heads/tails
      lobby.coinFlipChooser = Math.random() < 0.5 ? 'team1' : 'team2';
      console.log(`[Lobby] Both teams joined, coin flip chooser: ${lobby.coinFlipChooser}`);
    } else {
      // Lobby full — join as spectator
      if (callback) callback({ success: true, role: 'spectator', lobby: getLobbySnapshot(lobby) });
    }

    broadcastLobby(lobbyId);
  });

  // ─── CHOOSE SIDE (heads/tails) ───────────────────────────────────────────────
  socket.on('chooseSide', ({ lobbyId, choice }, callback) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.phase !== 'coin_flip') {
      if (callback) callback({ success: false, error: 'Invalid state' });
      return;
    }

    // Validate it's the chooser's socket
    const chooserTeam = lobby.coinFlipChooser;
    if (!chooserTeam || lobby.teams[chooserTeam]?.socketId !== socket.id) {
      if (callback) callback({ success: false, error: 'Not your turn to choose' });
      return;
    }

    lobby.coinFlipChoice = choice; // 'heads' or 'tails'
    console.log(`[Lobby] ${lobbyId} ${chooserTeam} chose ${choice}`);

    // Flip the coin
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    lobby.coinResult = result;
    lobby.coinWinner = result === choice ? chooserTeam : (chooserTeam === 'team1' ? 'team2' : 'team1');

    console.log(`[Lobby] ${lobbyId} coin result: ${result}, winner: ${lobby.coinWinner}`);

    // Move to choose_order phase after delay for animation + reading result
    setTimeout(() => {
      lobby.phase = 'choose_order';
      broadcastLobby(lobbyId);
    }, 6000);

    broadcastLobby(lobbyId);
    if (callback) callback({ success: true });
  });

  // ─── CHOOSE ORDER (ban first / ban second) ───────────────────────────────────
  socket.on('chooseOrder', ({ lobbyId, banFirst }, callback) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.phase !== 'choose_order') {
      if (callback) callback({ success: false, error: 'Invalid state' });
      return;
    }

    // Validate it's the coin winner
    const winner = lobby.coinWinner;
    if (!winner || lobby.teams[winner]?.socketId !== socket.id) {
      if (callback) callback({ success: false, error: 'Not your turn to choose' });
      return;
    }

    // banFirst: 'self' or 'opponent'
    let banFirstTeam;
    if (banFirst === 'self') {
      banFirstTeam = winner;
    } else {
      banFirstTeam = winner === 'team1' ? 'team2' : 'team1';
    }

    lobby.banFirst = banFirstTeam;
    lobby.resolvedSequence = resolveSequence(lobby.sequence, banFirstTeam);
    lobby.phase = 'ban_pick';
    lobby.currentStep = 0;

    // Handle auto-decider as first step (shouldn't happen but guard)
    advanceAutoSteps(lobby);

    console.log(`[Lobby] ${lobbyId} banFirst=${banFirstTeam}, starting ban/pick`);
    broadcastLobby(lobbyId);
    if (callback) callback({ success: true });
  });

  // ─── BAN MAP ─────────────────────────────────────────────────────────────────
  socket.on('banMap', ({ lobbyId, mapName }, callback) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.phase !== 'ban_pick') {
      if (callback) callback({ success: false, error: 'Invalid state' });
      return;
    }

    const step = lobby.resolvedSequence[lobby.currentStep];
    if (!step || step.action !== 'ban') {
      if (callback) callback({ success: false, error: 'Not a ban step' });
      return;
    }

    const actingTeam = step.team;
    if (lobby.teams[actingTeam]?.socketId !== socket.id) {
      if (callback) callback({ success: false, error: 'Not your turn' });
      return;
    }

    if (lobby.mapStates[mapName] !== 'available') {
      if (callback) callback({ success: false, error: 'Map not available' });
      return;
    }

    lobby.mapStates[mapName] = 'banned';
    lobby.result.banned.push({ map: mapName, team: actingTeam });
    lobby.currentStep++;

    advanceAutoSteps(lobby);
    checkComplete(lobby);

    console.log(`[Lobby] ${lobbyId} step ${lobby.currentStep - 1}: ${actingTeam} banned ${mapName}`);
    broadcastLobby(lobbyId);
    if (callback) callback({ success: true });
  });

  // ─── PICK MAP ────────────────────────────────────────────────────────────────
  socket.on('pickMap', ({ lobbyId, mapName }, callback) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.phase !== 'ban_pick') {
      if (callback) callback({ success: false, error: 'Invalid state' });
      return;
    }

    const step = lobby.resolvedSequence[lobby.currentStep];
    if (!step || step.action !== 'pick') {
      if (callback) callback({ success: false, error: 'Not a pick step' });
      return;
    }

    const actingTeam = step.team;
    if (lobby.teams[actingTeam]?.socketId !== socket.id) {
      if (callback) callback({ success: false, error: 'Not your turn' });
      return;
    }

    if (lobby.mapStates[mapName] !== 'available') {
      if (callback) callback({ success: false, error: 'Map not available' });
      return;
    }

    lobby.mapStates[mapName] = actingTeam === 'team1' ? 'picked_team1' : 'picked_team2';
    lobby.result.picked.push({ map: mapName, team: actingTeam });
    lobby.currentStep++;

    advanceAutoSteps(lobby);
    checkComplete(lobby);

    console.log(`[Lobby] ${lobbyId} step ${lobby.currentStep - 1}: ${actingTeam} picked ${mapName}`);
    broadcastLobby(lobbyId);
    if (callback) callback({ success: true });
  });

  // ─── GET MAP POOL ────────────────────────────────────────────────────────────
  socket.on('getMapPool', (callback) => {
    if (callback) callback({ success: true, mapPool: ACTIVE_MAP_POOL, allMaps: ALL_COMPETITIVE_MAPS });
  });

  // ─── SET MAP POOL ────────────────────────────────────────────────────────────
  socket.on('setMapPool', ({ maps }, callback) => {
    if (!Array.isArray(maps) || maps.length < 7) {
      if (callback) callback({ success: false, error: 'Map pool must contain at least 7 maps' });
      return;
    }
    // Validate all maps are known
    const invalid = maps.filter((m) => !ALL_COMPETITIVE_MAPS.includes(m));
    if (invalid.length > 0) {
      if (callback) callback({ success: false, error: `Unknown maps: ${invalid.join(', ')}` });
      return;
    }

    ACTIVE_MAP_POOL = [...maps].sort();
    console.log(`[MapPool] Updated: ${ACTIVE_MAP_POOL.join(', ')}`);

    // Broadcast new pool to everyone connected
    io.emit('mapPoolUpdated', { mapPool: ACTIVE_MAP_POOL });

    if (callback) callback({ success: true, mapPool: ACTIVE_MAP_POOL });
  });

  // ─── DISCONNECT ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

/**
 * Advance through auto-decider steps automatically
 */
function advanceAutoSteps(lobby) {
  if (!lobby.resolvedSequence) return;
  while (lobby.currentStep < lobby.resolvedSequence.length) {
    const step = lobby.resolvedSequence[lobby.currentStep];
    if (step.action === 'decider' && step.team === 'auto') {
      // Find remaining available map and mark as decider
      const remaining = lobby.maps.find((m) => lobby.mapStates[m] === 'available');
      if (remaining) {
        lobby.mapStates[remaining] = 'decider';
        lobby.result.decider = remaining;
        lobby.currentStep++;
        console.log(`[Lobby] Auto-decider: ${remaining}`);
      }
      break;
    } else {
      break;
    }
  }
}

/**
 * Check if ban/pick is complete
 */
function checkComplete(lobby) {
  if (!lobby.resolvedSequence) return;
  if (lobby.currentStep >= lobby.resolvedSequence.length) {
    lobby.phase = 'complete';
    console.log(`[Lobby] ${lobby.id} ban/pick complete`);
  }
}

const PORT = 4003;
httpServer.listen(PORT, () => {
  console.log(`[Server] VCT Ban/Pick server running on http://localhost:${PORT}`);
});
