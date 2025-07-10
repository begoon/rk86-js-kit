import { I8080 } from "./i8080.js";
import Visualizer from "./i8080_visualizer.js";
import I8080DisasmPanel from "./i8080disasm_panel.js";
import { Console } from "./rk86_console.js";
import FileParser from "./rk86_file_parser.js";
import { rk86_font_image } from "./rk86_font.js";
import { Keyboard } from "./rk86_keyboard.js";
import { Memory } from "./rk86_memory.js";
import { Runner } from "./rk86_runner.js";
import { Screen } from "./rk86_screen.js";
import { Tape } from "./rk86_tape.js";
import { tape_catalog } from "./tape_catalog.js";

import { rk86_snapshot, rk86_snapshot_restore } from "./rk86_snapshot.js";

import { hex16 } from "./hex.js";
import moveable from "./moveable.js";
import { saveAs } from "./saver.js";

const $ = (id) => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`element "${id}" not found`);
    return element;
};

class IO {
    constructor() {
        this.input = (port) => 0;
        this.output = (port, w8) => {};
        this.interrupt = (iff) => {};
    }
}

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

        this.screenshot_name = "rk86-screen";
        this.screenshot_count = 1;

        this.memory_snapshot_name = "rk86-memory";
        this.memory_snapshot_count = 1;

        this.computer_snapshot_name = "rk86-snapshot";
        this.computer_snapshot_count = 1;

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

    emulator_snapshot() {
        const json = rk86_snapshot(this.machine, "2.0.0");
        const filename = `${this.computer_snapshot_name}-${this.computer_snapshot_count}.json`;
        const blob = new Blob([json], { type: "application/json" });
        saveAs(blob, filename);
        this.computer_snapshot_count += 1;
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

        this.visualizer_panel = $("visualizer_panel");
        this.visualizer_visible = false;

        moveable(this.visualizer_panel)();

        $("visualizer_toggle").addEventListener("click", () => this.toggle_visualizer());

        // terminal

        this.terminal_panel = $("terminal_panel");
        this.terminal_visible = false;

        moveable(this.terminal_panel)();

        $("terminal_toggle").addEventListener("click", () => this.toggle_terminal());

        // keyboard dispatcher

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
                    case "KeyW":
                        this.emulator_snapshot();
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

        $("screenshot").addEventListener("click", () => {
            const filename = this.screenshot_name + "-" + this.screenshot_count + ".png";
            this.screenshot_count += 1;
            this.canvas.toBlob((blob) => saveAs(blob, filename));
        });

        $("memory_snapshot").addEventListener("click", () => {
            const snapshot = new Uint8Array(this.machine.memory.snapshot(0, 0x10000));
            const blob = new Blob([snapshot], { type: "application/octet-stream" });
            const filename = this.memory_snapshot_name + "-" + this.memory_snapshot_count + ".bin";
            saveAs(blob, filename);
            this.memory_snapshot_count += 1;
        });

        $("emulator_snapshot").addEventListener("click", () => this.emulator_snapshot());
        //     const json = rk86_snapshot(this.machine, "2.0.0");
        //     const filename = `${this.computer_snapshot_name}-${this.computer_snapshot_count}.json`;
        //     const blob = new Blob([json], { type: "application/json" });
        //     saveAs(blob, filename);
        //     this.computer_snapshot_count += 1;
        // });

        const openLink = (url) => {
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        $("help").addEventListener("click", () => openLink("help.html"));
        $("keyboard").addEventListener("click", () => openLink("keyboard.html"));
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

export async function main() {
    const url = window.location.href;

    let match;
    const autoexec_file = (match = url.match(/file=([^&]+)/)) ? match[1] : null;
    const autoexec_loadonly = (match = url.match(/loadonly=([^&]+)/)) ? match[1] : null;

    const keyboard = new Keyboard();
    const io = new IO();

    const machine = {
        font: rk86_font_image(),
        file_parser: new FileParser(),
        //
        keyboard,
        io,
    };
    machine.memory = new Memory(machine);

    machine.ui = new UI(machine);
    machine.screen = new Screen(machine);
    machine.cpu = new I8080(machine);
    machine.runner = new Runner(machine);

    machine.tape = new Tape(machine);

    async function load_catalog_file(name) {
        const array = Array.from(new Uint8Array(await (await fetch("./files/" + name)).arrayBuffer()));
        console.log(`загрузка файла ${name} из каталога, размер ${array.length} байт`);
        const file = machine.file_parser.parse_rk86_binary(name, array);
        console.log(
            `загружен файл:`,
            file.name,
            `адрес: ${hex16(file.start)}-${hex16(file.end)}`,
            `запуск: G${hex16(file.entry)}`
        );
        return file;
    }

    // this.execute_commands_loop = function (sequence, i) {
    //     const keyboard = this.runner.cpu.memory.keyboard;
    //     if (i >= sequence.length) return;
    //     const { keys, duration, action } = sequence[i];
    //     const call = action === "down" ? keyboard.onkeydown : keyboard.onkeyup;
    //     if (action != "pause") keys.forEach((key) => call(key));
    //     setTimeout(() => this.execute_commands_loop(sequence, i + 1), +duration);
    // };

    // this.execute_commands = (commands) => this.execute_commands_loop(commands, 0);

    // this.simulate_keyboard = (commands) => {
    //     const queue = convert_keyboard_sequence(commands);
    //     this.execute_commands(queue);
    // };

    function filenameURL(name) {
        if (name.startsWith("http")) return name;
        return "files/" + name;
    }

    async function fetch_file(url) {
        console.log(`Загрузка файла ${url}`);
        try {
            const content = new Uint8Array(await (await fetch(url, { redirect: "follow" })).arrayBuffer());
            console.log(`Загружен файл: ${url}, размер ${content.length} байт`);
            return content;
        } catch (error) {
            const msg = `Ошибка загрузки файла ${url}: ${error.message}`;
            console.error(msg);
            alert(msg);
        }
    }

    async function load_file(name) {
        const url = filenameURL(name);
        const content = await fetch_file(url);
        if (!content) return;
        place_file(name, content);
    }

    function place_file(name, binary) {
        const json = new FileParser().is_json(binary);
        if (json) {
            const snapshot = rk86_snapshot_restore(json, machine /*, this.simulate_keyboard*/);
            console.log(`Образ '${name}' загружен`, hex16(json.cpu.pc));
            return;
        }
        try {
            const file = this.file_parser.parse_rk86_binary(name, binary);
            machine.memory.load_file(file);
            selected_file_name = file.name;
            selected_file_entry = file.entry;
            console.log(
                `` +
                    `Файл '${name}' загружен, ` +
                    `адрес: ${hex16(file.start, "0x")}-${hex16(file.end, "0x")}, ` +
                    `запуск: G${file.entry.toString(16)}`
            );
        } catch (e) {
            alert(e.message);
            return;
        }
    }

    machine.memory.load_file(await load_catalog_file("mon32.bin"));
    // machine.memory.load_file(await load_file("DIVERSE.GAM"));
    // machine.memory.load_file(await load_catalog_file("GFIRE.GAM"));
    // machine.memory.load_file(await load_file("RESCUE.GAM"));

    machine.screen.start();

    machine.runner.execute();

    function reset() {
        machine.keyboard.reset();
        machine.cpu.jump(0xf800);
    }

    document.getElementById("reset").addEventListener("click", () => {
        reset();
    });

    document.getElementById("restart").addEventListener("click", () => {
        machine.memory.zero_ram();
        reset();
    });

    const header = document.getElementById("header");
    const footer = document.getElementById("footer");
    const disassember_panel = document.getElementById("disassembler_panel");
    const terminal_panel = document.getElementById("terminal_panel");

    document.addEventListener("fullscreenchange", () => {
        const fullscreen = document.fullscreenElement;
        if (!fullscreen) {
            header.classList.remove("hidden");
            footer.classList.remove("hidden");
            disassember_panel.classList.remove("hidden");
            terminal_panel.classList.remove("hidden");
        } else {
            header.classList.add("hidden");
            footer.classList.add("hidden");
            disassember_panel.classList.add("hidden");
            terminal_panel.classList.add("hidden");
        }
    });

    machine.memory.update_ruslat = machine.ui.update_ruslat;

    const file_selector = document.getElementById("file_selector");
    const catalog = document.getElementById("catalog_files");
    for (const name of tape_catalog()) {
        const option = document.createElement("option");
        option.value = name;
        catalog.appendChild(option);
    }
    file_selector.addEventListener("keyup", (event) => {
        if (event.key === "Escape") {
            file_selector.value = "";
            file_selector.blur();
        }
        event.stopPropagation();
    });
    file_selector.addEventListener("keydown", (event) => event.stopPropagation());
    file_selector.addEventListener("blur", (event) => {
        selected_file_name = file_selector.value;
        document.getElementById("selected_file").textContent = selected_file_name;
        file_selector.style.display = "none";
        document.getElementById("selected_file").style.display = selected_file_name ? "block" : "none";
        event.stopPropagation();
    });
    file_selector.addEventListener("change", (event) => {
        event.stopPropagation();
        file_selector.blur();
    });

    const upload_selector = document.getElementById("upload_selector");
    upload_selector.addEventListener("change", async (event) => {
        event.stopPropagation();
        const file = upload_selector.files[0];
        console.log(`uploading file: ${file.name}`);
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const binary = new Uint8Array(e.target.result);
            try {
                place_file(file.name, binary);
                window.selected_file_entry = selected_file_entry;
                $("selected_file").textContent = selected_file_name;
                $("selected_file").style.display = "block";
            } catch (error) {
                console.error(`Error loading file: ${error.message}`);
                alert(`Ошибка загрузки файла: ${error.message}`);
            }
        };
        reader.onerror = (error) => {
            console.error(`Error reading file: ${error.message}`);
            alert(`Ошибка чтения файла: ${error.message}`);
        };
        reader.readAsArrayBuffer(file);
        upload_selector.value = ""; // Reset the file input
        file_selector.value = selected_file_name; // Update the file selector with the uploaded file name
        document.getElementById("selected_file").style.display = "none"; // Hide the selected file input
    });

    let selected_file_name = "";
    let selected_file_entry = 0;

    const selected_file_element = $("selected_file");

    if (selected_file_name) {
        selected_file_element.textContent = selected_file_name;
        selected_file_element.style.display = "block";
    }

    document.getElementById("load").addEventListener("click", async () => {
        if (!selected_file_name) return alert("Hе выбран файл для загрузки.");
        const filename = selected_file_name;
        console.log(`loading file: ${filename}`);
        const file = await load_catalog_file(filename);
        console.log(`loaded file: ${filename}`);
        machine.memory.load_file(file);
        const msg = [
            `Загружен файл "${filename}"`,
            `Адрес: 0x${hex16(file.start)}-0x${hex16(file.end)}`,
            `Запуск: G${hex16(file.entry)}`,
        ].join("\n");
        console.log(msg);
        alert(msg);
    });

    document.getElementById("run").addEventListener("click", async () => {
        if (!selected_file_name) return alert("Не выбран файл для запуска.");
        const filename = selected_file_name;
        console.log(`loading file: ${filename}`);
        const file = await load_catalog_file(filename);
        console.log(`loaded file: ${filename}`);
        machine.memory.load_file(file);
        machine.cpu.jump(file.entry);
    });

    machine.ui.i8080disasm = new I8080DisasmPanel(machine.memory);
    window.i8080disasm = machine.ui.i8080disasm;

    machine.ui.terminal = new Console(machine);
    machine.ui.terminal.init(machine);

    machine.ui.start_update_perf();

    window.machine = machine;

    // visualizer
    {
        const template = document.createElement("template");
        const content = await (await fetch("./i8080_visualizer.html")).text();
        template.innerHTML = content;

        const loaded = template.content.querySelector("#visualizer_panel");
        const target = document.getElementById("visualizer_panel");

        while (loaded.firstChild) target.appendChild(loaded.firstChild);

        machine.ui.visualizer = new Visualizer();
    }
}

await main();
