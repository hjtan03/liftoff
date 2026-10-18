import { describe, expect, it } from "vitest";
import { formatQuestionSetId } from "./schedule";
import { QuestionSetSchema } from "./schema";

const publishedSets = import.meta.glob("/public/questions/*.json", {
  eager: true,
  import: "default",
});

describe("published question sets", () => {
  it("exist", () => {
    expect(Object.keys(publishedSets).length).toBeGreaterThan(0);
  });
  it("leave no launch without a set between 001 and the last one", () => {
    const publishedSetIds = Object.keys(publishedSets).map(
      parseSetIdFromFileName,
    );
    const setIdsOfEveryLaunchUpToTheLast = publishedSetIds.map((_, index) =>
      formatQuestionSetId(index + 1),
    );
    expect(new Set(publishedSetIds)).toEqual(
      new Set(setIdsOfEveryLaunchUpToTheLast),
    );
  });
  for (const [path, document] of Object.entries(publishedSets)) {
    it(`${path} matches the schema and carries the id its file name promises`, () => {
      const set = QuestionSetSchema.parse(document);
      expect(set.id).toBe(parseSetIdFromFileName(path));
    });
  }
});

function parseSetIdFromFileName(publishedFilePath: string): string {
  return publishedFilePath.replace(/^.*\//, "").replace(/\.json$/, "");
}
