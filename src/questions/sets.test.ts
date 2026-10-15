import { describe, expect, it } from "vitest";
import { QuestionSetSchema } from "./schema";

const publishedSets = import.meta.glob("/public/questions/*.json", {
  eager: true,
  import: "default",
});

describe("published question sets", () => {
  it("exist", () => {
    expect(Object.keys(publishedSets).length).toBeGreaterThan(0);
  });
  for (const [path, document] of Object.entries(publishedSets)) {
    it(`${path} matches the schema and carries the id its file name promises`, () => {
      const set = QuestionSetSchema.parse(document);
      expect(set.id).toBe(path.replace(/^.*\//, "").replace(/\.json$/, ""));
    });
  }
});
