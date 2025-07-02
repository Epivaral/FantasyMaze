import React, { useEffect, useState, useCallback } from 'react';
import './Maze.css';
import playerImg from './assets/player.png';
import bonesImg from './assets/bones.png';
import wolfImg from './assets/wolf.png';
import hiResPlayerImg from './assets/hi-res/player.png';
import hiResBonesImg from './assets/hi-res/bones.png';
import hiResWolfImg from './assets/hi-res/wolf.png';
import { renderHearts } from './HeartBar';

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
  let openCount = Math.floor(size * size * 0.25); // open up 25% more cells
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

// Generate random mob positions with distance constraints
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
  function pickPositions(count: number, avoid: {row: number, col: number}[]) {
    const chosen: {row: number, col: number}[] = [];
    let tries = 0;
    while (chosen.length < count && tries < 1000) {
      const idx = Math.floor(Math.random() * pathCells.length);
      const pos = pathCells[idx];
      if (
        !chosen.some(p => manhattan(p, pos) < minDist) &&
        !avoid.some(p => manhattan(p, pos) < minDist)
      ) {
        chosen.push(pos);
      }
      tries++;
    }
    return chosen;
  }
  const bonesCount = Math.floor(Math.random() * (maxBones - minBones + 1)) + minBones;
  const wolvesCount = Math.floor(Math.random() * (maxWolves - minWolves + 1)) + minWolves;
  const bones = pickPositions(bonesCount, [player]);
  const wolves = pickPositions(wolvesCount, [player, ...bones]);
  return { bones, wolves };
}

interface Player {
  row: number;
  col: number;
}

const Maze: React.FC = () => {
  const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(MAZE_SIZE));
  const [player, setPlayer] = useState<Player>({ row: 0, col: 0 });
  const [won, setWon] = useState(false);
  const [mobs, setMobs] = useState<{ bones: {row: number, col: number}[], wolves: {row: number, col: number}[] }>({ bones: [], wolves: [] });
  const [modal, setModal] = useState<null | { type: 'bones' | 'wolf', row: number, col: number }>(null);
  const [health, setHealth] = useState(100);
  const [endModal, setEndModal] = useState<null | 'win' | 'lose'>(null);

  // Place mobs when maze or player resets
  useEffect(() => {
    setMobs(placeMobs(maze, { row: 0, col: 0 }));
    setHealth(100);
    setEndModal(null);
  }, [maze]);

  // Handle keyboard movement
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (endModal) {
      if (e.key === ' ') {
        regenerate();
      }
      return;
    }
    if (modal) {
      if (e.key === ' ') {
        // Remove the mob from the cell and deplete HP only once per encounter
        setHealth(h => {
          const newHealth = h - 20;
          if (newHealth <= 0) {
            setEndModal('lose');
            setModal(null);
            return 0;
          }
          return newHealth;
        });
        setMobs(prev => {
          if (!modal) return prev;
          const { type, row, col } = modal;
          return {
            bones: type === 'bones' ? prev.bones.filter(m => !(m.row === row && m.col === col)) : prev.bones,
            wolves: type === 'wolf' ? prev.wolves.filter(m => !(m.row === row && m.col === col)) : prev.wolves,
          };
        });
        setModal(null);
      }
      return;
    }
    let { row, col } = player;
    if (e.key === 'ArrowUp' && row > 0 && maze[row - 1][col] === 0) row--;
    if (e.key === 'ArrowDown' && row < MAZE_SIZE - 1 && maze[row + 1][col] === 0) row++;
    if (e.key === 'ArrowLeft' && col > 0 && maze[row][col - 1] === 0) col--;
    if (e.key === 'ArrowRight' && col < MAZE_SIZE - 1 && maze[row][col + 1] === 0) col++;
    // Check for mob collision
    const mobBones = mobs.bones.find(m => m.row === row && m.col === col);
    const mobWolf = mobs.wolves.find(m => m.row === row && m.col === col);
    if (mobBones) {
      setModal({ type: 'bones', row, col });
      setPlayer({ row, col }); // Move player into the cell for modal
      return;
    }
    if (mobWolf) {
      setModal({ type: 'wolf', row, col });
      setPlayer({ row, col }); // Move player into the cell for modal
      return;
    }
    setPlayer({ row, col });
    if (row === MAZE_SIZE - 1 && col === MAZE_SIZE - 1) {
      setWon(true);
      setEndModal('win');
    }
  }, [player, maze, won, mobs, modal, endModal]);

  // Listen for keyboard events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Regenerate maze
  const regenerate = () => {
    setMaze(generateMaze(MAZE_SIZE));
    setPlayer({ row: 0, col: 0 });
    setWon(false);
  };

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
                    <div className={className} key={cIdx}>
                      <img
                        src={playerImg}
                        alt="player"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
                      />
                    </div>
                  );
                }
                // Bones mob
                if (mobs.bones.some(m => m.row === rIdx && m.col === cIdx)) {
                  return (
                    <div className={className} key={cIdx}>
                      <img
                        src={bonesImg}
                        alt="bones"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
                      />
                    </div>
                  );
                }
                // Wolf mob
                if (mobs.wolves.some(m => m.row === rIdx && m.col === cIdx)) {
                  return (
                    <div className={className} key={cIdx}>
                      <img
                        src={wolfImg}
                        alt="wolf"
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
                      />
                    </div>
                  );
                }
                if (rIdx === 0 && cIdx === 0) className += ' maze-entrance';
                if (rIdx === MAZE_SIZE - 1 && cIdx === MAZE_SIZE - 1) className += ' maze-exit';
                return <div className={className} key={cIdx} />;
              })}
            </div>
          ))}
        </div>
        {modal && (
          <div className="maze-modal vs-modal">
            <div className="maze-modal-content">
              <div className="versus-title">VERSUS!</div>
              <div className="versus-row">
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <img src={hiResPlayerImg} alt="player" className="versus-img" />
                  <span className="asset-name">The Woken Blades</span>
                </div>
                <span className="versus-vs">VS</span>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                  <img src={modal.type === 'bones' ? hiResBonesImg : hiResWolfImg} alt={modal.type} className="versus-img" />
                  <span className="asset-name">
                    {modal.type === 'bones' ? 'Rustling Bones' : 'Night Prowler'}
                  </span>
                </div>
              </div>
              <div className="versus-instructions">Press SPACE to defeat the mob and continue<br/>You lose 20 HP!</div>
            </div>
          </div>
        )}
        {endModal && (
          <div className={`maze-modal ${endModal === 'win' ? 'win-modal' : 'lose-modal'}`}>
            <div className="maze-modal-content">
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
