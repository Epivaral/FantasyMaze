# Multioption Modal Roulette Implementation Guide

This document describes how to implement a modal window with a multioption roulette (e.g., for mob battles or HP vials) in React, in a way that avoids bugs with state, event listeners, and modal closing.

## 1. State Structure
- `modal`: Holds modal info, e.g. `{ type: 'mob', row, col, options: [...] }` or `{ type: 'hp', row, col }` or `null`.
- `rouletteSpinning`: Boolean, true while the roulette is spinning.
- `rouletteResult`: Index or value of the selected option, or `null`.

## 2. Option Representation
- Store all possible outcomes in an array, e.g.:
  ```js
  const mobOptions = [
    { label: 'Miss', effect: ... },
    { label: 'Block', effect: ... },
    { label: 'Hit', effect: ... },
    { label: 'Critical', effect: ... },
  ];
  ```
- Pass this array to the modal via the `modal` state.

## 3. Roulette Animation Logic
- Use a `useEffect` that runs when `rouletteSpinning` is true and the modal is open.
- On each tick, randomly select an index from the options array:
  ```js
  setRouletteResult(Math.floor(Math.random() * options.length));
  ```
- Use a constant interval (e.g., 80ms) for smooth animation.
- Stop spinning on spacebar press.

## 4. Keyboard Handling (Stable Listener)
- Use a single, stable event listener (attached once in a `useEffect` with an empty dependency array).
- Use refs to always access the latest state inside the handler.
- On spacebar:
  - If spinning, stop the spin.
  - If not spinning and a result is selected, apply the effect, close the modal, and reset roulette state.

## 5. Modal UI
- Render all options in a row or column.
- Highlight the currently selected option (`rouletteResult`).
- Show instructions: "Press SPACE to stop the roulette!" and then "Press SPACE to continue."

## 6. Closing the Modal
- Always set `modal` to `null` to close.
- Reset `rouletteResult` and `rouletteSpinning` after closing (e.g., in a `setTimeout` after closing the modal).

## 7. Common Pitfalls to Avoid
- **Stale closure bugs:** Always use refs for state accessed in event listeners.
- **Multiple event listeners:** Only attach the keydown listener once.
- **Roulette always picking the same option:** Use `Math.floor(Math.random() * options.length)` for fair selection.
- **Modal not closing:** Ensure `setModal(null)` is called and that the UI is conditionally rendered based on `modal`.

## 8. Example (Pseudo-logic)
```js
const [modal, setModal] = useState(null);
const [rouletteSpinning, setRouletteSpinning] = useState(false);
const [rouletteResult, setRouletteResult] = useState(null);
const options = modal?.options || [];

useEffect(() => {
  if (!modal || !rouletteSpinning) return;
  let running = true;
  let timeout;
  function spin() {
    if (!running) return;
    setRouletteResult(Math.floor(Math.random() * options.length));
    timeout = setTimeout(spin, 80);
  }
  spin();
  return () => { running = false; if (timeout) clearTimeout(timeout); };
}, [rouletteSpinning, modal]);

// Keyboard handler (with refs)
// ...
```

---

**Follow this pattern for all future multioption modals to avoid bugs with state, event listeners, and modal closing.**
