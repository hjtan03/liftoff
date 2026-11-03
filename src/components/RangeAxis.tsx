import { formatNumber } from "../game/numbers";
import type { ScoredGuess } from "../game/scoring";

/** Room left on each end of the log axis beyond the guess and the answer. */
const AXIS_PADDING_FACTOR = 1.6;

type Props = { result: ScoredGuess; answer: number };

/** The guess and the answer on a log axis, with the gap between them coloured by how close it was. */
export function RangeAxis({ result, answer }: Props) {
  const axisMin = Math.min(result.guess, answer) / AXIS_PADDING_FACTOR;
  const axisMax = Math.max(result.guess, answer) * AXIS_PADDING_FACTOR;
  const fraction = (value: number) =>
    (Math.log10(value) - Math.log10(axisMin)) /
    (Math.log10(axisMax) - Math.log10(axisMin));
  const percent = (value: number) => `${(fraction(value) * 100).toFixed(2)}%`;
  const low = Math.min(result.guess, answer);
  const high = Math.max(result.guess, answer);

  return (
    <div className="axis" aria-hidden="true">
      <div className="base"></div>
      <div
        className={`band ${result.tier}`}
        style={{
          left: percent(low),
          width: `calc(${percent(high)} - ${percent(low)})`,
        }}
      ></div>
      <div className="gs" style={{ left: percent(result.guess) }}>
        you {formatNumber(result.guess, 0)}
      </div>
      <div className="mk" style={{ left: percent(answer) }}>
        <span>answer {formatNumber(answer, 0)}</span>
      </div>
    </div>
  );
}
