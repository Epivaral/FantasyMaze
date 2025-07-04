// GameActionHandlers.ts
import type { GameState, MobType } from './BattleActions';
import type { Cell } from './Maze';

// Utility to get a random open cell
function getRandomOpenCell(maze: Cell[][], avoid: {row: number, col: number}[]): {row: number, col: number} {
  const openCells: {row: number, col: number}[] = [];
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze.length; c++) {
      if (maze[r][c] === 0 && !avoid.some(p => p.row === r && p.col === c)) {
        openCells.push({ row: r, col: c });
      }
    }
  }
  return openCells[Math.floor(Math.random() * openCells.length)] || { row: 0, col: 0 };
}

// Factory to create handlers for all game actions, using React state setters
export function createGameStateHandlers(params: {
  health: number;
  setHealth: (h: number) => void;
  setEndModal: (m: 'win' | 'lose' | null) => void;
  setMobs: (fn: (prev: any) => any) => void;
  setMaze: (maze: Cell[][]) => void;
  generateMaze: (size: number) => Cell[][];
  player: { row: number; col: number };
  setPlayer: (p: { row: number; col: number }) => void;
  mobs: { bones: {row: number, col: number}[], wolves: {row: number, col: number}[] };
  MAZE_SIZE: number;
  setRevealExitTurns?: (n: number) => void;
  setLockExit?: (locked: boolean) => void;
}) : GameState {
  return {
    health: params.health,
    setHealth: params.setHealth,
    addHealth: (delta) => {
      // Use callback if possible, else fallback to direct set
      if (typeof params.setHealth === 'function' && params.setHealth.length === 1) {
        // Try to detect if setHealth is a React setter (accepts a function)
        (params.setHealth as React.Dispatch<React.SetStateAction<number>>)((h: number) => {
          const newHealth = Math.max(0, Math.min(100, h + delta));
          if (newHealth <= 0) {
            params.setEndModal('lose');
          }
          return newHealth;
        });
      } else {
        // Fallback: use params.health
        const newHealth = Math.max(0, Math.min(100, params.health + delta));
        if (newHealth <= 0) {
          params.setEndModal('lose');
        }
        params.setHealth(newHealth);
      }
    },
    defeatMob: () => {
      // Remove mob at player location
      params.setMobs(prev => {
        const { row, col } = params.player;
        return {
          bones: prev.bones.filter((m: any) => !(m.row === row && m.col === col)),
          wolves: prev.wolves.filter((m: any) => !(m.row === row && m.col === col)),
        };
      });
    },
    gameOver: () => {
      params.setEndModal('lose');
    },
    shuffleMaze: () => {
      const newMaze = params.generateMaze(params.MAZE_SIZE);
      params.setMaze(newMaze);
      // Optionally, you could also re-place mobs here
    },
    teleportPlayer: () => {
      const avoid = [params.player, ...params.mobs.bones, ...params.mobs.wolves];
      const cell = getRandomOpenCell(params.setMaze as any, avoid); // You may want to pass maze directly
      params.setPlayer(cell);
    },
    spawnMob: (mobType: MobType, count: number) => {
      params.setMobs(prev => {
        const avoid = [params.player, ...prev.bones, ...prev.wolves];
        let newMobs = [];
        for (let i = 0; i < count; i++) {
          const cell = getRandomOpenCell(params.setMaze as any, avoid.concat(newMobs));
          newMobs.push(cell);
        }
        return {
          ...prev,
          [mobType === 'bones' ? 'bones' : 'wolves']: [...prev[mobType === 'bones' ? 'bones' : 'wolves'], ...newMobs],
        };
      });
    },
    revealExit: (turns: number) => {
      if (params.setRevealExitTurns) params.setRevealExitTurns(turns);
    },
    lockExit: () => {
      if (params.setLockExit) params.setLockExit(true);
    },
  };
}
