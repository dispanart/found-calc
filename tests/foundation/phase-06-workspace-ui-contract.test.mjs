import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("workspace dashboard separates profile goals projects invites and Phase 04 latest drafts", () => {
  const path = "apps/web/src/components/workspace/workspace-dashboard.tsx";
  assert.equal(existsSync(url(path)), true, `${path} must exist`);
  const source = read(path);
  for (const marker of ["workspace-profile", "workspace-goals", "workspace-projects-owned", "workspace-projects-shared", "workspace-invite-redeem"]) {
    assert.match(source, new RegExp(`data-testid=["']${marker}["']`));
  }
  assert.match(source, /<PersistenceSummary\b/);
  assert.match(source, /public calculators|kalkulator publik/i);
});

test("project detail exposes collaboration privacy, history, export and owner-only member management", () => {
  const path = "apps/web/src/components/workspace/project-detail.tsx";
  assert.equal(existsSync(url(path)), true, `${path} must exist`);
  const source = read(path);
  assert.match(source, /data-testid=["']project-members["']/);
  assert.match(source, /data-testid=["']project-calculation-history["']/);
  assert.match(source, /data-testid=["']project-export["']/);
  assert.match(source, /members can view|anggota Project dapat melihat/i);
  assert.match(source, /record=/);
});

test("workspace pages retain locale validation and project detail uses Next.js 16 async params", () => {
  const dashboard = read("apps/web/src/app/[locale]/(workspace)/workspace/page.tsx");
  assert.match(dashboard, /Phase 06/);
  assert.match(dashboard, /<WorkspaceDashboard/);
  const detailPath = "apps/web/src/app/[locale]/(workspace)/workspace/projects/[projectId]/page.tsx";
  assert.equal(existsSync(url(detailPath)), true, `${detailPath} must exist`);
  const detail = read(detailPath);
  assert.match(detail, /params:\s*Promise</);
  assert.match(detail, /await params/);
  assert.match(detail, /<ProjectDetail/);
});
