import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatQuestionSetId } from "../../src/questions/schedule.js";
import type { QuestionSet } from "../../src/questions/schema.js";

/**
 * Reads a launch's published set from public/questions/, the same file the
 * game fetches. vercel.json bundles that folder with the functions.
 */
export async function loadQuestionSet(
  launch: number,
): Promise<QuestionSet | null> {
  const file = path.join(
    process.cwd(),
    "public",
    "questions",
    `${formatQuestionSetId(launch)}.json`,
  );
  try {
    return JSON.parse(await readFile(file, "utf8")) as QuestionSet;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
