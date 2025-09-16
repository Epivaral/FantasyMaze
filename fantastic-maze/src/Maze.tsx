// React and core dependencies
import React, { useEffect, useState, useRef } from 'react';

// Local modules
import { executeBattleAction } from './BattleActions';
import { createGameStateHandlers } from './GameActionHandlers';
import { renderHearts } from './HeartBar';

// Styles
import './Maze.css';

// Asset imports
import keyImg from './assets/key.png';
import hiResKeyImg from './assets/hi-res/key.png';
import fogImg from './assets/fog.png';
import playerImg from './assets/player.png';
import doorImg from './assets/door.png';
import bonesImg from './assets/bones.png';
import wolfImg from './assets/wolf.png';
import hpImg from './assets/hp.png';

// Hi-res asset imports
import hiResPlayerImg from './assets/hi-res/player.png';
import hiResDoorImg from './assets/hi-res/door.png';
import hiResBonesImg from './assets/hi-res/bones.png';
import hiResWolfImg from './assets/hi-res/wolf.png';
import hiResMawImg from './assets/hi-res/maw.png';
import hiResHpImg from './assets/hi-res/hp.png';
import hiResBackground from './assets/hi-res/background.png';

// Mob data imports
import wolfData from './mob-data/wolf.json';
import bonesData from './mob-data/bones.json';
import mawData from './mob-data/maw.json';
import hpData from './mob-data/hp.json';

// Lore markdown
import loreMd from './lore.md?raw'; // Vite raw import

// Type definitions
type KeyModalState = null | { x: number, y: number };
type KeyGateState = null | { x: number, y: number };


interface VsOption {
  label: string;
  action: string;
  amount?: number;
  weight?: number;
}

interface GenericVsModalProps {
  title: string;
  playerImg: string;
  mobImg: string;
  mobName: string;
  options: VsOption[];
  spinning: boolean;
  selectedIndex: number | null;
  hiResBackground: string;
}

