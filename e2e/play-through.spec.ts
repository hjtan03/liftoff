import { expect, test } from "@playwright/test";
import { FIRST_LAUNCH_DATE } from "../src/questions/schedule.ts";

// The five answers follow from the questions' own constants; see public/questions/001.json.
const EXACT_ANSWERS = ["506", "328", "2343", "4011", "448"];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${FIRST_LAUNCH_DATE}T12:00:00`));
});

test("five exact locked-in answers reach the Moon with a full share string", async ({
  page,
}) => {
  await page.goto("./");
  for (const [stage, answer] of EXACT_ANSWERS.entries()) {
    await expect(
      page.getByText(`Stage ${stage + 1}`, { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Your answer").fill(answer);
    await page.getByRole("button", { name: "Locked in" }).click();
    await page.getByRole("button", { name: `Fire stage ${stage + 1}` }).click();
    await page.getByRole("button", { name: "Reveal" }).click();
    await expect(page.getByRole("heading", { name: "Dead on." })).toBeVisible();
    await page
      .getByRole("button", {
        name: stage === 4 ? "Launch the rocket" : "Next stage",
      })
      .click();
  }
  await expect(page.locator(".dest")).toHaveText("The Moon", {
    timeout: 10_000,
  });
  await expect(page.locator(".share")).toHaveText(
    "🚀 Liftoff #001 🎯🎯🎯🎯🎯\nReached: The Moon (384,400 km)\nThrust 6,250 / 6,250",
  );
});

test("a guess outside the range misfires for no fuel", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel("Your answer").fill("1");
  await page.getByRole("button", { name: "Fire stage 1" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "Misfire." })).toBeVisible();
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
  await page.getByRole("button", { name: "Locked in" }).click();
  await page.getByRole("button", { name: "Fire stage 1" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();
  await expect(page.locator(".crowd")).toContainText(
    "25% of 40 players locked in and hit this one, and you were closer than 90% of them.",
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
  await expect(page.locator(".crowd")).not.toContainText("players");
  await expect(page.locator(".crowd")).not.toContainText("Checking");
});
