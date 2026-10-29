# 05 · Build conventions

These rules apply to every change made while building soundtrail.

## 1. Commits

- **Atomic:** one commit is one logical change (one feature step, one fix, one config step). Do not mix refactors with features.
- **Regular:** commit as each atomic change works, not in large batches at the end of a milestone.
- **One line:** the commit message is a single line, no body and no trailers.
- **Conventional Commits:** `<type>(<optional scope>): <summary>`, lowercase summary, no trailing period, imperative mood.
  - Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`.
  - Examples: `feat(player): add play and pause controls`, `fix(speed): clamp playback rate to 0.5-2.0`, `chore(deps): add expo-audio`.

## 2. Secrets and configuration

- No API keys, tokens, passwords, endpoints, or signing material in source.
- Values that vary by environment or are sensitive come from config or environment variables. Keep examples in `.env.example` with empty values.
- Check the staged diff for secrets before every commit.

## 3. Code

- No code comments. Names and structure must explain the code. Documentation lives in `docs/`.
- Follow the project layout in `02-technical-spec.md` section 7.
- Match the style of the surrounding code once it exists.

## 4. Dependencies

- Follow the dependency rules in `02-technical-spec.md` section 4. Each dependency addition is its own commit.
