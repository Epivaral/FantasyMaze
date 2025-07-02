# Multioption Modal Roulette Implementation Guide

This document describes, step by step, how to implement a modal window with a multioption roulette (e.g., for mob battles or HP vials) in React, in a way that avoids bugs with state, event listeners, and modal closing.

## Full Modal Roulette Flow (from cell entry to exit)

1. **Player enters a mob or item cell**
    - Set the `modal` state to the appropriate object (e.g., `{ type: 'bones', row, col, options: [10, 20] }` for a mob, or `{ type: 'hp', row, col }` for an HP vial).
    - Set `rouletteResult` to `null` and `rouletteSpinning` to `true`.
    - This triggers the modal to open and the roulette animation to start automatically.

2. **Roulette Animation**
    - While `rouletteSpinning` is `true`, a `useEffect` runs the roulette animation:
        - For mob/option modals: On each tick, randomly select an index from the options array and set `rouletteResult` to that index.
        - For HP vial modals: On each tick, randomly select a value (with correct weighting) and set `rouletteResult` to that value.
    - The modal UI displays all options, highlighting the current selection.
    - Instructions show: "Press SPACE to stop the roulette!"

3. **Player presses SPACE (first time)**
    - If `rouletteSpinning` is `true`, set `rouletteSpinning` to `false` to stop the animation.
    - The modal now shows the selected result and instructions: "Press SPACE to continue."

4. **Player presses SPACE (second time)**
    - If `rouletteSpinning` is `false` and a result is selected:
        - For mob/option modals: Use `options[rouletteResult]` to get the effect value (e.g., HP loss).
        - For HP vial modals: Use `rouletteResult` directly as the HP value (e.g., HP gain).
        - Apply the effect (update health, remove mob/item from maze, etc.).
        - Set `modal` to `null` to close the modal.
        - Reset `rouletteResult` and `rouletteSpinning` (e.g., in a `setTimeout` after closing the modal).

5. **Game resumes**
    - Player can move again. All modal/roulette state is reset and ready for the next encounter.

## 1. State Structure
- `modal`: Holds modal info, e.g. `{ type: 'mob', row, col, options: [...] }` or `{ type: 'hp', row, col }` or `null`.
- `rouletteSpinning`: Boolean, true while the roulette is spinning.
- `rouletteResult`: For mob/option modals, this is the index of the selected option. For HP vial or value-based modals, this is the value itself (e.g., 0, 10, 20). Always check the modal type before using `rouletteResult`.

## 2. Option Representation
- Store all possible outcomes in an array, e.g.:
  ```js
  // For mobs:
  const mobOptions = [10, 20]; // HP loss values
  // For HP vials:
  const hpOptions = [0, 10, 20]; // HP gain values
  ```
- Pass this array to the modal via the `modal` state as `options` for mobs, or use a fixed array for HP vials.

## 3. Roulette Animation Logic
- Use a `useEffect` that runs when `rouletteSpinning` is true and the modal is open.
- For mob/option modals: On each tick, randomly select an index from the options array:
  ```js
  setRouletteResult(Math.floor(Math.random() * options.length));
  ```
- For HP vial modals: On each tick, randomly select a value with correct weighting:
  ```js
  // Weighted: 0 HP (25%), 10 HP (50%), 20 HP (25%)
  const rand = Math.random();
  let result;
  if (rand < 0.25) result = 0;
  else if (rand < 0.75) result = 1;
  else result = 2;
  setRouletteResult([0, 10, 20][result]);
  ```
- Use a constant interval (e.g., 80ms) for smooth animation.
- Stop spinning on spacebar press.

## 4. Keyboard Handling (Stable Listener)
- Use a single, stable event listener (attached once in a `useEffect` with an empty dependency array).
- Use refs to always access the latest state inside the handler.
- On spacebar:
  - If spinning, stop the spin.
  - If not spinning and a result is selected:
    - For mob/option modals: Use `options[rouletteResult]` to get the effect value.
    - For HP vial modals: Use `rouletteResult` directly as the HP value.
    - Apply the effect, close the modal (`setModal(null)`), and reset roulette state (`setRouletteResult(null)`, `setRouletteSpinning(false)`).

## 5. Modal UI
- Render all options in a row or column.
- Highlight the currently selected option (by index for mobs, by value for HP vials).
- Show instructions: "Press SPACE to stop the roulette!" and then "Press SPACE to continue."

## 6. Closing the Modal
- Always set `modal` to `null` to close.
- Reset `rouletteResult` and `rouletteSpinning` after closing (e.g., in a `setTimeout` after closing the modal).

## 7. Common Pitfalls to Avoid
- **Stale closure bugs:** Always use refs for state accessed in event listeners.
- **Multiple event listeners:** Only attach the keydown listener once.
- **Roulette always picking the same option:** Use `Math.floor(Math.random() * options.length)` for fair selection (or correct weighting for HP vials).
- **Modal not closing:** Ensure `setModal(null)` is called and that the UI is conditionally rendered based on `modal`.
- **HP vial bug:** For HP vials, do not use `options[rouletteResult]`—use `rouletteResult` directly as the HP value.

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
    if (!running || !modal) return;
    if (modal.type === 'hp') {
      // Weighted: 0 HP (25%), 10 HP (50%), 20 HP (25%)
      const rand = Math.random();
      let result;
      if (rand < 0.25) result = 0;
      else if (rand < 0.75) result = 1;
      else result = 2;
      setRouletteResult([0, 10, 20][result]);
    } else {
      setRouletteResult(Math.floor(Math.random() * options.length));
    }
    timeout = setTimeout(spin, 80);
  }
  spin();
  return () => { running = false; if (timeout) clearTimeout(timeout); };
}, [rouletteSpinning, modal]);

// Keyboard handler (with refs)
// On spacebar:
//   if (modal.type === 'hp') {
//     const effect = rouletteResult; // HP value
//   } else {
//     const effect = options[rouletteResult]; // Mob/option index
//   }
//   // Apply effect, close modal, reset state
```

---

**Strictly follow this pattern for all future multioption modals to avoid bugs with state, event listeners, and modal closing.**
