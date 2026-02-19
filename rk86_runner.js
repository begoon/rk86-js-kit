import { Sound } from "./rk86_sound.js";

/**
 * @param {import("./rk86_machine.js").Machine} machine
 * @constructor
 */
export class Runner {
    /**
     * @param {import("./rk86_machine.js").Machine} machine
     */
    constructor(machine) {
        this.machine = machine;

        this.paused = false;

        /** @type {(function(string): void) | null} */
        this.tracer = null;

        /** @type {number[]} */
        this.last_instructions = [];

        this.previous_batch_time = 0;

        this.total_ticks = 0;

        this.last_iff_raise_ticks = 0;
        this.last_iff = 0;

        /** @type {Sound|null} */
        this.sound = null;

        this.instructions_per_millisecond = 0;
        this.ticks_per_millisecond = 0;

        this.FREQ = 1780000;
        this.TICK_PER_MS = this.FREQ / 100;

        this.machine.io.interrupt = this.interrupt;
        this.machine.cpu.jump(0xf800);
    }

    /** @param {number} iff */
    interrupt(iff) {
        if (!this.sound) return;
        if (this.last_iff == iff) return;
        if (this.last_iff == 0 && iff == 1) {
            this.last_iff_raise_ticks = this.total_ticks;
        }
        if (this.last_iff == 1 && iff == 0) {
            const tone_ticks = this.total_ticks - this.last_iff_raise_ticks;
            const tone = this.FREQ / (tone_ticks * 2);
            const duration = 1 / tone;
            this.sound?.play(tone, duration);
        }
        this.last_iff = iff;
    }

    /** @param {boolean} enabled */
    init_sound(enabled) {
        enabled && this.sound == null ? new Sound() : null;
    }

    execute() {
        clearTimeout(this.execute_timer);
        if (!this.paused) {
            let batch_ticks = 0;
            let batch_instructions = 0;
            while (batch_ticks < this.TICK_PER_MS) {
                if (this.tracer) {
                    this.tracer("before");
                    if (this.paused) break;
                }
                this.last_instructions.push(this.machine.cpu.pc);
                if (this.last_instructions.length > 5) {
                    this.last_instructions.shift();
                }
                this.machine.cpu.memory.invalidate_access_variables();
                const instruction_ticks = this.machine.cpu.instruction();
                batch_ticks += instruction_ticks;
                this.total_ticks += instruction_ticks;

                if (this.tracer) {
                    this.tracer("after");
                    if (this.paused) break;
                }
                if (this.machine.ui.visualizer_visible) {
                    this.machine.ui.visualizer.hit(this.machine.memory.read_raw(this.machine.cpu.pc));
                }
                batch_instructions += 1;
            }
            const now = performance.now();
            const elapsed = now - this.previous_batch_time;
            this.previous_batch_time = now;

            this.instructions_per_millisecond = batch_instructions / elapsed;
            this.ticks_per_millisecond = batch_ticks / elapsed;
        }
        this.execute_timer = setTimeout(() => this.execute(), 10);
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }
}
