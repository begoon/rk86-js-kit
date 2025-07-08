import moveable from "./moveable.js";

export class UI {
    constructor(machine) {
        this.machine = machine;

        this.canvas = document.getElementById("canvas");
        if (!this.canvas || !this.canvas.getContext) {
            alert("Tag <canvas> is not supported in the browser");
            return;
        }

        this.ruslat = document.getElementById("ruslat");
        this.ruslat_state = false;

        this.sound = document.getElementById("sound");
        this.sound_enabled = false;

        this.ips = document.getElementById("ips");
        this.tps = document.getElementById("tps");

        this.meta_press_count = 0;

        this.command_mode = false;

        this.configureEventListeners();
    }

    start_update_perf = () => setInterval(() => this.update_perf(), 2000);

    resize_canvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    fullscreen() {
        this.canvas.requestFullscreen();
    }

    reset() {
        this.machine.keyboard.reset();
        this.machine.cpu.jump(0xf800);
        console.log("Reset");
    }

    restart() {
        this.machine.memory.zero_ram();
        this.reset();
    }

    update_ruslat = (value) => {
        if (value === this.ruslat_state) return;
        this.ruslat_state = value;
        this.ruslat.textContent = value ? "РУС" : "ЛАТ";
    };

    update_perf() {
        const update = (element, value) => {
            element.innerHTML = Math.floor(value * 1000).toLocaleString();
        };
        update(this.ips, this.machine.runner.instructions_per_millisecond);
        update(this.tps, this.machine.runner.ticks_per_millisecond);
    }

    update_video_memory_base(base) {
        document.getElementById("video-base").textContent = base.toString(16).toUpperCase();
    }

    update_screen_geometry(width, height) {
        document.getElementById("video-width").textContent = width.toString();
        document.getElementById("video-height").textContent = height.toString();
    }

    toggle_assembler() {
        this.assembler_visible = !this.assembler_visible;

        this.toggle_icon("assembler_toggle", this.assembler_visible);

        this.assembler_panel.style.display = this.assembler_visible ? "block" : "none";
        this.canvas.style.display = this.assembler_visible ? "none" : "block";

        if (this.assembler_visible) this.assembler_panel.focus();
        else this.canvas.focus();
    }

    toggle_icon(element, active) {
        document.getElementById(element).classList.toggle("active", active);
    }

    toggle_disassembler() {
        this.disassembler_visible = !this.disassembler_visible;
        if (this.terminal_visible && this.disassembler_visible) this.toggle_terminal();

        this.disassembler_panel.style.display = this.disassembler_visible ? "block" : "none";

        this.toggle_icon("disassembler_toggle", this.disassembler_visible);

        this.machine.ui.i8080disasm.refresh();
        this.machine.ui.i8080disasm.go_code(this.machine.cpu.pc);
    }

    toggle_terminal() {
        this.terminal_visible = !this.terminal_visible;
        if (this.terminal_visible && this.disassembler_visible) this.toggle_disassembler();

        this.terminal_panel.style.display = this.terminal_visible ? "block" : "none";

        this.toggle_icon("terminal_toggle", this.terminal_visible);

        if (this.terminal_visible) this.terminal.focus();
    }

    toggle_visualizer() {
        this.visualizer_visible = !this.visualizer_visible;
        if (this.terminal_visible && this.disassembler_visible) this.toggle_disassembler();

        this.visualizer_panel.style.display = this.visualizer_visible ? "block" : "none";

        this.toggle_icon("visualizer_toggle", this.visualizer_visible);
    }

