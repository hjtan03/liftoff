import { useState } from "react";
import { formatNumber, parseNumberInput } from "../game/numbers";
import type { FactorValues } from "../questions/factors";
import type { Question } from "../questions/schema";
import { CONFIDENCE_BANDS, type ScoredGuess } from "../game/scoring";

type Props = {
  question: Question;
  pendingResult: ScoredGuess;
  onSubmit: (assumedFactorValues: FactorValues) => void;
};

export function AssumptionsForm({ question, pendingResult, onSubmit }: Props) {
  const [assumedText, setAssumedText] = useState<Record<string, string>>({});
  const band = CONFIDENCE_BANDS[pendingResult.band];

  const submitAssumed = () => {
    const assumedFactorValues: FactorValues = {};
    for (const factor of question.factors) {
      const value = parseNumberInput(assumedText[factor.key] ?? "");
      if (value > 0) assumedFactorValues[factor.key] = value;
    }
    onSubmit(assumedFactorValues);
  };

  return (
    <div className="card">
      <div>
        <p className="label">Guess locked</p>
        <div className="locked num">
          {formatNumber(pendingResult.guess)} {question.unit}{" "}
          <span>
            · {band.name} · {formatNumber(pendingResult.lowBound, 0)}–
            {formatNumber(pendingResult.highBound, 0)}
          </span>
        </div>
      </div>
      <p style={{ margin: 0 }}>
        Before the reveal: what numbers did you use? Fill in any you assumed and
        the debrief will show which one threw you off.
      </p>
      <div className="sp-body" style={{ margin: 0 }}>
        {question.factors.map((factor, index) => (
          <div className="frow" key={factor.key}>
            <label htmlFor={`assumed-${factor.key}`}>{factor.label}</label>
            <div className="fin">
              <input
                id={`assumed-${factor.key}`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="skip"
                autoFocus={index === 0}
                value={assumedText[factor.key] ?? ""}
                onChange={(event) =>
                  setAssumedText({
                    ...assumedText,
                    [factor.key]: event.target.value,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitAssumed();
                }}
              />
              <span className="u">{factor.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="row">
        <button className="fire" type="button" onClick={submitAssumed}>
          Reveal
        </button>
        <button className="ghost" type="button" onClick={() => onSubmit({})}>
          Skip
        </button>
      </div>
    </div>
  );
}
