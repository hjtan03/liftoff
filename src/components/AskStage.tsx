import { useEffect, useRef } from "react";
import { parseNumberInput } from "../game/numbers";
import { EXACT_ANSWER_BONUS_POINTS } from "../game/scoring";
import type { Question } from "../questions/schema";
import { sfx } from "../sound";

type Props = {
  question: Question;
  stageNumber: number;
  guessText: string;
  isCalculatorOpen: boolean;
  isScratchPadOpen: boolean;
  onGuessTextChange: (text: string) => void;
  onFire: (guess: number) => void;
  onToggleCalculator: () => void;
  onToggleScratchPad: () => void;
};

const INVALID_GUESS_MESSAGE = "Enter a positive number, like 4200 or 4.2k.";

/** The id of the answer field, so the calculator can hand its result over and move focus here. */
export const ANSWER_INPUT_ID = "answer";

/** The controls docked in the ground: the calculator and scratch pad, the answer, and the fire button. */
export function AskStage({
  question,
  stageNumber,
  guessText,
  isCalculatorOpen,
  isScratchPadOpen,
  onGuessTextChange,
  onFire,
  onToggleCalculator,
  onToggleScratchPad,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // With a mouse and keyboard, the answer field is ready to type in as each
  // stage comes up: type, Enter to fire, Enter to go on. A touch screen waits
  // for a tap, so its keyboard doesn't cover the question.
  useEffect(() => {
    if (matchMedia("(hover: hover) and (pointer: fine)").matches)
      inputRef.current?.focus({ preventScroll: true });
  }, [stageNumber]);
  const guess = parseNumberInput(guessText);
  const isGuessValid = guess > 0;
  const errorText =
    guessText.trim() && !isGuessValid ? INVALID_GUESS_MESSAGE : "";
  const fire = () => {
    sfx.fire();
    onFire(guess);
  };

  return (
    <div className="dock">
      {errorText && <p className="err">{errorText}</p>}
      <div className="answer-bar">
        <div className="tools">
          <button
            className="calcbtn"
            type="button"
            aria-label="Calculator"
            aria-controls="calc"
            aria-expanded={isCalculatorOpen}
            onClick={onToggleCalculator}
          >
            ▦<span className="calcbtn-word"> Calculator</span>
          </button>
          <button
            className="calcbtn"
            type="button"
            aria-label="Scratch pad"
            aria-controls="scratch-pad"
            aria-expanded={isScratchPadOpen}
            onClick={onToggleScratchPad}
          >
            ✎<span className="calcbtn-word"> Notes</span>
          </button>
        </div>
        <label className="guess">
          <input
            id={ANSWER_INPUT_ID}
            ref={inputRef}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Your answer"
            value={guessText}
            aria-label="Your answer"
            onChange={(event) => onGuessTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && isGuessValid) fire();
            }}
          />
          <span className="u">{question.unit}</span>
        </label>
        <button
          className="fire"
          type="button"
          disabled={!isGuessValid}
          onClick={fire}
        >
          Fire stage {stageNumber}
        </button>
      </div>
      <p className="ask-hint">
        The closer you land, the more fuel. Exact earns +
        {EXACT_ANSWER_BONUS_POINTS}.
      </p>
    </div>
  );
}
