#!/usr/bin/env node
import process from "node:process";

import { createSkill, validateSkill } from "./index.js";

async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return 0;
  }

  if (command === "new") {
    return createCommand(args);
  }

  if (command === "validate") {
    return validateCommand(args);
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  return 2;
}

async function createCommand(args) {
  const name = args[0];
  if (!name) {
    console.error("Missing skill name.");
    return 2;
  }

  const description = readOption(args, "--description") ?? "Describe when Codex should use this skill.";
  const outputDir = readOption(args, "--output-dir") ?? ".";
  const force = args.includes("--force");

  try {
    const skillPath = await createSkill({ name, description, outputDir, force });
    console.log(`Created skill at ${skillPath}`);
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

async function validateCommand(args) {
  const target = args[0];
  if (!target) {
    console.error("Missing skill path.");
    return 2;
  }

  const strict = args.includes("--strict");
  const findings = await validateSkill(target);
  for (const finding of findings) {
    console.log(`${finding.severity}: ${finding.message}`);
  }

  const hasErrors = findings.some((finding) => finding.severity === "error");
  const hasWarnings = findings.some((finding) => finding.severity === "warning");
  if (hasErrors || (strict && hasWarnings)) {
    return 1;
  }

  if (findings.length === 0) {
    console.log("ok: skill looks good");
  }
  return 0;
}

function readOption(args, optionName) {
  const index = args.indexOf(optionName);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function printHelp() {
  console.log(`Usage: csk <command> [options]

Commands:
  new <name>            Create a new skill directory
  validate <path>       Validate a skill directory

Options:
  --description <text>  Description for generated SKILL.md
  --output-dir <path>   Directory where the skill folder should be created
  --force               Overwrite generated files when present
  --strict              Treat validation warnings as failures
`);
}

main().then((code) => {
  process.exitCode = code;
});

