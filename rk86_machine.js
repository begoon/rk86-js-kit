import { I8080 } from "./i8080.js";
import { UI } from "./main.js";
import { Keyboard } from "./rk86_keyboard.js";
import { Memory } from "./rk86_memory.js";
import { Runner } from "./rk86_runner.js";
import { Screen } from "./rk86_screen.js";
import { Tape } from "./rk86_tape.js";
import { IO } from "./test_machine.js";

/**
 * @typedef {Object} Machine
 * @property {UI} ui
 * @property {I8080} cpu
 * @property {Memory} memory
 * @property {IO} io
 * @property {Keyboard} keyboard
 * @property {Runner} runner
 * @property {Screen} screen
 * @property {Tape} tape
 * @property {string} font
 */

/**
 * @typedef {Object} MachineBuilder
 * @property {UI} [ui]
 * @property {I8080} [cpu]
 * @property {Memory} [memory]
 * @property {IO} io
 * @property {Keyboard} keyboard
 * @property {Runner} [runner]
 * @property {Screen} [screen]
 * @property {Tape} [tape]
 * @property {string} font
 */

export {};
