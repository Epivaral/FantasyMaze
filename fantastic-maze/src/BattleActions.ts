// BattleActions.ts

export type MobType = 'bones' | 'wolf';

export type BattleAction =
  | { type: 'set_hp'; value: number }
  | { type: 'hp_gain'; value: number }
  | { type: 'defeat'; pos?: { row: number; col: number } }
  | { type: 'lose' }
  | { type: 'shuffle_maze' }
  | { type: 'teleport' }
  | { type: 'spawn_mob'; mobType: MobType; count: number }
  | { type: 'reveal_exit'; turns: number }
  | { type: 'lock_exit' };

// Example GameState interface (to be adapted to your state management)
export interface GameState {
  health: number;
  setHealth: (h: number) => void;
  addHealth: (delta: number) => void;
  defeatMob: () => void;
  gameOver: () => void;
  shuffleMaze: () => void;
  teleportPlayer: () => void;
  spawnMob: (mobType: MobType, count: number) => void;
  revealExit: (turns: number) => void;
  lockExit: () => void;
}

// Main executor function
export function executeBattleAction(action: BattleAction, state: GameState) {
  switch (action.type) {
    case 'set_hp':
      state.setHealth(action.value);
      break;
    case 'hp_gain':
      state.addHealth(action.value);
      break;
    case 'defeat':
      // Pass position if provided
      if (action.pos) {
        (state.defeatMob as any)(action.pos);
      } else {
        state.defeatMob();
      }
      break;
    case 'lose':
      state.gameOver();
      break;
    case 'shuffle_maze':
      state.shuffleMaze();
      break;
    case 'teleport':
      state.teleportPlayer();
      break;
    case 'spawn_mob':
      state.spawnMob(action.mobType, action.count);
      break;
    case 'reveal_exit':
      state.revealExit(action.turns);
      break;
    case 'lock_exit':
      state.lockExit();
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn('Unknown action', action);
  }
}
