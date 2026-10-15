/** Stand-ins for the crowd until a backend records real guesses: one value per stage of the fixed day. */
const SIMULATED_LOCKED_IN_HIT_PERCENT_BY_STAGE = [34, 22, 11, 8, 4];

export function simulatedCrowdLockedInHitPercent(stageIndex: number): number {
  const percent = SIMULATED_LOCKED_IN_HIT_PERCENT_BY_STAGE[stageIndex];
  if (percent === undefined) {
    throw new Error(
      `no simulated crowd value for stage ${stageIndex + 1}; add one here or ship the real crowd`,
    );
  }
  return percent;
}