export const GenericVsModal: React.FC<GenericVsModalProps> = ({
  title,
  playerImg,
  mobImg,
  mobName,
  options,
  spinning,
  selectedIndex,
  hiResBackground,
}) => {
  return (
    <div className="maze-modal vs-modal" onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      // Trigger mobile action on modal tap
      if (window.innerWidth < 1024) {
        // Simulate spacebar press for mobile
        const event = new KeyboardEvent('keydown', { key: ' ' });
        window.dispatchEvent(event);
      }
    }}>
      <div className="maze-modal-content" style={{
        backgroundImage: `url(${hiResBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="versus-title">{title}</div>
        <div className="versus-row">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <img src={playerImg} alt="player" className="versus-img" />
            <span className="asset-name">The Woken Blades</span>
          </div>
          <span className="versus-vs">VS</span>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <img src={mobImg} alt={mobName} className="versus-img" />
            <span className="asset-name">{mobName}</span>
          </div>
        </div>
        <div style={{
          marginTop: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.7rem',
        }}>
          {options.map((opt, idx) => (
            <div key={opt.label} style={{
              border: selectedIndex === idx ? '3px solid gold' : '1.5px solid #888',
              borderRadius: 8,
              padding: '0.5rem 1.2rem',
              background: '#181818',
              color: opt.amount && opt.amount < 0 ? '#f00' : '#ff0',
              fontWeight: 'bold',
              fontSize: '1.15rem',
              boxShadow: selectedIndex === idx ? '0 0 8px gold' : 'none',
              opacity: spinning && selectedIndex !== idx ? 0.5 : 1,
              transition: 'all 0.2s',
              minWidth: 120,
              textAlign: 'center',
              cursor: 'pointer',
            }}>
              {opt.label}
            </div>
          ))}
        </div>
        <div className="versus-instructions" style={{ fontSize: '1rem', marginTop: 10 }}>
          {spinning
            ? 'Press SPACE to stop the roulette!'
            : (selectedIndex !== null && options[selectedIndex])
              ? (<><br/>Result: {options[selectedIndex].label}<br/>Press SPACE to continue.</>)
              : 'Choose your fate!'}
        </div>
      </div>
    </div>
  );
};

// --- Lore Parsing and Asset Mapping ---

// Parse lore.md into a map: title -> { cursive, description }
function parseLore(md: string): Record<string, { cursive: string, description: string }> {
  const entries: Record<string, { cursive: string, description: string }> = {};
  // Normalize line endings and remove leading/trailing whitespace
  md = md.replace(/\r\n?/g, '\n').trim();
  // Split on --- with optional whitespace before/after
  const blocks = md.split(/\n\s*---+\s*\n/);
  for (const block of blocks) {
    const match = block.match(/^#\s+(.+?)\n([\s\S]*)/);
    if (match) {
      const title = match[1].trim();
      const body = match[2].trim();
      // Find all consecutive blockquote lines at the top
      const lines = body.split(/\n/);
      let cursiveLines: string[] = [];
      let rest: string[] = [];
      let inCursive = false;
      for (let i = 0; i < lines.length; ++i) {
        const line = lines[i];
        if (line.trim().startsWith('>')) {
          cursiveLines.push(line.replace(/^>\s?/, '').trim());
          inCursive = true;
        } else if (inCursive && line.trim() === '') {
          // Allow blank line after blockquotes
          continue;
        } else {
          rest = lines.slice(i);
          break;
        }
      }
      // Remove leading/trailing blank lines from rest
      while (rest.length && rest[0].trim() === '') rest.shift();
      while (rest.length && rest[rest.length-1].trim() === '') rest.pop();
      entries[title] = {
        cursive: cursiveLines.join('\n'),
        description: rest.join('\n').trim(),
      };
    }
  }
  // (Debug log removed)
  return entries;
}

const LORE = parseLore(loreMd);

// Asset to lore title mapping
const assetToLoreTitle: Record<string, string> = {
  bones: 'Rustling Bones',
  wolf: 'Night Prowler',
  hp: 'Unmarked Vial',
  player: 'The Woken Blades',
  maw: 'The Maw Below',
  key: 'Stained Exit Key',
};

// --- Generic Modal State ---
type ModalEntityType = 'wolf' | 'bones' | 'maw' | 'hp';
type ModalState = null | {
  type: ModalEntityType;
  mobKey: string;
  data: any;
  row: number;
  col: number;
  options: VsOption[];
};

// Map mob type to JSON data and images
const MOB_CONFIG: Record<string, { data: any; img: string; hiResImg: string; name: string }> = {
  wolf: { data: wolfData, img: wolfImg, hiResImg: hiResWolfImg, name: 'Night Prowler' },
  bones: { data: bonesData, img: bonesImg, hiResImg: hiResBonesImg, name: 'Rustling Bones' },
  maw: { data: mawData, img: hiResMawImg, hiResImg: hiResMawImg, name: 'The Maw' },
  hp: { data: hpData, img: hpImg, hiResImg: hiResHpImg, name: 'HP Vial' },
};

const MAZE_SIZE = 20;

// Directions: [row, col]
const DIRS = [
  [0, 1],   // right
  [1, 0],   // down
  [0, -1],  // left
  [-1, 0],  // up
];

// Maze cell types
export type Cell = 0 | 1; // 0 = path, 1 = wall

// Generate a random maze using recursive backtracking
// Also allows for slightly more walls (less open cells)
function generateMaze(size: number): Cell[][] {
  const maze: Cell[][] = Array.from({ length: size }, () => Array(size).fill(1));
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function carve(r: number, c: number) {
    maze[r][c] = 0;
    shuffle(DIRS).forEach(([dr, dc]) => {
      const nr = r + dr * 2;
      const nc = c + dc * 2;
      if (
        nr >= 0 && nr < size &&
        nc >= 0 && nc < size &&
        maze[nr][nc] === 1
      ) {
        maze[r + dr][c + dc] = 0;
        carve(nr, nc);
      }
    });
  }
  carve(0, 0); // Start at top-left
  maze[0][0] = 0; // Entrance
  // Ensure exit is connected
  const exitRow = size - 1;
  const exitCol = size - 1;
  maze[exitRow][exitCol] = 0; // Exit
  // Check if exit is isolated
  const neighbors = [
    [exitRow - 1, exitCol],
    [exitRow, exitCol - 1],
  ];
  if (neighbors.every(([r, c]) => maze[r]?.[c] !== 0)) {
    if (exitRow > 0) maze[exitRow - 1][exitCol] = 0;
    else if (exitCol > 0) maze[exitRow][exitCol - 1] = 0;
  }
  // Remove some random walls to make the maze a bit more open, but less than before
  // Make maze denser: only 12% open (was 15%)
  let openCount = Math.floor(size * size * 0.12);
  while (openCount > 0) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (maze[r][c] === 1 && !(r === 0 && c === 0) && !(r === size-1 && c === size-1)) {
      maze[r][c] = 0;
      openCount--;
    }
  }
  return maze;
}

// Utility to get Manhattan distance
function manhattan(a: {row: number, col: number}, b: {row: number, col: number}) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}


// Find the shortest path from (0,0) to (size-1,size-1) using BFS
function findShortestPath(maze: Cell[][]): {row: number, col: number}[] {
  const size = maze.length;
  const queue: {row: number, col: number, path: {row: number, col: number}[]}[] = [
    { row: 0, col: 0, path: [{ row: 0, col: 0 }] }
  ];
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  visited[0][0] = true;
  while (queue.length > 0) {
    const { row, col, path } = queue.shift()!;
    if (row === size - 1 && col === size - 1) return path;
    for (const [dr, dc] of DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      if (
        nr >= 0 && nr < size &&
        nc >= 0 && nc < size &&
        maze[nr][nc] === 0 &&
        !visited[nr][nc]
      ) {
        visited[nr][nc] = true;
        queue.push({ row: nr, col: nc, path: [...path, { row: nr, col: nc }] });
      }
    }
  }
  return [];
}

// Generate random mob positions with distance constraints, and force at least one mob on the shortest path
// Place mobs using min/max from JSON
function placeMobs(
  maze: Cell[][],
  player: Player,
  minDist: number = 2
) {
  const size = maze.length;
  const pathCells: {row: number, col: number}[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (maze[r][c] === 0 && !(r === 0 && c === 0)) pathCells.push({row: r, col: c});
    }
  }
  // Find shortest path and pick multiple cells (not start/end) for forced mobs
  const path = findShortestPath(maze);
  const pathChoices = path.filter(p => !(p.row === 0 && p.col === 0) && !(p.row === size-1 && p.col === size-1));
  // Place 2-3 forced mobs on the path, but only if not already occupied
  let forcedMobs: {row: number, col: number}[] = [];
  if (pathChoices.length > 0) {
    const forcedCount = Math.min(3, Math.max(2, Math.floor(pathChoices.length / 5))); // 2 or 3 forced mobs
    const shuffled = [...pathChoices].sort(() => Math.random() - 0.5);
    forcedMobs = [];
    for (let i = 0; i < shuffled.length && forcedMobs.length < forcedCount; i++) {
      const pos = shuffled[i];
      // Never place on start/end
      if ((pos.row === 0 && pos.col === 0) || (pos.row === size-1 && pos.col === size-1)) continue;
      forcedMobs.push(pos);
    }
  }

  // Helper to check if a cell is at least minDist away from all in a list
  function isFarEnough(pos: {row: number, col: number}, others: {row: number, col: number}[]) {
    return others.every(p => manhattan(p, pos) >= minDist);
  }

  function pickPositions(count: number, avoid: {row: number, col: number}[]) {
    const chosen: {row: number, col: number}[] = [];
    let tries = 0;
    while (chosen.length < count && tries < 1000) {
      const idx = Math.floor(Math.random() * pathCells.length);
      const pos = pathCells[idx];
      if (
        isFarEnough(pos, chosen) &&
        isFarEnough(pos, avoid) &&
        !forcedMobs.some(fm => fm.row === pos.row && fm.col === pos.col) &&
        !(pos.row === 0 && pos.col === 0) &&
        !(pos.row === size-1 && pos.col === size-1)
      ) {
        chosen.push(pos);
      }
      tries++;
    }
    return chosen;
  }

  // Use min/max from JSON for each mob type
  const bonesMin = MOB_CONFIG.bones.data.min;
  const bonesMax = MOB_CONFIG.bones.data.max;
  const wolfMin = MOB_CONFIG.wolf.data.min;
  const wolfMax = MOB_CONFIG.wolf.data.max;
  const mawMin = MOB_CONFIG.maw.data.min;
  const mawMax = MOB_CONFIG.maw.data.max;
  const bonesCount = Math.floor(Math.random() * (bonesMax - bonesMin + 1)) + bonesMin;
  const wolvesCount = Math.floor(Math.random() * (wolfMax - wolfMin + 1)) + wolfMin;
  const mawsCount = Math.floor(Math.random() * (mawMax - mawMin + 1)) + mawMin;

  // Place mobs, always avoiding start/end and other mobs, and forced mobs
  let bones = pickPositions(bonesCount, [player]);
  let wolves = pickPositions(wolvesCount, [player, ...bones]);
  let maws = pickPositions(mawsCount, [player, ...bones, ...wolves]);

  // Distribute forced mobs between bones, wolves, maws, but only if not already occupied and minDist is respected
  forcedMobs.forEach(fm => {
    // Don't place if already occupied by any mob
    if (
      bones.some(m => m.row === fm.row && m.col === fm.col) ||
      wolves.some(m => m.row === fm.row && m.col === fm.col) ||
      maws.some(m => m.row === fm.row && m.col === fm.col)
    ) return;
    // Don't place if too close to any mob
    if (!isFarEnough(fm, [...bones, ...wolves, ...maws, player])) return;
    const roll = Math.random();
    if (roll < 0.33) bones.push(fm);
    else if (roll < 0.66) wolves.push(fm);
    else maws.push(fm);
  });

  return { bones, wolves, maws };
}

interface Player {
  row: number;
  col: number;
}




type LoreModalState = null | { title: string, cursive: string, description: string, x: number, y: number };
const Maze: React.FC = () => {
  // --- Fog of War State ---
  // Move player state above fog state to avoid use-before-declare
  const [player, setPlayer] = useState<Player>({ row: 0, col: 0 });
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [playerAnimationDuration, setPlayerAnimationDuration] = useState(0.6); // Default duration
  const movingTimeoutRef = useRef<number | null>(null);
  const [keyPos, setKeyPos] = useState<{row: number, col: number} | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [keyModal, setKeyModal] = useState<KeyModalState>(null);
  const [sealedGateModal, setSealedGateModal] = useState<KeyGateState>(null);
  // Gradient fog: 0–2 distance = 0, 3=0.2, 4=0.4, 5=0.6, 6=0.8, >6=0.9
  function getFogArray(centerRow: number, centerCol: number) {
    const arr = Array.from({ length: MAZE_SIZE }, () => Array(MAZE_SIZE).fill(1));
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = centerCol + dx;
        const y = centerRow + dy;
        if (x >= 0 && x < MAZE_SIZE && y >= 0 && y < MAZE_SIZE) {
          let op = 1;
          if (dist <= 2) op = 0;
          else if (dist === 3) op = 0.2;
          else if (dist === 4) op = 0.5;
          else if (dist === 5) op = 0.8;
          arr[y][x] = op;
        }
      }
    }
    return arr;
  }
  const [fog, setFog] = useState<number[][]>(() => getFogArray(0, 0));
  // Reveal fog area around player whenever player moves
  useEffect(() => {
    setFog(getFogArray(player.row, player.col));
  }, [player]);
  // Lore modal state: { title, cursive, description, x, y } | null
  const [loreModal, setLoreModal] = useState<LoreModalState>(null);
  // Track if lore modal is active and follow mouse
  // Lore modal close on key press
  useEffect(() => {
    if (!loreModal) return;
    function handleLoreKey() {
      setLoreModal(null);
    }
    function handleLoreMouse(e: MouseEvent) {
      setLoreModal(modal => modal ? { ...modal, x: e.clientX, y: e.clientY } : null);
    }
    window.addEventListener('keydown', handleLoreKey);
    window.addEventListener('mousemove', handleLoreMouse);
    return () => {
      window.removeEventListener('keydown', handleLoreKey);
      window.removeEventListener('mousemove', handleLoreMouse);
    };
  }, [loreModal]);
  const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(MAZE_SIZE));
  const [won, setWon] = useState(false);
  const [mobs, setMobs] = useState<{ bones: {row: number, col: number}[], wolves: {row: number, col: number}[], maws: {row: number, col: number}[] }>({ bones: [], wolves: [], maws: [] });
  const [hpVials, setHpVials] = useState<{row: number, col: number}[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  // Use a simple boolean for spinning status
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  // Roulette result is an index for mobs, value for HP vials
  const [rouletteResult, setRouletteResult] = useState<number | null>(null);
  // Remove rouletteApplied, use modal presence as the only trigger
  const [health, setHealth] = useState(100);
  const [endModal, setEndModal] = useState<null | 'win' | 'lose'>(null);

  // Touch handling for direct grid interaction
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  const minSwipeDistance = 30;

  // Mobile sidebar toggle state
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  
  // Mobile viewport state
  const [isMobile, setIsMobile] = useState(false);
  const MOBILE_VIEWPORT_SIZE = 9; // 9x9 grid on mobile
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Calculate visible grid bounds for mobile viewport
  const getVisibleBounds = () => {
    if (!isMobile) {
      return { startRow: 0, endRow: MAZE_SIZE, startCol: 0, endCol: MAZE_SIZE };
    }
    
    const halfSize = Math.floor(MOBILE_VIEWPORT_SIZE / 2);
    let startRow = player.row - halfSize;
    let endRow = player.row + halfSize + (MOBILE_VIEWPORT_SIZE % 2);
    let startCol = player.col - halfSize;
    let endCol = player.col + halfSize + (MOBILE_VIEWPORT_SIZE % 2);
    
    // Adjust bounds to stay within maze
    if (startRow < 0) {
      endRow -= startRow;
      startRow = 0;
    }
    if (endRow > MAZE_SIZE) {
      startRow -= (endRow - MAZE_SIZE);
      endRow = MAZE_SIZE;
    }
    if (startCol < 0) {
      endCol -= startCol;
      startCol = 0;
    }
    if (endCol > MAZE_SIZE) {
      startCol -= (endCol - MAZE_SIZE);
      endCol = MAZE_SIZE;
    }
    
    // Ensure we don't go negative
    startRow = Math.max(0, startRow);
    startCol = Math.max(0, startCol);
    endRow = Math.min(MAZE_SIZE, endRow);
    endCol = Math.min(MAZE_SIZE, endCol);
    
    return { startRow, endRow, startCol, endCol };
  };
  
  // Exit modal for sealed gate (no key)
  

  // Place mobs when maze or player resets
  useEffect(() => {
    // Place mobs using min/max from JSON
    const mobsPlaced = placeMobs(maze, { row: 0, col: 0 });
    // Place 1-3 HP vials randomly (not on player, mobs, or entrance/exit)
    const size = maze.length;
    const avoid = [
      { row: 0, col: 0 },
      { row: size - 1, col: size - 1 },
      ...mobsPlaced.bones,
      ...mobsPlaced.wolves,
      ...(mobsPlaced.maws || []),
    ];
    const pathCells: {row: number, col: number}[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (maze[r][c] === 0 && !avoid.some(p => p.row === r && p.col === c)) {
          pathCells.push({ row: r, col: c });
        }
      }
    }
    const vialCount = Math.floor(Math.random() * 3) + 1; // 1-3 vials
    const vials: {row: number, col: number}[] = [];
    let tries = 0;
    while (vials.length < vialCount && tries < 1000 && pathCells.length > 0) {
      const idx = Math.floor(Math.random() * pathCells.length);
      const pos = pathCells[idx];
      if (!vials.some(p => p.row === pos.row && p.col === pos.col)) {
        vials.push(pos);
      }
      tries++;
    }
    // Place key in a random empty cell (not start/exit, not mob, not vial)
    const mobCells = [
      ...mobsPlaced.bones,
      ...mobsPlaced.wolves,
      ...(mobsPlaced.maws || []),
    ];
    const keyCandidates = pathCells.filter(cell =>
      !vials.some(v => v.row === cell.row && v.col === cell.col) &&
      !mobCells.some(m => m.row === cell.row && m.col === cell.col)
    );
    let keyCell: {row: number, col: number} | null = null;
    if (keyCandidates.length > 0) {
      keyCell = keyCandidates[Math.floor(Math.random() * keyCandidates.length)];
    }
    setMobs(mobsPlaced);
    setHpVials(vials);
    setKeyPos(keyCell);
    setHasKey(false);
    setKeyModal(null);
    setSealedGateModal(null);
    setHealth(100);
    setEndModal(null);
  }, [maze]);
  // Key modal close on spacebar
  useEffect(() => {
    if (!keyModal) return;
    function handleKeyModalKey(e: KeyboardEvent) {
      if (e.key === ' ') setKeyModal(null);
    }
    window.addEventListener('keydown', handleKeyModalKey);
    return () => window.removeEventListener('keydown', handleKeyModalKey);
  }, [keyModal]);

  // Close sealed gate modal on spacebar
  useEffect(() => {
    if (!sealedGateModal) return;
    function handleSealedGateKey(e: KeyboardEvent) {
      if (e.key === ' ') setSealedGateModal(null);
    }
    window.addEventListener('keydown', handleSealedGateKey);
    return () => window.removeEventListener('keydown', handleSealedGateKey);
  }, [sealedGateModal]);

  // --- Battle Action System Integration ---
  // Example: create handlers for the current state
  const gameStateHandlers = createGameStateHandlers({
    health,
    setHealth,
    setEndModal,
    setMobs,
    setMaze,
    generateMaze,
    player,
    setPlayer,
    mobs,
    MAZE_SIZE,
    // setRevealExitTurns, setLockExit: add these if you implement those features
  });

  // Example usage: call this to apply an action
  // executeBattleAction({ type: 'hp_gain', value: 10 }, gameStateHandlers);

  // --- Generic Roulette Logic for all mobs/vials ---
  useEffect(() => {
    if (!modal || !rouletteSpinning) return;
    let running = true;
    let timeout: any;
    function weightedRandomIndex(options: VsOption[]) {
      const weights = options.map(opt => opt.weight ?? 1);
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let i = 0; i < weights.length; ++i) {
        if (r < weights[i]) return i;
        r -= weights[i];
      }
      return options.length - 1;
    }
    function spin() {
      if (!running || !modal) return;
      // Always use options from modal.options
      const idx = weightedRandomIndex(modal.options);
      setRouletteResult(idx);
      timeout = setTimeout(spin, 80);
    }
    spin();
    return () => {
      running = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [rouletteSpinning, modal]);


  // (No-op: handled in modal/roulette handler)


  // --- Stable event handler using refs ---
  const modalRef = useRef(modal);
  const rouletteSpinningRef = useRef(rouletteSpinning);
  const rouletteResultRef = useRef(rouletteResult);
  const endModalRef = useRef(endModal);
  const playerRef = useRef(player);
  const mazeRef = useRef(maze);
  const mobsRef = useRef(mobs);
  const hpVialsRef = useRef(hpVials);
  const wonRef = useRef(won);

  useEffect(() => { modalRef.current = modal; }, [modal]);
  useEffect(() => { rouletteSpinningRef.current = rouletteSpinning; }, [rouletteSpinning]);
  useEffect(() => { rouletteResultRef.current = rouletteResult; }, [rouletteResult]);
  useEffect(() => { endModalRef.current = endModal; }, [endModal]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { mazeRef.current = maze; }, [maze]);
  useEffect(() => { mobsRef.current = mobs; }, [mobs]);
  useEffect(() => { hpVialsRef.current = hpVials; }, [hpVials]);
  useEffect(() => { wonRef.current = won; }, [won]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (movingTimeoutRef.current) {
        clearTimeout(movingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const modal = modalRef.current;
      const rouletteSpinning = rouletteSpinningRef.current;
      const rouletteResult = rouletteResultRef.current;
      const endModal = endModalRef.current;
      const player = playerRef.current;
      const maze = mazeRef.current;
      const mobs = mobsRef.current;
      const hpVials = hpVialsRef.current;
      const keyPosCurrent = keyPos;
      const hasKeyCurrent = hasKey;

      if (endModal) {
        if (e.key === ' ') {
          regenerate();
        }
        return;
      }
      // --- Unified modal/roulette handler ---
      if (modal) {
        const options = modal.options;
        if (options.length > 0) {
          // 1. If spinning, spacebar stops the spin
          if (rouletteSpinning && e.key === ' ') {
            setRouletteSpinning(false);
            return;
          }
          // 2. If not spinning, spacebar applies result and closes modal
          if (!rouletteSpinning && e.key === ' ' && rouletteResult !== null) {
            const selectedOpt = options[rouletteResult];
            // Use global action handler
            // Convert VsOption to BattleAction
            const { action, amount } = selectedOpt;
            let battleAction: any = { type: action };
            if (typeof amount !== 'undefined') battleAction.value = amount;
            // Special handling for teleport
            if (action === 'teleport') {
              const maze = mazeRef.current;
              const emptyCells: {row: number, col: number}[] = [];
              for (let r = 0; r < MAZE_SIZE; r++) {
                for (let c = 0; c < MAZE_SIZE; c++) {
                  if (maze[r][c] === 0 && !(r === 0 && c === 0) && !(r === MAZE_SIZE-1 && c === MAZE_SIZE-1)) {
                    emptyCells.push({row: r, col: c});
                  }
                }
              }
              if (emptyCells.length > 0) {
                const idx = Math.floor(Math.random() * emptyCells.length);
                setPlayer(emptyCells[idx]);
              }
            } else {
              executeBattleAction(battleAction, gameStateHandlers);
            }
            // Always remove mob after any outcome
            if (modal.type === 'wolf' || modal.type === 'bones' || modal.type === 'maw') {
              setMobs(prev => {
                const { type, row, col } = modal;
                const bones = Array.isArray(prev.bones) ? prev.bones : [];
                const wolves = Array.isArray(prev.wolves) ? prev.wolves : [];
                const maws = Array.isArray(prev.maws) ? prev.maws : [];
                return {
                  bones: type === 'bones' ? bones.filter((m: {row: number, col: number}) => !(m.row === row && m.col === col)) : bones,
                  wolves: type === 'wolf' ? wolves.filter((m: {row: number, col: number}) => !(m.row === row && m.col === col)) : wolves,
                  maws: type === 'maw' ? maws.filter((m: {row: number, col: number}) => !(m.row === row && m.col === col)) : maws,
                };
              });
            } else if (modal.type === 'hp') {
              setHpVials(vials => vials.filter(v => !(v.row === modal.row && v.col === modal.col)));
            }
            setModal(null);
            setTimeout(() => {
              setRouletteResult(null);
              setRouletteSpinning(false);
            }, 0);
            return;
          }
          return;
        }
      }
      let { row, col } = player;
      let moved = false;
      if (e.key === 'ArrowUp' && row > 0 && maze[row - 1][col] === 0) { row--; moved = true; }
      if (e.key === 'ArrowDown' && row < MAZE_SIZE - 1 && maze[row + 1][col] === 0) { row++; moved = true; }
      if (e.key === 'ArrowLeft' && col > 0 && maze[row][col - 1] === 0) { col--; moved = true; }
      if (e.key === 'ArrowRight' && col < MAZE_SIZE - 1 && maze[row][col + 1] === 0) { col++; moved = true; }
      if (!moved) return;
      
      // Generate random animation duration and store it
      const animationDuration = (Math.floor(Math.random() * 5) + 4) * 0.1; // 0.4-0.8s
      const animationDurationMs = animationDuration * 1000;
      
      // Set player as moving and store the duration
      setIsPlayerMoving(true);
      setPlayerAnimationDuration(animationDuration);
      

      if (movingTimeoutRef.current) {
        clearTimeout(movingTimeoutRef.current);
      }
      
      // Reset to idle after one complete animation cycle
      movingTimeoutRef.current = setTimeout(() => {
        setIsPlayerMoving(false);
      }, animationDurationMs);
      
      // Update player position first
      setPlayer({ row, col });
      // Now check for mob/vial/key collision at new position
      // Check for mob collision (bones, wolf, maw)
      const mobTypes: Array<{ type: ModalEntityType, list: {row: number, col: number}[] }> = [
        { type: 'wolf', list: mobs.wolves },
        { type: 'bones', list: mobs.bones },
        { type: 'maw', list: mobs.maws },
      ];
      for (const mob of mobTypes) {
        const found = mob.list.find(m => m.row === row && m.col === col);
        if (found) {
          const mobKey = mob.type;
          const config = MOB_CONFIG[mobKey];
          const options: VsOption[] = config.data.outcomes;
          setModal({
            type: mob.type,
            mobKey,
            data: config.data,
            row,
            col,
            options,
          });
          setRouletteResult(null);
          setRouletteSpinning(true);
          return;
        }
      }
      // Key item (fix: use refs for keyPos/hasKey)
      if (keyPosCurrent && row === keyPosCurrent.row && col === keyPosCurrent.col && !hasKeyCurrent) {
        setHasKey(true);
        setKeyModal({ x: row, y: col });
        setKeyPos(null);
        return;
      }
      // HP vial
      const hpVial = hpVials.find(v => v.row === row && v.col === col);
      if (hpVial) {
        const config = MOB_CONFIG['hp'];
        setModal({
          type: 'hp',
          mobKey: 'hp',
          data: config.data,
          row,
          col,
          options: config.data.outcomes,
        });
        setRouletteResult(null);
        setRouletteSpinning(true);
        return;
      }
      if (row === MAZE_SIZE - 1 && col === MAZE_SIZE - 1) {
        if (!hasKeyCurrent) {
          setSealedGateModal({ x: row, y: col });
          return;
        } else {
          setWon(true);
          setEndModal('win');
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyPos, hasKey]);

  // Mobile control handlers
  const handleMobileMove = (direction: string) => {
    if (modal || endModal || loreModal || keyModal || sealedGateModal) return;
    
    const { row, col } = player;
    let newRow = row;
    let newCol = col;

    switch (direction) {
      case 'up': newRow = row - 1; break;
      case 'down': newRow = row + 1; break;
      case 'left': newCol = col - 1; break;
      case 'right': newCol = col + 1; break;
    }

    // Check bounds
    if (newRow < 0 || newRow >= MAZE_SIZE || newCol < 0 || newCol >= MAZE_SIZE) return;

    if (maze[newRow][newCol] === 0) {
      // Generate random animation duration and store it
      const animationDuration = (Math.floor(Math.random() * 5) + 4) * 0.1; // 0.4-0.8s
      const animationDurationMs = animationDuration * 1000;
      
      // Set player as moving and store the duration
      setIsPlayerMoving(true);
      setPlayerAnimationDuration(animationDuration);
      
      if (movingTimeoutRef.current) {
        clearTimeout(movingTimeoutRef.current);
      }
      
      // Reset to idle after one complete animation cycle
      movingTimeoutRef.current = setTimeout(() => {
        setIsPlayerMoving(false);
      }, animationDurationMs);
      
      // Update player position first
      setPlayer({ row: newRow, col: newCol });
      
      // Check for interactions at new position (same logic as keyboard handler)
      // Check for mob collision (bones, wolf, maw)
      const mobTypes: Array<{ type: ModalEntityType, list: {row: number, col: number}[] }> = [
        { type: 'wolf', list: mobs.wolves },
        { type: 'bones', list: mobs.bones },
        { type: 'maw', list: mobs.maws },
      ];
      for (const mob of mobTypes) {
        const found = mob.list.find(m => m.row === newRow && m.col === newCol);
        if (found) {
          const mobKey = mob.type;
          const config = MOB_CONFIG[mobKey];
          const options: VsOption[] = config.data.outcomes;
          setModal({
            type: mob.type,
            mobKey,
            data: config.data,
            row: newRow,
            col: newCol,
            options,
          });
          setRouletteResult(null);
          setRouletteSpinning(true);
          return;
        }
      }
      
      // Key item check
      if (keyPos && newRow === keyPos.row && newCol === keyPos.col && !hasKey) {
        setHasKey(true);
        setKeyModal({ x: newRow, y: newCol });
        setKeyPos(null);
        return;
      }
      
      // HP vial check
      const hpVial = hpVials.find(v => v.row === newRow && v.col === newCol);
      if (hpVial) {
        const config = MOB_CONFIG['hp'];
        setModal({
          type: 'hp',
          mobKey: 'hp',
          data: config.data,
          row: newRow,
          col: newCol,
          options: config.data.outcomes,
        });
        setRouletteResult(null);
        setRouletteSpinning(true);
        return;
      }
      
      // Sealed gate check
      if (newRow === MAZE_SIZE - 1 && newCol === MAZE_SIZE - 1 && !hasKey) {
        setSealedGateModal({ x: newRow, y: newCol });
        return;
      }
      
      // Check win condition
      if (newRow === MAZE_SIZE - 1 && newCol === MAZE_SIZE - 1 && hasKey) {
        setWon(true);
        setEndModal('win');
      }
    }
  };

  // Touch/swipe handlers for direct grid interaction
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStart || !touchEnd) return;

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if it's a swipe (minimum distance) or a tap
    if (absDeltaX < minSwipeDistance && absDeltaY < minSwipeDistance) {
      // It's a tap - handle grid tap for mobile viewport
      if (isMobile) {
        handleMobileGridTap(e);
      } else {
        handleMobileAction();
      }
    } else {
      // It's a swipe - determine direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          handleMobileMove('right');
        } else {
          handleMobileMove('left');
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          handleMobileMove('down');
        } else {
          handleMobileMove('up');
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleGridTap = (e: React.MouseEvent) => {
    // For desktop, simple click triggers action
    if (window.innerWidth >= 1024) return; // Only on mobile
    e.preventDefault();
    if (isMobile) {
      handleMobileGridTap(e);
    } else {
      handleMobileAction();
    }
  };

  // Handle tap on mobile viewport grid
  const handleMobileGridTap = (e: React.TouchEvent | React.MouseEvent) => {
    if (modal || endModal || loreModal || keyModal || sealedGateModal) return;
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Calculate which cell was tapped based on mobile grid
    const bounds = getVisibleBounds();
    const cellSize = isMobile ? 35 : 18; // Updated for 9x9 mobile viewport
    const gridWidth = (bounds.endCol - bounds.startCol) * cellSize;
    const gridHeight = (bounds.endRow - bounds.startRow) * cellSize;
    
    const cellCol = Math.floor((x / gridWidth) * (bounds.endCol - bounds.startCol)) + bounds.startCol;
    const cellRow = Math.floor((y / gridHeight) * (bounds.endRow - bounds.startRow)) + bounds.startRow;
    
    // Check if tapped cell is valid and within bounds
    if (cellRow >= 0 && cellRow < MAZE_SIZE && cellCol >= 0 && cellCol < MAZE_SIZE) {
      if (maze[cellRow][cellCol] === 0) { // Only move to open cells
        // Move player to tapped cell
        setPlayer({ row: cellRow, col: cellCol });
        
        // Check for interactions at new position
        checkCellInteractions(cellRow, cellCol);
      }
    }
  };

  // Helper function to check for interactions at a cell
  const checkCellInteractions = (row: number, col: number) => {
    // Check for mob collision (bones, wolf, maw)
    const mobTypes: Array<{ type: ModalEntityType, list: {row: number, col: number}[] }> = [
      { type: 'wolf', list: mobs.wolves },
      { type: 'bones', list: mobs.bones },
      { type: 'maw', list: mobs.maws },
    ];
    for (const mob of mobTypes) {
      const found = mob.list.find(m => m.row === row && m.col === col);
      if (found) {
        const mobKey = mob.type;
        const config = MOB_CONFIG[mobKey];
        const options: VsOption[] = config.data.outcomes;
        setModal({
          type: mob.type,
          mobKey,
          data: config.data,
          row,
          col,
          options,
        });
        setRouletteResult(null);
        setRouletteSpinning(true);
        return;
      }
    }
    
    // Key item check
    if (keyPos && row === keyPos.row && col === keyPos.col && !hasKey) {
      setHasKey(true);
      setKeyModal({ x: row, y: col });
      setKeyPos(null);
      return;
    }
    
    // HP vial check
    const hpVial = hpVials.find(v => v.row === row && v.col === col);
    if (hpVial) {
      const config = MOB_CONFIG['hp'];
      setModal({
        type: 'hp',
        mobKey: 'hp',
        data: config.data,
        row,
        col,
        options: config.data.outcomes,
      });
      setRouletteResult(null);
      setRouletteSpinning(true);
      return;
    }
    
    // Sealed gate check
    if (row === MAZE_SIZE - 1 && col === MAZE_SIZE - 1 && !hasKey) {
      setSealedGateModal({ x: row, y: col });
      return;
    }
    
    // Check win condition
    if (row === MAZE_SIZE - 1 && col === MAZE_SIZE - 1 && hasKey) {
      setWon(true);
      setEndModal('win');
    }
  };

  // Mobile sidebar toggle handlers
  const toggleLeftSidebar = () => {
    setShowLeftSidebar(!showLeftSidebar);
    setShowRightSidebar(false); // Close other sidebar
  };

  const toggleRightSidebar = () => {
    setShowRightSidebar(!showRightSidebar);
    setShowLeftSidebar(false); // Close other sidebar
  };

  const handleMobileAction = () => {
    if (loreModal) {
      setLoreModal(null);
    } else if (keyModal) {
      setKeyModal(null);
      if (!hasKey) setHasKey(true);
    } else if (sealedGateModal) {
      if (hasKey) {
        setSealedGateModal(null);
        setHasKey(false);
      }
    } else if (modal && modal.options.length > 0) {
      // Handle roulette modal interaction - same as spacebar
      if (rouletteSpinning) {
        // Stop roulette
        setRouletteSpinning(false);
      } else if (typeof rouletteResult === 'number') {
        // Execute result - same logic as spacebar handler
        const selectedOpt = modal.options[rouletteResult];
        const { action, amount } = selectedOpt;
        let battleAction: any = { type: action };
        if (typeof amount !== 'undefined') battleAction.value = amount;
        
        // Special handling for teleport
        if (action === 'teleport') {
          const emptyCells: {row: number, col: number}[] = [];
          for (let r = 0; r < MAZE_SIZE; r++) {
            for (let c = 0; c < MAZE_SIZE; c++) {
              if (maze[r][c] === 0 && !(r === 0 && c === 0) && !(r === MAZE_SIZE-1 && c === MAZE_SIZE-1)) {
                emptyCells.push({row: r, col: c});
              }
            }
          }
          if (emptyCells.length > 0) {
            const idx = Math.floor(Math.random() * emptyCells.length);
            setPlayer(emptyCells[idx]);
          }
        } else {
          executeBattleAction(battleAction, gameStateHandlers);
        }
        
        // Always remove mob after any outcome
        if (modal.type === 'wolf' || modal.type === 'bones' || modal.type === 'maw') {
          setMobs(prev => {
            const { type, row, col } = modal;
            const bones = Array.isArray(prev.bones) ? prev.bones : [];
            const wolves = Array.isArray(prev.wolves) ? prev.wolves : [];
            const maws = Array.isArray(prev.maws) ? prev.maws : [];
            return {
              bones: type === 'bones' ? bones.filter((m: {row: number, col: number}) => !(m.row === row && m.col === col)) : bones,
              wolves: type === 'wolf' ? wolves.filter((m: {row: number, col: number}) => !(m.row === row && m.col === col)) : wolves,
              maws: type === 'maw' ? maws.filter((m: {row: number, col: number}) => !(m.row === row && m.col === col)) : maws,
            };
          });
        } else if (modal.type === 'hp') {
          setHpVials(vials => vials.filter(v => !(v.row === modal.row && v.col === modal.col)));
        }
        
        setModal(null);
        setTimeout(() => {
          setRouletteResult(null);
          setRouletteSpinning(false);
        }, 0);
      }
    } else if (endModal) {
      if (endModal === 'win' || endModal === 'lose') {
        setEndModal(null);
        regenerate();
      }
    }
  };



  // Regenerate maze
  const regenerate = () => {
    setMaze(generateMaze(MAZE_SIZE));
    setPlayer({ row: 0, col: 0 });
    setWon(false);
    
  };

  return (
    <div className="maze-layout">
      {/* Mobile toggle buttons */}
      <div className="mobile-toggle-buttons">
        <div className="mobile-toggle-btn" onClick={toggleLeftSidebar}>
          📊 Stats
        </div>
        <div className="mobile-toggle-btn" onClick={toggleRightSidebar}>
          📖 Guide
        </div>
      </div>

      <div className={`maze-sidebar maze-sidebar-left ${showLeftSidebar ? 'mobile-visible' : ''}`}>
        <button className="mobile-close-btn" onClick={toggleLeftSidebar}>×</button>
        <div className="player-stats-box">
          <h2>Player Stats</h2>
          <ul>
            <li>{renderHearts(health)}</li>
            <li>Attack: 10</li>
            <li>Defense: 5</li>
            {/* Add more stats as needed */}
          </ul>
          <button className="regenerate-btn" onClick={regenerate} disabled={!!modal || !!endModal}>Regenerate Maze</button>
          {/* Key icon display if collected */}
          {hasKey && (
            <div style={{marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <img src={keyImg} alt="Stained Exit Key" style={{width: 38, height: 38, filter: 'drop-shadow(0 0 8px gold)'}} />
              <div style={{fontSize: '1.05rem', color: '#bfa76a', marginTop: 2, fontWeight: 600}}>Stained Exit Key</div>
            </div>
          )}
        </div>
      </div>
      <div className="maze-container">
        <div 
          className="maze-grid"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleGridTap}
          style={isMobile ? {
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid #666',
            background: '#000000',
          } : undefined}
        >
          {(() => {
            const bounds = getVisibleBounds();
            const rowsToRender = [];
            
            for (let rIdx = bounds.startRow; rIdx < bounds.endRow; rIdx++) {
              const row = maze[rIdx];
              if (!row) continue;
              
              const cellsToRender = [];
              for (let cIdx = bounds.startCol; cIdx < bounds.endCol; cIdx++) {
                const cell = row[cIdx];
                if (cell === undefined) continue;
                
                let className = cell === 1 ? 'maze-wall' : 'maze-path';
                // FOG: If fogged, render fog overlay and block lore hover
                const fogOpacity = fog[rIdx][cIdx];
                
                // Apply mobile cell size
                const cellStyle = isMobile ? {
                  width: '35px',
                  height: '35px',
                  fontSize: '12px',
                } : {};
                
                // Player
                if (rIdx === player.row && cIdx === player.col) {
                  cellsToRender.push(
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10, ...cellStyle }}
                      onMouseEnter={e => {
                        if (fogOpacity > 0.85) return;
                        const lore = LORE[assetToLoreTitle['player']];
                        setLoreModal({
                          title: assetToLoreTitle['player'],
                          cursive: lore?.cursive || '',
                          description: lore?.description || '',
                          x: (e as any).clientX || 0,
                          y: (e as any).clientY || 0
                        });
                      }}
                      onMouseLeave={() => setLoreModal(null)}
                    >
                      {isPlayerMoving ? (
                        <div
                          className="player-animated"
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'block', 
                            pointerEvents: 'auto', 
                            userSelect: 'none', 
                            cursor: 'pointer',
                            animationDelay: `${Math.random() * 0.8}s`, // Random start frame 0-0.8s
                            animationDuration: `${playerAnimationDuration}s` // Use stored duration for exact cycle timing
                          }}
                        />
                      ) : (
                        <img
                          src={playerImg}
                          alt="player"
                          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
                          draggable={false}
                        />
                      )}
                      {fogOpacity > 0 && <img src={fogImg} alt="fog" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:fogOpacity,pointerEvents:'auto',zIndex:20}} draggable={false} />}
                    </div>
                  );
                  continue;
                }
                // Bones mob
                if (mobs.bones.some(m => m.row === rIdx && m.col === cIdx)) {
                  cellsToRender.push(
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10, ...cellStyle }}
                      onMouseEnter={e => {
                        if (fogOpacity > 0.85) return;
                        const lore = LORE[assetToLoreTitle['bones']];
                        setLoreModal({
                          title: assetToLoreTitle['bones'],
                          cursive: lore?.cursive || '',
                          description: lore?.description || '',
                          x: (e as any).clientX || 0,
                          y: (e as any).clientY || 0
                        });
                      }}
                      onMouseLeave={() => setLoreModal(null)}
                    >
                      <div
                        className="bones-animated"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'block', 
                          pointerEvents: 'auto', 
                          userSelect: 'none', 
                          cursor: 'pointer',
                          animationDelay: `${Math.random() * 0.8}s`, // Random start frame 0-0.8s
                          animationDuration: `${(Math.floor(Math.random() * 5) + 4) * 0.1}s` // Random duration 0.4-0.8s in 0.1 increments
                        }}
                      />
                      {fogOpacity > 0 && <img src={fogImg} alt="fog" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:fogOpacity,pointerEvents:'auto',zIndex:20}} draggable={false} />}
                    </div>
                  );
                  continue;
                }
                // Wolf mob
                if (mobs.wolves.some(m => m.row === rIdx && m.col === cIdx)) {
                  cellsToRender.push(
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10, ...cellStyle }}
                      onMouseEnter={e => {
                        if (fogOpacity > 0.85) return;
                        const lore = LORE[assetToLoreTitle['wolf']];
                        setLoreModal({
                          title: assetToLoreTitle['wolf'],
                          cursive: lore?.cursive || '',
                          description: lore?.description || '',
                          x: (e as any).clientX || 0,
                          y: (e as any).clientY || 0
                        });
                      }}
                      onMouseLeave={() => setLoreModal(null)}
                    >
                      <img
                        src={wolfImg}
                        alt="wolf"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
                        draggable={false}
                      />
                      {fogOpacity > 0 && <img src={fogImg} alt="fog" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:fogOpacity,pointerEvents:'auto',zIndex:20}} draggable={false} />}
                    </div>
                  );
                  continue;
                }
                // Maw mob
                if (mobs.maws && mobs.maws.some(m => m.row === rIdx && m.col === cIdx)) {
                  cellsToRender.push(
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10, ...cellStyle }}
                      onMouseEnter={e => {
                        if (fogOpacity > 0.85) return;
                        const lore = LORE[assetToLoreTitle['maw']];
                        setLoreModal({
                          title: assetToLoreTitle['maw'],
                          cursive: lore?.cursive || '',
                          description: lore?.description || '',
                          x: (e as any).clientX || 0,
                          y: (e as any).clientY || 0
                        });
                      }}
                      onMouseLeave={() => setLoreModal(null)}
                    >
                      <img
                        src={hiResMawImg}
                        alt="maw"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
                        draggable={false}
                      />
                      {fogOpacity > 0 && <img src={fogImg} alt="fog" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:fogOpacity,pointerEvents:'auto',zIndex:20}} draggable={false} />}
                    </div>
                  );
                  continue;
                }
                // HP vial
                if (hpVials.some(v => v.row === rIdx && v.col === cIdx)) {
                  cellsToRender.push(
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10, ...cellStyle }}
                      onMouseEnter={e => {
                        if (fogOpacity > 0.85) return;
                        const lore = LORE[assetToLoreTitle['hp']];
                        setLoreModal({
                          title: assetToLoreTitle['hp'],
                          cursive: lore?.cursive || '',
                          description: lore?.description || '',
                          x: (e as any).clientX || 0,
                          y: (e as any).clientY || 0
                        });
                      }}
                      onMouseLeave={() => setLoreModal(null)}
                    >
                      <img
                        src={hpImg}
                        alt="hp vial"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
                        draggable={false}
                      />
                      {fogOpacity > 0 && <img src={fogImg} alt="fog" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:fogOpacity,pointerEvents:'auto',zIndex:20}} draggable={false} />}
                    </div>
                  );
                  continue;
                }
                // Key cell
                if (keyPos && rIdx === keyPos.row && cIdx === keyPos.col) {
                  cellsToRender.push(
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10, ...cellStyle }}
                      onMouseEnter={e => {
                        if (fogOpacity > 0.85) return;
                        const lore = LORE[assetToLoreTitle['key']];
                        setLoreModal({
                          title: assetToLoreTitle['key'],
                          cursive: lore?.cursive || '',
                          description: lore?.description || '',
                          x: (e as any).clientX || 0,
                          y: (e as any).clientY || 0
                        });
                      }}
                      onMouseLeave={() => setLoreModal(null)}
                    >
                      <img
                        src={keyImg}
                        alt="key"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer', filter: 'brightness(1.2) drop-shadow(0 0 8px gold)' }}
                        draggable={false}
                      />
                      {fogOpacity > 0 && <img src={fogImg} alt="fog" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:fogOpacity,pointerEvents:'auto',zIndex:20}} draggable={false} />}
                    </div>
                  );
                  continue;
                }
                
                // Exit cell: add green glow
                const isExit = rIdx === MAZE_SIZE - 1 && cIdx === MAZE_SIZE - 1;
                cellsToRender.push(
                  <div
                    className={className}
                    key={cIdx}
                    style={{
                      position: 'relative',
                      boxShadow: isExit ? '0 0 0 1px #00ff6a, 0 0 8px 1px #00ff6a88' : undefined,
                      border: isExit ? '1px solid #00ff6a' : undefined,
                      zIndex: isExit ? 5 : undefined,
                      backgroundImage: isExit ? `url(${doorImg})` : undefined,
                      backgroundSize: isExit ? 'cover' : undefined,
                      backgroundPosition: isExit ? 'center' : undefined,
                      ...cellStyle,
                    }}
                  >
                    {fogOpacity > 0 && <img src={fogImg} alt="fog" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:fogOpacity,pointerEvents:'auto',zIndex:20}} draggable={false} />}
                  </div>
                );
              }
              
              rowsToRender.push(
                <div className="maze-row" key={rIdx}>
                  {cellsToRender}
                </div>
              );
            }
            
            return <>{rowsToRender}</>;
          })()}
        </div>
        {/* Key Modal (moved outside grid for reliability) */}
        {keyModal && (
          <div className="maze-modal vs-modal" style={{zIndex: 4000}} onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.innerWidth < 1024) {
              setKeyModal(null);
            }
          }}>
            <div className="maze-modal-content" style={{
              backgroundImage: `url(${hiResBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: '#fff',
              textAlign: 'center',
              minWidth: 320,
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontFamily: 'EB Garamond, serif',
              border: '2.5px solid #bfa76a',
              borderRadius: 12,
              boxShadow: '0 0 48px #000a',
              padding: '2.5rem 2.5rem 2.5rem 2.5rem',
            }}>
              <img src={hiResKeyImg} alt="Key" style={{width: 96, height: 96, marginBottom: 18, filter: 'drop-shadow(0 0 12px #bfa76a)'}} />
              <div style={{fontWeight: 700, fontSize: '1.3rem', marginBottom: 8}}>Stained Exit Key</div>
              <div style={{fontSize: '1.05rem', color: '#ffe', marginBottom: 12}}>
                One of two now rests in your hands, you can now leave the maze.<br />
              </div>
              <div style={{marginTop: 12, fontSize: '1.1rem', color: '#bfa76a'}}>Press SPACE to close</div>
            </div>
          </div>
        )}
        {/* Gate Modal (moved outside grid for reliability) */}
        {sealedGateModal && (
        <div className="maze-modal vs-modal" style={{zIndex: 4000}} onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.innerWidth < 1024) {
            setSealedGateModal(null);
          }
        }}>
          <div className="maze-modal-content" style={{
            backgroundImage: `url(${hiResBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#fff',
            textAlign: 'center',
            minWidth: 320,
            minHeight: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontFamily: 'EB Garamond, serif',
            border: '2.5px solid #bfa76a',
            borderRadius: 12,
            boxShadow: '0 0 48px #000a',
            padding: '2.5rem 2.5rem 2.5rem 2.5rem',
          }}>
            <img src={hiResDoorImg} alt="Sealed Gate" style={{width: 96, height: 96, marginBottom: 18, filter: 'drop-shadow(0 0 12px #bfa76a)'}} />
            <div style={{fontWeight: 700, fontSize: '1.3rem', marginBottom: 8}}>The Sealed Gate</div>
            <div style={{fontSize: '1.05rem', color: '#ffe', marginBottom: 12}}>
              The gate opens to those who uncover the key...<br />or survive the one who holds it.
            </div>
            <div style={{marginTop: 12, fontSize: '1.1rem', color: '#bfa76a'}}>Press SPACE to close</div>
          </div>
        </div>
      )}
        {/* Lore Modal (global, not inside grid) */}
        {loreModal && (
          <div
            className="maze-modal lore-modal"
            style={{
              alignItems: 'flex-start',
              justifyContent: 'center',
              zIndex: 3000,
              pointerEvents: 'none',
            }}
          >
            <div
              className="maze-modal-content lore-modal-content"
              style={{
                backgroundImage: `url(${hiResBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                maxWidth: 480,
                minWidth: 300,
                color: '#e0e0e0',
                boxShadow: '0 0 48px #000a',
                position: 'fixed',
                // Improved: keep modal inside viewport
                left: Math.max(12, Math.min(window.innerWidth - 500, loreModal.x)),
                top: Math.max(12, Math.min(window.innerHeight - 220, loreModal.y - 12)),
                transform: 'translate(-10px, -100%)',
                pointerEvents: 'none',
                border: '2.5px solid #bfa76a',
                borderRadius: 12,
                padding: '1.1rem 1.5rem 1.1rem 0.8rem',
                background: 'rgba(18,14,10,0.98)',
                fontFamily: '"EB Garamond", "Georgia", "Garamond", serif',
                fontSize: '0.98rem',
                letterSpacing: '0.01em',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: '0.8rem',
                lineHeight: 1.22,
              }}
              tabIndex={-1}
            >
              {/* Asset image, left-aligned */}
              <div style={{flex: '0 0 56px', marginRight: 6, marginTop: 2}}>
                {(() => {
                  let imgSrc = null;
                  if (loreModal.title === 'Rustling Bones') imgSrc = hiResBonesImg;
                  else if (loreModal.title === 'Night Prowler') imgSrc = hiResWolfImg;
                  else if (loreModal.title === 'Unmarked Vial') imgSrc = hiResHpImg;
                  else if (loreModal.title === 'The Woken Blades') imgSrc = hiResPlayerImg;
                  else if (loreModal.title === 'The Maw Below') imgSrc = hiResMawImg;
                  else if (loreModal.title === 'Stained Exit Key') imgSrc = hiResKeyImg;
                  return imgSrc ? (
                    <img src={imgSrc} alt={loreModal.title} style={{width: 44, height: 44, objectFit: 'contain', filter: 'brightness(0.97) drop-shadow(0 0 6px #000a)'}} />
                  ) : null;
                })()}
              </div>
              {/* Text content, right-aligned */}
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{
                  fontFamily: '"Cinzel", "EB Garamond", serif',
                  fontWeight: 700,
                  fontSize: '1.08rem',
                  color: '#e7d7a7',
                  marginBottom: 6,
                  textShadow: '0 2px 8px #000b',
                  letterSpacing: '0.04em',
                  textAlign: 'left',
                  borderBottom: '1.2px solid #bfa76a',
                  paddingBottom: 1,
                  marginLeft: 2,
                  marginRight: 6,
                }}>{loreModal.title}</div>
                {loreModal.cursive && (
                  <div style={{
                    fontStyle: 'italic',
                    color: '#bfa76a',
                    fontFamily: '"EB Garamond", "Georgia", "Garamond", serif',
                    fontSize: '0.93rem',
                    marginBottom: 6,
                    textAlign: 'left',
                    whiteSpace: 'pre-line',
                    textShadow: '0 1px 4px #000a',
                  }}>{loreModal.cursive}</div>
                )}
                {loreModal.description && (
                  <div style={{
                    whiteSpace: 'pre-line',
                    color: '#e0e0e0',
                    textShadow: '0 1px 4px #000a',
                    fontSize: '12px',
                    lineHeight: 1.22,
                    marginBottom: 0,
                    textAlign: 'left',
                    fontFamily: '"EB Garamond", "Georgia", "Garamond", serif',
                  }}>{loreModal.description}</div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Generic VS Modal for all mobs and vials */}
        {modal && (
          <GenericVsModal
            title={modal.type === 'hp' ? 'HP VIAL!' : 'VERSUS!'}
            playerImg={hiResPlayerImg}
            mobImg={MOB_CONFIG[modal.mobKey].hiResImg}
            mobName={MOB_CONFIG[modal.mobKey].name}
            options={modal.options}
            spinning={rouletteSpinning}
            selectedIndex={typeof rouletteResult === 'number' ? rouletteResult : null}
            hiResBackground={hiResBackground}
          />
        )}
        {endModal && (
          <div className={`maze-modal ${endModal === 'win' ? 'win-modal' : 'lose-modal'}`} onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.innerWidth < 1024) {
              regenerate();
            }
          }}>
            <div className="maze-modal-content" style={{
              backgroundImage: `url(${hiResBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}>
              <div className="versus-title">{endModal === 'win' ? 'YOU WIN!' : 'GAME OVER'}</div>
              <div className="versus-row">
                <img src={hiResPlayerImg} alt="player" className="versus-img" />
                {endModal === 'win' ? (
                  <span className="versus-vs">🏁</span>
                ) : (
                  <span className="versus-vs">💀</span>
                )}
              </div>
              <div className="versus-instructions">Press SPACE to start a new game</div>
            </div>
          </div>
        )}
      </div>
      <div className={`maze-sidebar maze-sidebar-right ${showRightSidebar ? 'mobile-visible' : ''}`}>
        <button className="mobile-close-btn" onClick={toggleRightSidebar}>×</button>
        <div className="maze-instructions-box">
          <h2>What remains on Shadows</h2>
          <p style={{ 
            color: '#D4AF37', 
            fontStyle: 'italic', 
            marginBottom: '1em',
            textAlign: 'right',
          }}>
            The maze shifts, the dark listens, and only one path remembers your name.<br/>
            <b>- The Unspoken Rules</b>
          </p>
          <ul>
            <li>Let the <strong>arrow keys</strong> sigils guide your steps through the foggy halls.</li>
            <br/>
            <li>Should a threat block your path, step into it! There is no other way.</li>
            <br/>
            <li>Your rival will not hesitate. You shouldn’t either. Strike with <strong>SPACE</strong>.</li>
            <br/>
            <li>The crimson gate marks the end. Few reach it. Fewer leave through it.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Maze;