    configureEventListeners() {
        const machine = this.machine;

        document.getElementById("ruslat-toggle").addEventListener("click", () => {
            const ruslat_flag = 0x7606;
            const state = this.machine.memory.read(ruslat_flag) ? 0x00 : 0xff;
            this.machine.memory.write(ruslat_flag, state);
            this.update_ruslat(state);
        });

        this.sound.addEventListener("click", () => {
            this.sound_enabled = !this.sound_enabled;
            this.machine.runner.init_sound(this.sound_enabled);
            console.log("sound " + (this.sound_enabled ? "enabled" : "disabled"));

            const toggle = document.getElementById("sound-icon-toggle");
            toggle.src = this.sound_enabled ? toggle.dataset.on : toggle.dataset.muted;

            const icon = document.getElementById("sound-icon");
            icon.textContent = icon.dataset[this.sound_enabled ? "on" : "off"];
            icon.classList.add("visible");
            setTimeout(() => icon.classList.remove("visible"), 2000);
        });

        document.getElementById("catalog").addEventListener("click", () => {
            document.getElementById("selected_file").style.display = "none";
            document.getElementById("file_selector").style.display = "block";
            document.getElementById("file_selector").focus();
        });

        document.getElementById("assembler_toggle").addEventListener("click", () => this.toggle_assembler());
        this.assembler_panel = document.getElementById("assembler_panel");
        this.assembler_visible = false;

        document.getElementById("disassembler_toggle").addEventListener("click", () => this.toggle_disassembler());

        this.disassembler_panel = document.getElementById("disassembler_panel");
        this.disassembler_icon = document.getElementById("disassembler_icon");
        this.disassembler_visible = false;

        moveable(this.disassembler_panel)();

        // visualizer

        this.visualizer_panel = document.getElementById("visualizer_panel");
        this.visualizer_visible = false;

        moveable(this.visualizer_panel)();

        document.getElementById("visualizer_toggle").addEventListener("click", () => this.toggle_visualizer());
        document.getElementById("terminal_toggle").addEventListener("click", () => this.toggle_terminal());

        this.terminal_panel = document.getElementById("terminal_panel");
        this.terminal_icon = document.getElementById("terminal_icon");
        this.terminal_visible = false;

        moveable(this.terminal_panel)();
        document.onkeydown = (event) => {
            if (this.command_mode) {
                switch (event.code) {
                    case "KeyL":
                        document.getElementById("selected_file").style.display = "none";
                        document.getElementById("file_selector").style.display = "block";
                        document.getElementById("file_selector").focus();
                        event.preventDefault();
                        break;
                    case "KeyU":
                        document.querySelector("#upload_selector").click();
                        event.preventDefault();
                        break;
                    case "KeyP":
                        pause.click();
                        break;
                    case "KeyG":
                        this.machine.cpu.jump(window.selected_file_entry);
                        console.log("запуск с адреса " + window.selected_file_entry.toString(16));
                        this.machine.runner.execute();
                        event.preventDefault();
                        break;
                    case "KeyK":
                        this.toggle_terminal();
                        event.preventDefault();
                        break;
                    case "KeyA":
                        this.toggle_assembler();
                        break;
                    case "KeyD":
                        this.toggle_disassembler();
                        this.disassembler_panel.focus();
                        break;
                    case "KeyV":
                        this.toggle_visualizer();
                        break;
                    case "KeyS":
                        this.sound.click();
                        break;
                    case "KeyR":
                        this.restart();
                        break;
                    case "KeyF":
                        this.fullscreen();
                        break;
                }
                this.command_mode = false;
                document.getElementById("shortcuts").classList.remove("visible");
                return;
            }

            if (this.meta_press_count > 0) {
                if (event.code === "KeyK") {
                    this.command_mode = true;
                    document.getElementById("shortcuts").classList.add("visible");
                }
                return;
            }

            if (event.key === "Meta") {
                this.meta_press_count += 1;
                return;
            }

            this.machine.keyboard.onkeydown(event.code);
            return false;
        };

        document.onkeyup = (event) => {
            if (event.key === "Meta") {
                if (this.meta_press_count > 0) this.meta_press_count -= 1;
                return;
            }
            if (this.meta_press_count > 0) return;

            this.machine.keyboard.onkeyup(event.code);
            return false;
        };

        this.disassembler_panel.addEventListener("keyup", (event) => {
            if (event.key === "Escape") {
                this.disassembler_panel.blur();
                this.toggle_disassembler();
            }
            if (event.key === "Enter") {
                this.machine.ui.i8080disasm.form_go_code();
            }
            event.stopPropagation();
        });

        this.disassembler_panel.addEventListener("keydown", (event) => {
            event.stopPropagation();
        });

        document.getElementById("fullscreen").addEventListener("click", () => {
            this.machine.ui.canvas.requestFullscreen();
        });

        const pause = document.getElementById("pause");
        pause.addEventListener("click", () => {
            machine.runner.paused = !machine.runner.paused;
            const icon = document.getElementById("pause-icon");
            icon.src = machine.runner.paused ? icon.dataset.on : icon.dataset.off;
            this.machine.ui.i8080disasm.go_code(machine.cpu.pc);
        });

        // disassembler

        document.getElementById("disasm_form_code_shift_back_page").addEventListener("click", () => {
            this.machine.ui.i8080disasm.form_code_shift(false, -1);
        });
        document.getElementById("disasm_form_code_shift_back_one").addEventListener("click", () => {
            this.machine.ui.i8080disasm.form_code_shift(true, -1);
        });
        document.getElementById("disasm_form_go_code").addEventListener("click", () => {
            this.machine.ui.i8080disasm.form_go_code();
        });
        document.getElementById("disasm_form_code_shift_forward_one").addEventListener("click", () => {
            this.machine.ui.i8080disasm.form_code_shift(true, 1);
        });
        document.getElementById("disasm_form_code_shift_forward_page").addEventListener("click", () => {
            this.machine.ui.i8080disasm.form_code_shift(false, 1);
        });

        document.getElementById("disasm_form_data_shift_back_one").addEventListener("click", () => {
            this.machine.ui.i8080disasm.go_data_shift(-1, { one: true });
        });
        document.getElementById("disasm_form_data_shift_back_page").addEventListener("click", () => {
            this.machine.ui.i8080disasm.go_data_shift(-1);
        });
        document.getElementById("disasm_form_go_data").addEventListener("click", () => {
            this.machine.ui.i8080disasm.form_go_data();
        });
        document.getElementById("disasm_form_data_shift_forward_page").addEventListener("click", () => {
            this.machine.ui.i8080disasm.go_data_shift(1);
        });
        document.getElementById("disasm_form_data_shift_forward_one").addEventListener("click", () => {
            this.machine.ui.i8080disasm.go_data_shift(1, { one: true });
        });

        document
            .getElementById("upload")
            .addEventListener("click", () => document.querySelector("#upload_selector").click());

        const hint = document.getElementById("hint");
        document.querySelectorAll("button.icon").forEach((button) => {
            button.addEventListener("mouseover", () => {
                hint.style.opacity = 1;
                hint.textContent = button.dataset.text;
            });
            button.addEventListener("mouseout", () => {
                hint.style.opacity = 0;
                hint.textContent = "";
            });
        });
    }

    update_activity_indicator = (active) => {
        document.getElementById("tape_activity_indicator").style.visibility = active ? "visible" : "hidden";
    };

    update_written_bytes = (count) => {
        document.getElementById("tape_written_bytes").textContent = count.toString().padStart(4, "0");
        if (count === 1) this.hightlight_written_bytes(true);
        else if (count === 0) this.hightlight_written_bytes(false);
    };

    hightlight_written_bytes = (on) => {
        document.getElementById("tape_written_bytes").classList.toggle("tape_active", on);
        document.getElementById("tape_activity_indicator").src = on ? "i/tape-data.svg" : "i/tape-preamble.svg";
    };
}
