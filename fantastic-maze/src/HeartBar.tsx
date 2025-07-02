import fullHeart from './assets/full.png';
import emptyHeart from './assets/empty.png';
import defaultHalfHeart from './assets/half.png';

// Renders up to 5 hearts, using half-heart for 10 HP steps if provided
export function renderHearts(health: number, halfHeartImg: string = defaultHalfHeart) {
  const hearts = [];
  for (let i = 0; i < 5; i++) {
    const value = health - i * 20;
    let src = emptyHeart;
    let alt = 'Empty Heart';
    if (value >= 20) {
      src = fullHeart;
      alt = 'Full Heart';
    } else if (value >= 10) {
      src = halfHeartImg;
      alt = 'Half Heart';
    }
    hearts.push(
      <img
        key={i}
        src={src}
        alt={alt}
        style={{ width: 24, height: 24, marginRight: 2 }}
      />
    );
  }
  return <span>{hearts}</span>;
}
