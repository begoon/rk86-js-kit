# Project

RK-86 emulator (Intel 8080 CPU) ported to SvelteKit.

## Stack

- SvelteKit (static adapter, hash router)
- Svelte 5 (runes: `$state`, `$effect`, `$derived`, `$props`)
- Tailwind CSS 4
- Bun (runtime, package manager, test runner)
- TypeScript (strict)

## Commands

- `bun run dev` - dev server
- `bun run build` - static build to `build/`
- `just test` - unit tests + i8080 CPU tests
- `just test-ci` - full CI suite
- `bun run check` - svelte-check type checking

## Structure

- `src/lib/` - emulator core (CPU, memory, screen, keyboard, sound, runner, disassembler, CLI)
- `src/routes/` - SvelteKit pages and UI components
- `src/routes/main.ts` - machine initialization, wiring UI to emulator
- `src/routes/ui_state.svelte.ts` - reactive bridge between imperative engine and Svelte
- `static/` - static assets (assembler HTML, icons, files)
- `tests/` - bun unit tests

## Conventions

- Imports use `.js` extension in `.ts` files (SvelteKit/Vite requirement)
- `$lib` alias points to `src/lib/`
- Floating panels (visualizer, disassembler, keyboard, terminal) are non-modal, draggable Svelte components
- Assembler is an iframe (`static/i8080asm.html`) that accesses `window.parent.machine`
- `window.machine` is exposed for the assembler iframe
- UI state from engine callbacks flows through `ui_state.svelte.ts` (reactive `$state` object)
- Machine methods (`reset`, `restart`, `pause`, `loadCatalogFile`, `runLoadedFile`, `uploadFile`) are assigned in `main.ts`
- Keyboard shortcuts use `Cmd+K` then a letter key
- All text in UI is in Russian
