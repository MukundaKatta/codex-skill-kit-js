import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createSkill, validateSkill } from "../src/index.js";

test("createSkill scaffolds a valid skill", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "csk-"));
  try {
    const skillPath = await createSkill({
      name: "repo-doctor",
      description: "Inspect repositories for agent-ready hygiene.",
      outputDir: tmp,
      force: false,
    });

    const findings = await validateSkill(skillPath);
    assert.deepEqual(findings, []);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("validateSkill reports a missing SKILL.md", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "csk-"));
  try {
    const findings = await validateSkill(tmp);
    assert.equal(findings[0].severity, "error");
    assert.match(findings[0].message, /missing SKILL\.md/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
