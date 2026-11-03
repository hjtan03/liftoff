import { useEffect, useEffectEvent, useRef, useState } from "react";
import { sfx } from "../sound";
import {
  calculatorDisplayText,
  calculatorHistoryText,
  calculatorValue,
  INITIAL_CALCULATOR_STATE,
  pressCalculatorKey,
} from "./keypad";

type KeypadKey = { key: string; kind?: "fn" | "op" | "eq"; ariaLabel?: string };

const KEYPAD_ROWS: readonly (readonly KeypadKey[])[] = [
  [
    { key: "C", kind: "fn" },
    { key: "(", kind: "fn" },
    { key: ")", kind: "fn" },
    { key: "÷", kind: "op" },
  ],
  [{ key: "7" }, { key: "8" }, { key: "9" }, { key: "×", kind: "op" }],
  [{ key: "4" }, { key: "5" }, { key: "6" }, { key: "−", kind: "op" }],
  [{ key: "1" }, { key: "2" }, { key: "3" }, { key: "+", kind: "op" }],
  [
    { key: "⌫", kind: "fn", ariaLabel: "Backspace" },
    { key: "0" },
    { key: "." },
    { key: "=", kind: "eq" },
  ],
];

const CLOSE_KEY = "esc";

/** Physical keys that stand in for keypad keys while the calculator is open. */
const KEYBOARD_TO_KEYPAD: Record<string, string> = {
  "*": "×",
  x: "×",
  "/": "÷",
  "-": "−",
  "+": "+",
  Enter: "=",
  "=": "=",
  Backspace: "⌫",
  Escape: CLOSE_KEY,
  c: "C",
  C: "C",
  "(": "(",
  ")": ")",
  ".": ".",
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Whether there is an answer field to hand a result to: only while a stage is being asked. */
  canUseResult: boolean;
  /** Puts the calculator's value in the answer field, as plain digits. */
  onUseResult: (text: string) => void;
};

export function Calculator({
  isOpen,
  onClose,
  canUseResult,
  onUseResult,
}: Props) {
  const [state, setState] = useState(INITIAL_CALCULATOR_STATE);
  const panelRef = useRef<HTMLDivElement>(null);
  const equalsRef = useRef<HTMLButtonElement>(null);
  const value = calculatorValue(state);
  const press = (key: string) =>
    setState((current) => pressCalculatorKey(current, key));

  const close = useEffectEvent(() => onClose());

  // Focus moves to the keypad once, when it opens. Re-running this on every
  // render pulled focus back out of the answer field after each keystroke.
  useEffect(() => {
    if (isOpen) equalsRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Keys reach the calculator only while focus is on it: click the answer
      // field or the scratch pad and typing goes there, calculator open or not.
      const target = event.target as Node | null;
      if (!target || !panelRef.current?.contains(target)) return;
      const key = /^[0-9]$/.test(event.key)
        ? event.key
        : KEYBOARD_TO_KEYPAD[event.key];
      if (!key) return;
      event.preventDefault();
      if (key === CLOSE_KEY) close();
      else press(key);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const historyText = calculatorHistoryText(state);

  return (
    <div
      className="calc"
      id="calc"
      ref={panelRef}
      role="dialog"
      aria-label="Calculator"
      hidden={!isOpen}
    >
      <div className="calc-top">
        <span className="label" style={{ margin: 0 }}>
          Calculator
        </span>
        <button
          className="calc-x"
          type="button"
          aria-label="Close calculator"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="calc-disp">
        <div className="calc-hist num">{historyText || " "}</div>
        <div className="calc-main num" aria-live="polite">
          {calculatorDisplayText(state)}
        </div>
      </div>
      <div className="keys">
        {KEYPAD_ROWS.flat().map(({ key, kind, ariaLabel }) => (
          <button
            key={key}
            type="button"
            className={`k${kind ? ` ${kind}` : ""}`}
            aria-label={ariaLabel}
            ref={key === "=" ? equalsRef : undefined}
            onClick={() => {
              sfx.tick();
              press(key);
            }}
          >
            {key}
          </button>
        ))}
      </div>
      {canUseResult && (
        <button
          type="button"
          className="calc-use"
          disabled={value === null}
          onClick={() => {
            if (value === null) return;
            sfx.tick();
            onUseResult(String(value));
          }}
        >
          Use as answer
        </button>
      )}
    </div>
  );
}
