import React, { useEffect, useState, useCallback } from 'react';
import './Maze.css';
import playerImg from './assets/player.png';

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
    // Carve a path to the exit from above or left
    if (exitRow > 0) maze[exitRow - 1][exitCol] = 0;
    else if (exitCol > 0) maze[exitRow][exitCol - 1] = 0;
  }
  return maze;
}

interface Player {
  row: number;
  col: number;
}

const Maze: React.FC = () => {
  const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(MAZE_SIZE));
  const [player, setPlayer] = useState<Player>({ row: 0, col: 0 });
  const [won, setWon] = useState(false);

  // Handle keyboard movement
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (won) return;
    let { row, col } = player;
    if (e.key === 'ArrowUp' && row > 0 && maze[row - 1][col] === 0) row--;
    if (e.key === 'ArrowDown' && row < MAZE_SIZE - 1 && maze[row + 1][col] === 0) row++;
    if (e.key === 'ArrowLeft' && col > 0 && maze[row][col - 1] === 0) col--;
    if (e.key === 'ArrowRight' && col < MAZE_SIZE - 1 && maze[row][col + 1] === 0) col++;
    setPlayer({ row, col });
    if (row === MAZE_SIZE - 1 && col === MAZE_SIZE - 1) setWon(true);
  }, [player, maze, won]);

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
    <div className="maze-container">
      <button onClick={regenerate}>Regenerate Maze</button>
      <div className="maze-grid">
        {maze.map((row, rIdx) => (
          <div className="maze-row" key={rIdx}>
            {row.map((cell, cIdx) => {
              let className = cell === 1 ? 'maze-wall' : 'maze-path';
              if (rIdx === player.row && cIdx === player.col) {
                return (
                  <div
                    className={className}
                    key={cIdx}
                  >
                    <img
                      src={playerImg}
                      alt="player"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
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
      {won && <div className="maze-win">You escaped the maze! 🎉</div>}
      <div className="maze-instructions">Use arrow keys to move the white dot.</div>
    </div>
  );
};

export default Maze;
