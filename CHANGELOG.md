# Changelog

## 2026-04-18

### Terminal emulator: headless mode + e2e testing

Added a headless mode to `src/lib/terminal/rk86_terminal.ts` so the emulator can
be driven and inspected by automated tests without a TTY.

New CLI flags:

- `--headless` — suppress all screen rendering and stdin setup (no ANSI output,
  no raw-mode keyboard)
- `--timeout <sec>` — exit after N seconds
- `--memory <file>` — on exit, dump a byte range of emulator memory to a
  binary file
- `--memory-from <addr>` — start of the dump range (default `0x0000`)
- `--memory-to <addr>` — end of the dump range, inclusive (default `0xFFFF`)
- `--screen <file>` — on exit, save the 78×30 screen as a text file (30 lines,
  `\r\n` terminators). Bytes `\0`, `\t`, `\n`, `\r` are replaced with `.` to
  avoid misdisplay; other `<0x20` bytes render as RK-86 pseudo-graphics
- `--input <seq>` — comma-separated list of WebKit key codes (e.g.
  `KeyD,Digit0,Comma,KeyF,KeyF,Enter`) injected one at a time after the
  emulator settles (same mechanism as snapshot keyboard injection)

All exit paths (`--exit-halt`, `--exit-address`, `--timeout`, `SIGINT`) funnel
through a single `doExit()` that flushes the screen/memory files before
`process.exit`.

### Tests

Added `tests/rk86_terminal_e2e.test.ts` — 4 e2e tests that spawn the terminal
binary in `--headless` mode and assert on the resulting `--screen` / `--memory`
files:

- timeout + screen dump format (31 lines × 78 cols, contains `РАДИО-86РК`)
- memory dump byte-exact range (monitor ROM at `F800` starts with `C3`)
- monitor `D 0,FF` command produces a hex grid on screen
- monitor `M` writes HLT at `0000`, `G 0` runs, `--exit-halt` fires within 8s

Full suite: 164 tests pass.

### Documentation

- `packages/rk86/README.md` — expanded invocation examples, full options list,
  new "Безголовый режим (headless) и автотесты" section with two worked
  examples (monitor `D` dump and `M`/`G` write-HLT-and-run)
- `CLAUDE.md` — terminal emulator line mentions headless-mode flags;
  `tests/rk86_terminal_e2e.test.ts` added to the test inventory
