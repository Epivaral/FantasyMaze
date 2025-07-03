// Mob data loader for all mob JSONs

export type MobOutcome = {
  label: string;
  action: string;
  amount?: number;
  weight: number;
  type?: string;
  turns?: number;
};

export type MobData = {
  min: number;
  max: number;
  image: string;
  hiResImage: string;
  outcomes: MobOutcome[];
};

export async function loadMobData(mob: string): Promise<MobData> {
  switch (mob) {
    case 'wolf':
      return import('./wolf.json').then(m => m.default);
    case 'bones':
      return import('./bones.json').then(m => m.default);
    case 'maw':
      return import('./maw.json').then(m => m.default);
    case 'hp':
      return import('./hp.json').then(m => m.default);
    default:
      throw new Error('Unknown mob: ' + mob);
  }
}
