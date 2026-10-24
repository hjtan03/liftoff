import { expect, test } from "@playwright/test";
import { FIRST_LAUNCH_DATE } from "../src/questions/schedule.ts";

// The five answers follow from the questions' own constants; see public/questions/001.json.
const EXACT_ANSWERS = ["506", "328", "2343", "4011", "448"];
// A stage's result comes up once its burn has played, up to a few seconds for liftoff.
const AFTER_THE_BURN = { timeout: 10_000 };

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${FIRST_LAUNCH_DATE}T12:00:00`));
});

test("five docked Moonshot answers reach Neptune with a full share string", async ({
  page,
}) => {
  // Each stage burns for a few seconds before its result, and the camera pulls back at the end: about 25 s in all.
  test.setTimeout(60_000);
  await page.goto("./");
  for (const [stage, answer] of EXACT_ANSWERS.entries()) {
    await expect(
      page.getByText(`Stage ${stage + 1}`, { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Your answer").fill(answer);
    await page.getByRole("button", { name: "Moonshot" }).click();
    await page.getByRole("button", { name: `Fire stage ${stage + 1}` }).click();
    await page.getByRole("button", { name: "Reveal" }).click();
    await expect(page.getByRole("heading", { name: "Docked." })).toBeVisible(
      AFTER_THE_BURN,
    );
    await page
      .getByRole("button", {
        name: stage === 4 ? "Flight report" : "Next stage",
      })
      .click();
  }
  await expect(page.locator(".dest")).toHaveText("Reached Neptune");
  await expect(page.locator(".share")).toHaveText(
    "🚀 Liftoff #001 🎯🎯🎯🎯🎯\nReached Neptune · 6,250 / 6,250 fuel",
  );
});

test("a guess outside the range is scrubbed for no fuel", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel("Your answer").fill("1");
  await page.getByRole("button", { name: "Fire stage 1" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "Scrubbed." })).toBeVisible(
    AFTER_THE_BURN,
  );
  await expect(page.locator(".stats")).toContainText("+0");
});

test("the fire button waits for a positive number", async ({ page }) => {
  await page.goto("./");
  const fire = page.getByRole("button", { name: "Fire stage 1" });
  await expect(fire).toBeDisabled();
  await page.getByLabel("Your answer").fill("abc");
  await expect(
    page.getByText("Enter a positive number, like 4200 or 4.2k."),
  ).toBeVisible();
  await expect(fire).toBeDisabled();
  await page.getByLabel("Your answer").fill("4.2k");
  await expect(fire).toBeEnabled();
});

test("a question set the server cannot return shows the error instead of a game", async ({
  page,
}) => {
  await page.route("**/questions/001.json", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto("./");
  await expect(page.locator(".err")).toContainText("HTTP 503");
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
});

test("a revealed stage is recorded and shows the crowd the server returns", async ({
  page,
}) => {
  const recorded: unknown[] = [];
  await page.route("**/api/guess", async (route) => {
    recorded.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        hit: true,
        exact: true,
        points: 1250,
        crowd: {
          players: 40,
          hitRate: { lock: 0.5, solid: 0.8, rough: 1 },
          lockHitShare: 0.25,
          percentile: 0.9,
        },
      },
    });
  });
  await page.goto("./");
  await page.getByLabel("Your answer").fill(EXACT_ANSWERS[0]);
  await page.getByRole("button", { name: "Moonshot" }).click();
  await page.getByRole("button", { name: "Fire stage 1" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();
  await expect(page.locator(".crowd")).toContainText(
    "25% of 40 players went Moonshot and hit this one, and you were closer than 90% of them.",
    AFTER_THE_BURN,
  );
  expect(recorded).toEqual([{ launch: 1, stage: 1, guess: 506, band: "lock" }]);
});

test("without the server the reveal still plays, with no crowd line", async ({
  page,
}) => {
  await page.route("**/api/guess", (route) => route.fulfill({ status: 500 }));
  await page.goto("./");
  await page.getByLabel("Your answer").fill(EXACT_ANSWERS[0]);
  await page.getByRole("button", { name: "Fire stage 1" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "Docked." })).toBeVisible(
    AFTER_THE_BURN,
  );
  await expect(page.locator(".crowd")).not.toContainText("players");
  await expect(page.locator(".crowd")).not.toContainText("Checking");
});

test("a refresh resumes the run where it left off", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel("Your answer").fill(EXACT_ANSWERS[0]);
  await page.getByRole("button", { name: "Moonshot" }).click();
  await page.getByRole("button", { name: "Fire stage 1" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();
  await page.getByRole("button", { name: "Next stage" }).click();
  await page.getByLabel("Your answer").fill("42");

  await page.reload();
  await expect(page.getByText("Stage 2", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Your answer")).toHaveValue("42");
});

test("before the first launch the site counts down", async ({ page }) => {
  const dayBefore = new Date(`${FIRST_LAUNCH_DATE}T12:00:00`);
  dayBefore.setDate(dayBefore.getDate() - 1);
  await page.clock.setFixedTime(dayBefore);
  await page.goto("./");
  await expect(page.getByText("T−1 day")).toBeVisible();
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
});

test.describe("the archive", () => {
  // Noon Eastern on launch 3's day: launches 1 and 2 are in the archive.
  test.beforeEach(async ({ page }) => {
    const launch3 = new Date(`${FIRST_LAUNCH_DATE}T12:00:00`);
    launch3.setDate(launch3.getDate() + 2);
    await page.clock.setFixedTime(launch3);
  });

  test("lists past launches and replays one apart from today's run", async ({
    page,
  }) => {
    const recorded: unknown[] = [];
    await page.route("**/api/guess", async (route) => {
      recorded.push(route.request().postDataJSON());
      await route.fulfill({ status: 500 });
    });
    await page.goto("./");
    await page.getByLabel("Your answer").fill("42");

    await page.getByRole("link", { name: "Archive" }).click();
    await expect(page.locator(".archive-id")).toHaveText(["#002", "#001"]);
    await page.getByRole("link", { name: /#001/ }).click();
    await expect(page.locator(".meta")).toContainText("Replay #001");
    await page.getByLabel("Your answer").fill(EXACT_ANSWERS[0]);
    await page.getByRole("button", { name: "Fire stage 1" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByRole("heading", { name: "Docked." })).toBeVisible(
      AFTER_THE_BURN,
    );
    // A replay never records its guesses with the server.
    expect(recorded).toEqual([]);

    // Today's run is still where it was left.
    await page.getByRole("link", { name: "Today" }).click();
    await expect(page.getByLabel("Your answer")).toHaveValue("42");
    await page.getByRole("link", { name: "Archive" }).click();
    await expect(page.locator(".archive-row").last()).toContainText(
      "In progress",
    );
  });

  test("keeps future launches shut", async ({ page }) => {
    await page.goto("./?launch=9");
    await expect(page.getByText("Still on the pad.")).toBeVisible();
    await expect(page.getByLabel("Your answer")).toHaveCount(0);
  });
});
