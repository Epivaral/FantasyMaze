import fullHeart from './assets/full.png';
import emptyHeart from './assets/empty.png';

export function renderHearts(health: number) {
  const hearts = [];
  for (let i = 0; i < 5; i++) {
    hearts.push(
      <img
        key={i}
        src={health >= (i + 1) * 20 ? fullHeart : emptyHeart}
        alt={health >= (i + 1) * 20 ? 'Full Heart' : 'Empty Heart'}
        style={{ width: 24, height: 24, marginRight: 2 }}
      />
    );
  }
  return <span>{hearts}</span>;
}
