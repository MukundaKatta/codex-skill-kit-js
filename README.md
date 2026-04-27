# @mukundakatta/codex-skill-kit

Small command-line tools for building Codex skills.

This npm package provides a zero-dependency `csk` CLI for scaffolding and validating Codex skill directories.

## Install

```bash
npm install -g @mukundakatta/codex-skill-kit
```

## Create a skill

```bash
csk new repo-doctor --description "Inspect repositories for agent-ready project hygiene."
```

## Validate a skill

```bash
csk validate repo-doctor
```

The validator checks for:

- a `SKILL.md` file
- a top-level Markdown heading
- a concise trigger or usage sentence
- a reasonable description length
- references to missing local files
- optional README and examples coverage

