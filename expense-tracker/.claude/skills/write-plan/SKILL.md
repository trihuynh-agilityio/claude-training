---
name: write-plan
description: Use when asked to write, draft or start an implementation plan for a change that already has an intent and a spec, before any code exists.
allowed-tools: Bash(ls *) Read Write Glob Grep
---

# Write a plan

A plan turns an approved spec into the files that change, the order of the work, the risks, and the tests that prove it. It is short and concrete. A reader can start building from it, and every requirement in the spec is traceable to a step and a proof.

## 1. Collect the inputs

- **Intent and spec**: the `intent.md` and `spec.md` the plan answers. Take them from the request. If the request names none, run `ls intent/` and ask which folder. If the folder has no `spec.md`, stop and offer to run `write-spec` first.
- **Project guidance**: read `CLAUDE.md` and any design spec it points to, for the stack, test tools, commands and rules the plan must follow.
- **The code**: use Glob and Grep to find the real files, routes, components and helpers the spec touches. Name only files you found, or new files marked as new. Never guess a path.

Read both documents whole before writing. If the spec's status is still `draft`, tell the user and carry on only if they say so.

## 2. Name and place the file

```
intent/yyyy-mm-dd-[intent-name]/plan.md
```

- It sits in the same folder as the intent and spec, with the same date and name.
- If `plan.md` already exists, read it and offer to update it. Never overwrite it.

## 3. File content

The layout is fixed: a title, then four headings in this order. Do not rename, reorder, add or drop a heading.

```markdown
# Plan: <name of the change> (from intent.md and spec.md)

## Files that change

## Order of work

## Risks

## Proof
```

## 4. Fill the sections

- **Files that change**: group by area (for example backend, frontend, docs). One bullet per file or tight group, as a path, `(new)` if it does not exist yet, and a few words on what changes and which requirement it serves. Include the tests and the docs the project keeps in step (`CLAUDE.md`, README). Describe a repeated pattern once. Do not list files the change does not touch.
- **Order of work**: a numbered list of steps, each ending with the requirements it delivers (`(R1, R2)`). Put dependencies first: storage before the API, the API before the screens, shared pieces before what uses them, the authority (for example the server) before its convenience copies. Where the project prefers it, write tests before the code they cover. Each step must be small enough to land green on its own. End with a step that runs the full checks, and one line saying how steps land.
- **Risks**: bullets, each saying what could go wrong and what the plan does about it. Draw from the spec's areas of concern, naming each by number and carrying its proposed way out. Add risks the code review turned up: something the spec assumes exists but does not, an existing data migration, a rule in `CLAUDE.md` that needs a decision first. Mark any step that must wait for an owner's answer.
- **Proof**: how each requirement is shown to hold, using the project's own commands. Group by layer (backend tests, frontend tests, manual or UI). Each bullet names the test file, what it covers, the requirement it proves, and the boundary values from the spec (limits, thresholds, first-and-last cases, the invalid inputs). Every requirement appears in at least one bullet. Pass any clock or environment input explicitly so tests do not depend on it.
  - **UI changes**: add a browser test. State the setup (servers, seeded data, fixed date), then a table `# | Step | Expect | Req | Capture` with one row per user-visible behaviour, including empty, error, read-only and small-screen states. Each capture has a numbered file name under a `proof/` folder beside the plan. Say how it is compared with the design spec, and that a mismatch stops the run for a decision.
  - **No UI**: leave the UI test out.

## 5. Rules

- Follow the spec. Do not add scope, and keep anything it puts out of scope out.
- Never invent a file, command, requirement number or fact. A named risk beats a confident guess.
- If the spec and the code or `CLAUDE.md` conflict, do not pick one silently. State both under Risks.
- Ask the user only when something essential is missing or ambiguous and cannot be read from the inputs or the code. Otherwise choose the obvious option and record it.
- Keep it to what a builder needs. No code, no restating the spec.

## 6. Finish

Tell the user the path of the file and which risks need a decision first, with the owner of each. Do not commit; leave that to the user's branch workflow.
