import { expect, test, type Page } from "@playwright/test";

const password = "phase06-test-password";
const uniqueEmail = (role: string) => `phase06-${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

async function createAccount(page: Page, name: string, email: string) {
  await page.goto("/en/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
}

async function signOut(page: Page) {
  await page.goto("/en/auth");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("You are not signed in.")).toBeVisible();
}

test("owner workspace supports private goals, projects, named history, explicit record loading, and viewer sharing", async ({ page }) => {
  const ownerEmail = uniqueEmail("owner");
  const viewerEmail = uniqueEmail("viewer");
  const ownerName = "Phase Six Owner";
  const viewerName = "Phase Six Viewer";
  const goalName = `Launch target ${Date.now()}`;
  const projectName = `Pricing review ${Date.now()}`;
  const calculationName = `August offer ${Date.now()}`;

  await createAccount(page, ownerName, ownerEmail);
  await page.goto("/en/workspace");
  await expect(page.getByText(ownerEmail, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Display name")).toHaveValue(ownerName);

  await page.getByLabel("Display name").fill("Workspace Owner");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();

  await page.getByLabel("Goal name").fill(goalName);
  await page.getByLabel("Optional note").fill("Private owner context");
  await page.getByRole("button", { name: "Add Goal" }).click();
  await expect(page.getByTestId("workspace-goals").getByText(goalName, { exact: true })).toBeVisible();

  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Optional private Goal").selectOption({ label: goalName });
  await page.getByLabel("Optional description").fill("Shared project context without exposing the private Goal");
  await page.getByRole("button", { name: "Create Project" }).click();
  const ownedProjects = page.getByTestId("workspace-projects-owned");
  await expect(ownedProjects.getByText(projectName, { exact: true })).toBeVisible();
  await ownedProjects.getByRole("link", { name: "Open Project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: projectName })).toBeVisible();
  const projectUrl = page.url();

  await page.getByRole("button", { name: "Create code" }).click();
  const inviteCode = (await page.getByTestId("project-invite-code").textContent())?.trim();
  expect(inviteCode).toMatch(/^[0-9a-f]{64}$/);

  await page.goto("/en/calculators/discount");
  await page.getByLabel("Starting price").fill("100.00");
  await page.getByLabel("Discount 1").fill("10");
  await page.getByRole("button", { name: "Calculate discount" }).click();
  await expect(page.getByLabel("Project")).toHaveValue(/.+/);
  await page.getByLabel("Calculation name").fill(calculationName);
  await page.getByRole("button", { name: "Save calculation" }).click();
  await expect(page.getByText("Named calculation saved to the Project.", { exact: true })).toBeVisible();

  await page.goto(projectUrl);
  const history = page.getByTestId("project-calculation-history");
  await expect(history.getByText(calculationName, { exact: true })).toBeVisible();
  await history.getByRole("link", { name: "Open in calculator" }).click();
  await expect(page).toHaveURL(/\/en\/calculators\/discount\?record=[0-9a-f-]+$/);
  await page.getByLabel("Starting price").fill("250.00");
  await expect(page.getByText(calculationName, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Starting price")).toHaveValue("250.00");
  await page.getByTestId("load-workspace-calculation").click();
  await expect(page.getByLabel("Starting price")).toHaveValue("100.00");

  await signOut(page);
  await createAccount(page, viewerName, viewerEmail);
  await page.goto("/en/workspace");
  await expect(page.getByLabel("Display name")).toHaveValue(viewerName);
  await page.getByLabel("Invite code").fill(inviteCode!);
  await page.getByRole("button", { name: "Join Project" }).click();
  const sharedProjects = page.getByTestId("workspace-projects-shared");
  await expect(sharedProjects.getByText(projectName, { exact: true })).toBeVisible();
  await sharedProjects.getByRole("link", { name: "Open Project" }).click();

  await expect(page.getByText("Your access: viewer", { exact: true })).toBeVisible();
  await expect(page.getByText(/owner's private Goal is not shared/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create code" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  await expect(page.getByTestId("project-calculation-history").getByText(calculationName, { exact: true })).toBeVisible();
  await expect(page.getByTestId("project-export")).toBeVisible();

  await page.goto("/en/calculators/discount");
  await expect(page.getByText("You do not have an editable Project yet.", { exact: false })).toBeVisible();
});

test("Phase 06 signed-out workspace remains localized and overflow-safe on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/workspace");
  await expect(page.getByRole("heading", { level: 1, name: "Found Calc workspace" })).toBeVisible();
  await expect(page.getByText("Public calculators remain account-free.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to your account" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
