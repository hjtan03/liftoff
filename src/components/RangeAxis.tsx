import { formatNumber } from "../game/numbers";
import type { ScoredGuess } from "../game/scoring";

/** Room left on each end of the log axis beyond the range and the answer. */
const AXIS_PADDING_FACTOR = 1.25;

type Props = { result: ScoredGuess; answer: number };

export function RangeAxis({ result, answer }: Props) {
  const axisMin = Math.min(result.lowBound, answer) / AXIS_PADDING_FACTOR;
  const axisMax = Math.max(result.highBound, answer) * AXIS_PADDING_FACTOR;
  const positionPercent = (value: number) => {
    const fraction =
      (Math.log10(value) - Math.log10(axisMin)) /
      (Math.log10(axisMax) - Math.log10(axisMin));
    return `${(fraction * 100).toFixed(2)}%`;
  };
  const lowPercent = positionPercent(result.lowBound);
  const highPercent = positionPercent(result.highBound);

  return (
    <div className="axis" aria-hidden="true">
      <div className="base"></div>
      <div
        className={`band ${result.hit ? "ok" : "bad"}`}
        style={{
          left: lowPercent,
          width: `calc(${highPercent} - ${lowPercent})`,
        }}
      ></div>
      <div className="gs" style={{ left: positionPercent(result.guess) }}>
        you {formatNumber(result.guess, 0)}
      </div>
      <div className="mk" style={{ left: positionPercent(answer) }}>
        <span>answer {formatNumber(answer, 0)}</span>
      </div>
    </div>
  );
}
