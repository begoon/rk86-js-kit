import type { I8080 } from "./i8080.ts";
import type { UI } from "./main.ts";
import type { Keyboard } from "./rk86_keyboard.ts";
import type { Memory } from "./rk86_memory.ts";
import type { Runner } from "./rk86_runner.ts";
import type { Screen } from "./rk86_screen.ts";
import type { Tape } from "./rk86_tape.ts";
import type { IO } from "./test_machine.ts";

export interface Machine {
    ui: UI;
    cpu: I8080;
    memory: Memory;
    io: IO;
    keyboard: Keyboard;
    runner: Runner;
    screen: Screen;
    tape: Tape;
    font: string;
}

export interface MachineBuilder {
    ui?: UI;
    cpu?: I8080;
    memory?: Memory;
    io: IO;
    keyboard: Keyboard;
    runner?: Runner;
    screen?: Screen;
    tape?: Tape;
    font: string;
}
