import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const TRIGGER_WORDS = ["use this skill", "when the user", "trigger", "workflow"];
const LOCAL_LINK = /\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;
const VALID_NAME = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

async function createSkill({ name, description, outputDir, force }) {
  if (!VALID_NAME.test(name)) {
    throw new Error("Skill names should be lowercase kebab-case, for example repo-doctor.");
  }

  const skillPath = path.join(outputDir, name);
  const examplesPath = path.join(skillPath, "examples");
  await mkdir(examplesPath, { recursive: true });

  const files = new Map([
    [path.join(skillPath, "SKILL.md"), skillMarkdown(name, description)],
    [path.join(skillPath, "README.md"), readmeMarkdown(name, description)],
    [path.join(examplesPath, "basic.md"), exampleMarkdown(name)],
  ]);

  for (const [filePath, content] of files.entries()) {
    if (existsSync(filePath) && !force) {
      continue;
    }
    await writeFile(filePath, content, "utf8");
  }

  return skillPath;
}

async function validateSkill(target) {
  const findings = [];
  const skillPath = path.resolve(target);

  if (!existsSync(skillPath)) {
    return [{ severity: "error", message: `${target} does not exist` }];
  }

  const targetStat = await stat(skillPath);
  if (!targetStat.isDirectory()) {
    return [{ severity: "error", message: `${target} is not a directory` }];
  }

  const skillMd = path.join(skillPath, "SKILL.md");
  if (!existsSync(skillMd)) {
    return [{ severity: "error", message: "missing SKILL.md" }];
  }

  const content = await readFile(skillMd, "utf8");
  const stripped = content.trim();
  const lowerContent = content.toLowerCase();

  if (!stripped) {
    return [{ severity: "error", message: "SKILL.md is empty" }];
  }

  if (!stripped.startsWith("# ")) {
    findings.push({ severity: "error", message: "SKILL.md should start with a top-level heading" });
  }

  const words = content.match(/\b[\w'-]+\b/g) ?? [];
  if (words.length < 40) {
    findings.push({ severity: "warning", message: "SKILL.md is very short; add workflow detail" });
  }
  if (words.length > 1200) {
    findings.push({ severity: "warning", message: "SKILL.md is long; consider moving detail to references" });
  }

  if (!TRIGGER_WORDS.some((word) => lowerContent.includes(word))) {
    findings.push({ severity: "warning", message: "SKILL.md should say when Codex should use the skill" });
  }

  if (!lowerContent.includes("## workflow") && !lowerContent.includes("## steps")) {
    findings.push({ severity: "warning", message: "SKILL.md should include a workflow or steps section" });
  }

  findings.push(...missingLocalLinks(skillPath, content));

  if (!existsSync(path.join(skillPath, "README.md"))) {
    findings.push({ severity: "warning", message: "README.md is recommended for shared skills" });
  }

  if (!existsSync(path.join(skillPath, "examples"))) {
    findings.push({ severity: "warning", message: "examples/ is recommended for reusable skills" });
  }

  return findings;
}

function missingLocalLinks(basePath, content) {
  const findings = [];
  for (const match of content.matchAll(LOCAL_LINK)) {
    let target = match[1].split("#", 1)[0].trim();
    if (!target) {
      continue;
    }
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    const targetPath = path.resolve(basePath, target);
    const relative = path.relative(basePath, targetPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      findings.push({ severity: "error", message: `local link escapes skill directory: ${match[1]}` });
      continue;
    }
    if (!existsSync(targetPath)) {
      findings.push({ severity: "error", message: `local link target is missing: ${match[1]}` });
    }
  }
  return findings;
}

function skillMarkdown(name, description) {
  const title = titleize(name);
  return `# ${title}

## Description

${description}

Use this skill when the user asks for workflows related to ${name.replaceAll("-", " ")}.

## Workflow

1. Clarify the user's goal and identify the smallest useful output.
2. Inspect the relevant files, examples, or references before changing anything.
3. Make focused edits or recommendations.
4. Verify the result with the lightest reliable check.

## Notes

- Keep output concise and actionable.
- Prefer existing project conventions over new abstractions.
`;
}

function readmeMarkdown(name, description) {
  return `# ${titleize(name)}

${description}

## Use

Place this directory in a Codex skills location, then ask Codex for work that matches the skill description.
`;
}

function exampleMarkdown(name) {
  return `# Basic Example

User request:

\`\`\`text
Use the ${name} skill to help with this repo.
\`\`\`

Expected behavior:

Codex loads the skill, follows its workflow, and verifies the result before responding.
`;
}

function titleize(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export { createSkill, validateSkill };

