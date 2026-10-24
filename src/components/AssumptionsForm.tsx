import { useEffect, useRef } from "react";
import { formatNumber, parseNumberInput } from "../game/numbers";
import type { FactorValues } from "../questions/factors";
import type { Question } from "../questions/schema";
import { CONFIDENCE_BANDS, type ScoredGuess } from "../game/scoring";

/** The card and the bar are apart on screen, so the bar's Reveal button submits the card's form by its id. */
const ASSUMPTIONS_FORM_ID = "assumptions";

type CardProps = {
  question: Question;
  pendingResult: ScoredGuess;
  onSubmit: (assumedFactorValues: FactorValues) => void;
};

/** The locked guess and the "what numbers did you use?" fields, under the question. Enter in a field reveals, as Reveal does. */
export function AssumptionsCard({
  question,
  pendingResult,
  onSubmit,
}: CardProps) {
  const band = CONFIDENCE_BANDS[pendingResult.band];
  const firstFieldRef = useRef<HTMLInputElement>(null);
  // Focused without scrolling, so on a short screen the card still opens at the locked guess.
  useEffect(() => {
    firstFieldRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <form
      id={ASSUMPTIONS_FORM_ID}
      className="card assume"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const assumedFactorValues: FactorValues = {};
        for (const factor of question.factors) {
          const value = parseNumberInput(String(fields.get(factor.key) ?? ""));
          if (value > 0) assumedFactorValues[factor.key] = value;
        }
        onSubmit(assumedFactorValues);
      }}
    >
      <p className="locked num">
        <span className="label">Guess locked</span>{" "}
        {formatNumber(pendingResult.guess)} {question.unit}{" "}
        <span>
          · {band.name} · {formatNumber(pendingResult.lowBound, 0)}–
          {formatNumber(pendingResult.highBound, 0)}
        </span>
      </p>
      <p className="assume-ask">
        Before the reveal: what numbers did you use? Fill in any you assumed and
        the debrief will show which one threw you off.
      </p>
      <div className="sp-body">
        {question.factors.map((factor, index) => (
          <div className="frow" key={factor.key}>
            <label htmlFor={`assumed-${factor.key}`}>{factor.label}</label>
            <div className="fin">
              <input
                id={`assumed-${factor.key}`}
                name={factor.key}
                inputMode="decimal"
                autoComplete="off"
                placeholder="skip"
                ref={index === 0 ? firstFieldRef : undefined}
              />
              <span className="u">{factor.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}

/** Skip or Reveal, docked in the ground under the assumptions card. */
export function AssumptionsBar({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="dock">
      <div className="answer-bar end">
        <button className="ghost" type="button" onClick={onSkip}>
          Skip
        </button>
        <button className="fire" type="submit" form={ASSUMPTIONS_FORM_ID}>
          Reveal
        </button>
      </div>
    </div>
  );
}
