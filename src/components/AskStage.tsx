import { formatNumber, parseNumberInput } from "../game/numbers";
import type { Question } from "../game/questions";
import { BAND_KEYS, type BandKey, CONFIDENCE_BANDS } from "../game/scoring";

type Props = {
  question: Question;
  stageNumber: number;
  guessText: string;
  selectedBand: BandKey;
  isCalculatorOpen: boolean;
  onGuessTextChange: (text: string) => void;
  onBandSelect: (band: BandKey) => void;
  onFire: (guess: number) => void;
  onToggleCalculator: () => void;
};

const INVALID_GUESS_MESSAGE = "Enter a positive number, like 4200 or 4.2k.";

export function AskStage({
  question,
  stageNumber,
  guessText,
  selectedBand,
  isCalculatorOpen,
  onGuessTextChange,
  onBandSelect,
  onFire,
  onToggleCalculator,
}: Props) {
  const guess = parseNumberInput(guessText);
  const isGuessValid = guess > 0;
  const errorText =
    guessText.trim() && !isGuessValid ? INVALID_GUESS_MESSAGE : "";

  return (
    <div className="card">
      <button
        className="ghost calcbtn"
        type="button"
        aria-controls="calc"
        aria-expanded={isCalculatorOpen}
        onClick={onToggleCalculator}
      >
        ▦ Calculator
      </button>
      <div>
        <p className="label">Your answer</p>
        <div className="guess">
          <input
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={guessText}
            aria-label="Your answer"
            onChange={(event) => onGuessTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && isGuessValid) onFire(guess);
            }}
          />
          <span className="u">{question.unit}</span>
        </div>
        <p className="err">{errorText}</p>
      </div>
      <div>
        <p className="label" style={{ marginBottom: 8 }}>
          How sure are you?
        </p>
        <div className="conf" role="group" aria-label="Confidence">
          {BAND_KEYS.map((bandKey) => {
            const band = CONFIDENCE_BANDS[bandKey];
            const rangeText = isGuessValid
              ? `${formatNumber(band.lowBound(guess))} – ${formatNumber(band.highBound(guess))}`
              : "";
            return (
              <button
                key={bandKey}
                type="button"
                className="cbtn"
                aria-pressed={selectedBand === bandKey}
                onClick={() => onBandSelect(bandKey)}
              >
                <span className="t">{band.name}</span>
                <span className="p">
                  {band.rule} · {band.points} pts
                </span>
                <span className="r">{rangeText}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        className="fire"
        type="button"
        disabled={!isGuessValid}
        onClick={() => onFire(guess)}
      >
        Fire stage {stageNumber}
      </button>
    </div>
  );
}
