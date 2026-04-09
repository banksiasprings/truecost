# CLAUDE.md — TrueCost Pro

Behavioural guidelines for all coding work on this project.
Adapted from Andrej Karpathy's LLM coding observations and the Superpowers methodology.

## Project context
Single-file PWA (`index.html`). Vehicle cost calculator with 342 presets.
GitHub repo: `banksiasprings/truecost` (renamed from truecost-pro Apr 2026).
Live: https://banksiasprings.github.io/truecost/
SW cache: `truecost-pro-vN` — bump on every deploy alongside CSS/JS `?v=N` query param.

## Coding behaviour

### Think before coding
- State assumptions explicitly. If uncertain, ask first.
- If multiple approaches exist, present them — don't pick silently.
- Push back when a simpler solution exists.

### Simplicity first
- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.

### Surgical changes
- Touch only what the request requires. Don't "improve" adjacent code.
- Match existing style even if you'd do it differently.
- Every changed line must trace directly to the user's request.

### Verify before handoff
- Always test logic by reading through it before calling it done.
- Never hand off broken or unverified work.
- Include app + SW version in every completion message.

## Git workflow
- All git via osascript
- Commit and push after every change — never leave work uncommitted
- Clear lock files first: `rm -f .git/index.lock .git/HEAD.lock`
- Working dir: `~/Documents/truecost-pro`
- Remote: `https://github.com/banksiasprings/truecost.git`
