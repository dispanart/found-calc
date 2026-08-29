import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 06 async workspace effects derive request loading instead of synchronously resetting React state", () => {
  const controls = read("src/components/calculator/workspace-calculation-controls.tsx");
  const detail = read("src/components/workspace/project-detail.tsx");
  const dashboard = read("src/components/workspace/workspace-dashboard.tsx");

  assert.match(controls, /projectRequestKey/);
  assert.match(controls, /recordRequestKey/);
  assert.doesNotMatch(controls, /setProjectStatus\("loading"\)/);
  assert.doesNotMatch(controls, /setRecordStatus\("loading"\)/);
  assert.doesNotMatch(controls, /if \(!userId\) \{\s*setProjects/);
  assert.doesNotMatch(controls, /if \(!recordId \|\| !userId\) \{\s*setRecord/);

  assert.match(detail, /detailRequestKey/);
  assert.match(detail, /loadedDetailKey/);
  assert.doesNotMatch(detail, /setLoading\(/);
  assert.doesNotMatch(detail, /if \(!userId\) \{\s*setDetail/);

  assert.match(dashboard, /workspaceRequestKey/);
  assert.match(dashboard, /loadedWorkspaceKey/);
  assert.doesNotMatch(dashboard, /setLoading\(/);
  assert.doesNotMatch(dashboard, /\[profile, setProfile\]/);
});
