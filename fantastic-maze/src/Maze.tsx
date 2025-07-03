// --- Generic VS Modal (parameterized) ---
// Usage: <GenericVsModal ...props />

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
  onStop: () => void;
  onApply: (option: VsOption) => void;
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
  onStop,
  onApply,
  hiResBackground,
}) => {
  return (
    <div className="maze-modal vs-modal">
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
        <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem'}}>
          {options.map((opt, idx) => (
            <div key={opt.label} style={{
              border: selectedIndex === idx ? '4px solid gold' : '2px solid #888',
              borderRadius: 12,
              padding: '1rem 2.5rem',
              background: '#181818',
              color: opt.amount && opt.amount < 0 ? '#f00' : '#ff0',
              fontWeight: 'bold',
              fontSize: '2rem',
              boxShadow: selectedIndex === idx ? '0 0 16px gold' : 'none',
              opacity: spinning && selectedIndex !== idx ? 0.5 : 1,
              transition: 'all 0.2s',
            }}>
              {opt.label}
            </div>
          ))}
        </div>
        <div className="versus-instructions">
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

import React, { useEffect, useState, useRef } from 'react';
import { executeBattleAction } from './BattleActions';
import { createGameStateHandlers } from './GameActionHandlers';
// --- Lore Parsing and Asset Mapping ---
import loreMd from './lore.md?raw'; // Vite raw import

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
  // Debug: log all parsed keys
  console.log('LORE keys:', Object.keys(entries));
  return entries;
}

const LORE = parseLore(loreMd);

// Asset to lore title mapping
const assetToLoreTitle: Record<string, string> = {
  bones: 'Rustling Bones',
  wolf: 'Night Prowler',
  hp: 'Unmarked Vial',
  player: 'The Woken Blades',
};
import './Maze.css';
import playerImg from './assets/player.png';
import bonesImg from './assets/bones.png';
import wolfImg from './assets/wolf.png';
import hiResPlayerImg from './assets/hi-res/player.png';
import hiResBonesImg from './assets/hi-res/bones.png';
import hiResWolfImg from './assets/hi-res/wolf.png';
import wolfData from './mob-data/wolf.json';
import bonesData from './mob-data/bones.json';
import mawData from './mob-data/maw.json';
import hpData from './mob-data/hp.json';
import hiResMawImg from './assets/hi-res/maw.png';
import { renderHearts } from './HeartBar';
import hpImg from './assets/hp.png';
import hiResHpImg from './assets/hi-res/hp.png';
import hiResBackground from './assets/hi-res/background.png';


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
  // Remove some random walls to make the maze more open
  // Make maze denser: only 15% open (was 20%)
  let openCount = Math.floor(size * size * 0.15);
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
function placeMobs(
  maze: Cell[][],
  player: Player,
  minBones: number = 5,
  maxBones: number = 10,
  minWolves: number = 3,
  maxWolves: number = 5,
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
  // Place 2-3 forced mobs on the path
  let forcedMobs: {row: number, col: number}[] = [];
  if (pathChoices.length > 0) {
    const forcedCount = Math.min(3, Math.max(2, Math.floor(pathChoices.length / 5))); // 2 or 3 forced mobs
    const shuffled = [...pathChoices].sort(() => Math.random() - 0.5);
    forcedMobs = shuffled.slice(0, forcedCount);
  }
  function pickPositions(count: number, avoid: {row: number, col: number}[]) {
    const chosen: {row: number, col: number}[] = [];
    let tries = 0;
    while (chosen.length < count && tries < 1000) {
      const idx = Math.floor(Math.random() * pathCells.length);
      const pos = pathCells[idx];
      if (
        !chosen.some(p => manhattan(p, pos) < minDist) &&
        !avoid.some(p => manhattan(p, pos) < minDist) &&
        (!forcedMobs.some(fm => fm.row === pos.row && fm.col === pos.col))
      ) {
        chosen.push(pos);
      }
      tries++;
    }
    return chosen;
  }
  const bonesCount = Math.floor(Math.random() * (maxBones - minBones + 1)) + minBones;
  const wolvesCount = Math.floor(Math.random() * (maxWolves - minWolves + 1)) + minWolves;
  let bones = pickPositions(bonesCount, [player]);
  let wolves = pickPositions(wolvesCount, [player, ...bones]);
  // Distribute forced mobs between bones and wolves randomly
  forcedMobs.forEach(fm => {
    if (Math.random() < 0.5) bones = [fm, ...bones];
    else wolves = [fm, ...wolves];
  });
  return { bones, wolves };
}

interface Player {
  row: number;
  col: number;
}


// Remove legacy ModalType, use ModalState

type LoreModalState = null | { title: string, cursive: string, description: string, x: number, y: number };
const Maze: React.FC = () => {
  // Lore modal state: { title, cursive, description, x, y } | null
  const [loreModal, setLoreModal] = useState<LoreModalState>(null);
  // Track if lore modal is active and follow mouse
  // Removed unused loreMouseMoveRef to fix TS6133 warning
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
  const [player, setPlayer] = useState<Player>({ row: 0, col: 0 });
  const [won, setWon] = useState(false);
  const [mobs, setMobs] = useState<{ bones: {row: number, col: number}[], wolves: {row: number, col: number}[] }>({ bones: [], wolves: [] });
  const [hpVials, setHpVials] = useState<{row: number, col: number}[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  // Use a simple boolean for spinning status
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  // Roulette result is an index for mobs, value for HP vials
  const [rouletteResult, setRouletteResult] = useState<number | null>(null);
  // Remove rouletteApplied, use modal presence as the only trigger
  const [health, setHealth] = useState(100);
  const [endModal, setEndModal] = useState<null | 'win' | 'lose'>(null);

  // Place mobs when maze or player resets
  useEffect(() => {
    // Place mobs
    const mobsPlaced = placeMobs(maze, { row: 0, col: 0 });
    // Place 1-3 HP vials randomly (not on player, mobs, or entrance/exit)
    const size = maze.length;
    const avoid = [
      { row: 0, col: 0 },
      { row: size - 1, col: size - 1 },
      ...mobsPlaced.bones,
      ...mobsPlaced.wolves,
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
    setMobs(mobsPlaced);
    setHpVials(vials);
    setHealth(100);
    setEndModal(null);
  }, [maze]);

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

  // Handle HP gain and vial removal after roulette
  // Handle HP gain and vial removal after roulette, now on spacebar after stop


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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ...existing code...
      const modal = modalRef.current;
      const rouletteSpinning = rouletteSpinningRef.current;
      const rouletteResult = rouletteResultRef.current;
      const endModal = endModalRef.current;
      const player = playerRef.current;
      const maze = mazeRef.current;
      const mobs = mobsRef.current;
      const hpVials = hpVialsRef.current;
      // const won = wonRef.current; // (unused)

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
            executeBattleAction(battleAction, gameStateHandlers);
            // Remove mob/vial from map if needed
            if (modal.type === 'wolf' || modal.type === 'bones' || modal.type === 'maw') {
              setMobs(prev => {
                const { type, row, col } = modal;
                return {
                  bones: type === 'bones' ? prev.bones.filter(m => !(m.row === row && m.col === col)) : prev.bones,
                  wolves: type === 'wolf' ? prev.wolves.filter(m => !(m.row === row && m.col === col)) : prev.wolves,
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
      if (e.key === 'ArrowUp' && row > 0 && maze[row - 1][col] === 0) row--;
      if (e.key === 'ArrowDown' && row < MAZE_SIZE - 1 && maze[row + 1][col] === 0) row++;
      if (e.key === 'ArrowLeft' && col > 0 && maze[row][col - 1] === 0) col--;
      if (e.key === 'ArrowRight' && col < MAZE_SIZE - 1 && maze[row][col + 1] === 0) col++;
      // --- Generic mob/vial collision logic ---
      // Check for mob collision (bones, wolf, maw)
      const mobTypes: Array<{ type: ModalEntityType, list: {row: number, col: number}[] }> = [
        { type: 'wolf', list: mobs.wolves },
        { type: 'bones', list: mobs.bones },
        // Add maw support if you add to mobs
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
          setPlayer({ row, col });
          setRouletteResult(null);
          setRouletteSpinning(true);
          return;
        }
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
        setPlayer({ row, col });
        setRouletteResult(null);
        setRouletteSpinning(true);
        return;
      }
      setPlayer({ row, col });
      if (row === MAZE_SIZE - 1 && col === MAZE_SIZE - 1) {
        setWon(true);
        setEndModal('win');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // (removed old useEffect for handleKeyDown)

  // Regenerate maze
  const regenerate = () => {
    setMaze(generateMaze(MAZE_SIZE));
    setPlayer({ row: 0, col: 0 });
    setWon(false);
  };


  // (Removed MobRoulette component, now handled by GenericVsModal)

  return (
    <div className="maze-layout">
      <div className="maze-sidebar maze-sidebar-left">
        <div className="player-stats-box">
          <h2>Player Stats</h2>
          <ul>
            <li>{renderHearts(health)}</li>
            <li>Attack: 10</li>
            <li>Defense: 5</li>
            {/* Add more stats as needed */}
          </ul>
          <button className="regenerate-btn" onClick={regenerate} disabled={!!modal || !!endModal}>Regenerate Maze</button>
        </div>
      </div>
      <div className="maze-container">
        <div className="maze-grid">
          {maze.map((row, rIdx) => (
            <div className="maze-row" key={rIdx}>
              {row.map((cell, cIdx) => {
                let className = cell === 1 ? 'maze-wall' : 'maze-path';
                // Player
                if (rIdx === player.row && cIdx === player.col) {
                  return (
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10 }}
                      onMouseEnter={e => {
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
                      <img
                        src={playerImg}
                        alt="player"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
                        draggable={false}
                      />
                    </div>
                  );
                }
                // Bones mob
                if (mobs.bones.some(m => m.row === rIdx && m.col === cIdx)) {
                  return (
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10 }}
                      onMouseEnter={e => {
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
                      <img
                        src={bonesImg}
                        alt="bones"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
                        draggable={false}
                      />
                    </div>
                  );
                }
                // Wolf mob
                if (mobs.wolves.some(m => m.row === rIdx && m.col === cIdx)) {
                  return (
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10 }}
                      onMouseEnter={e => {
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
                    </div>
                  );
                }
                // HP vial
                if (hpVials.some(v => v.row === rIdx && v.col === cIdx)) {
                  return (
                    <div
                      className={className}
                      key={cIdx}
                      style={{ position: 'relative', zIndex: 10 }}
                      onMouseEnter={e => {
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
                    </div>
                  );
                }
                // Default: render wall or path cell
                return <div className={className} key={cIdx}></div>;
              })}
            </div>
          ))}
        </div>
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
            onStop={() => setRouletteSpinning(false)}
            onApply={opt => {
              // Convert VsOption to BattleAction
              const { action, amount } = opt;
              let battleAction: any = { type: action };
              if (typeof amount !== 'undefined') battleAction.value = amount;
              executeBattleAction(battleAction, gameStateHandlers);
              // Remove mob/vial from map if needed
              if (modal.type === 'wolf' || modal.type === 'bones' || modal.type === 'maw') {
                setMobs(prev => {
                  const { type, row, col } = modal;
                  return {
                    bones: type === 'bones' ? prev.bones.filter(m => !(m.row === row && m.col === col)) : prev.bones,
                    wolves: type === 'wolf' ? prev.wolves.filter(m => !(m.row === row && m.col === col)) : prev.wolves,
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
            }}
            hiResBackground={hiResBackground}
          />
        )}
        {endModal && (
          <div className={`maze-modal ${endModal === 'win' ? 'win-modal' : 'lose-modal'}`}>
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
      <div className="maze-sidebar maze-sidebar-right">
        <div className="maze-instructions-box">
          <h2>Instructions</h2>
          <ul>
            <li>Use arrow keys to move the player</li>
            <li>Enter a mob cell to battle.</li>
            <li>Press SPACE to defeat a mob and continue.</li>
            <li>Reach the red exit to win!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Maze;
