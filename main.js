import { I8080 } from "./i8080.js";
import Visualizer from "./i8080_visualizer.js";
import I8080DisasmPanel from "./i8080disasm_panel.js";
import * as KeyboardVisualizer from "./kbd-js.js";
import { Console } from "./rk86_console.js";
import * as FileParser from "./rk86_file_parser.js";
import { rk86_font_image } from "./rk86_font.js";
import { Keyboard } from "./rk86_keyboard.js";
import { convert_keyboard_sequence } from "./rk86_keyboard_injector.js";
import { Memory } from "./rk86_memory.js";
import { Runner } from "./rk86_runner.js";
import { Screen } from "./rk86_screen.js";
import { rk86_snapshot, rk86_snapshot_restore } from "./rk86_snapshot.js";
import { Tape } from "./rk86_tape.js";
import { tape_catalog } from "./tape_catalog.js";

import { hex16 } from "./hex.js";
import moveable from "./moveable.js";
import { saveAs } from "./saver.js";

const elements = new Map();

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
const $ = (id) => {
    const cachedID = elements.get(id);
    if (cachedID) return cachedID;

    const element = document.getElementById(id);
    if (!element) throw new Error(`element "${id}" not found`);

    elements.set(id, element);
    return element;
};

// ---

class IO {
    constructor() {
        this.input = (port) => 0;
        this.output = (port, w8) => {};
        this.interrupt = (iff) => {};
    }
}

/**
 * class
 */
export class UI {
    constructor(machine) {
        this.machine = machine;

        /**
         * @type {HTMLCanvasElement}
         */
        // @ts-ignore
        this.canvas = $("canvas");
        if (!this.canvas || !this.canvas.getContext) {
            alert("Tag <canvas> is not supported in the browser");
            return;
        }

        /**
         * @type {HTMLElement}
         */
        this.ips = $("ips");
        /**
         * @type {HTMLElement}
         */
        this.tps = $("tps");

        this.meta_press_count = 0;

        this.command_mode = false;

        this.screenshot_name = "rk86-screen";
        this.screenshot_count = 1;

        this.memory_snapshot_name = "rk86-memory";
        this.memory_snapshot_count = 1;

        this.computer_snapshot_name = "rk86-snapshot";
        this.computer_snapshot_count = 1;

        this.configureEventListeners();

        /** @type {import('./rk86_console.js').Console} */
        this.terminal;
    }

    start_update_perf = () => setInterval(() => this.update_perf(), 2000);

    /**
     * @param {number} width
     * @param {number} height
     */
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
        console.log("%creset", "color: lightgreen; font-weight: bold");
    }

    restart() {
        this.machine.memory.zero_ram();
        this.reset();
    }

    update_ruslat = (value) => {
        $("ruslat").textContent = value ? "РУС" : "ЛАТ";
    };

    update_perf() {
        /**
         * @param {HTMLElement} element
         * @param {number} value
         */
        const update = (element, value) => {
            element.textContent = Math.floor(value * 1000).toLocaleString();
        };
        update(this.ips, this.machine.runner.instructions_per_millisecond);
        update(this.tps, this.machine.runner.ticks_per_millisecond);
    }

    /**
     * @param {number} address
     */
    update_video_memory_address(address) {
        $("video_memory_base").textContent = address.toString(16).toUpperCase();
    }

    /**
     * @param {number} width
     * @param {number} height
     */
    update_screen_geometry(width, height) {
        $("screen_width").textContent = width.toString();
        $("screen_height").textContent = height.toString();
    }

    /**
     * @param {string} element
     * @param {boolean} visible
     */
    static setVisibility(element, visible) {
        $(element).style.display = visible ? "block" : "none";
    }

    /**
     * @param {string} element
     * @returns {boolean}
     */
    static toggleVisibility(element) {
        const visible = UI.isVisible(element);
        UI.setVisibility(element, !visible);
        return !visible;
    }

    /**
     * @param {string} element
     * @returns {boolean}
     */
    static isVisible(element) {
        const v = $(element).style.display;
        return v !== "none" && v !== "";
    }

    /**
     * @param {string} element
     * @return {boolean}
     */
    static toggleIcon(element) {
        return $(element).classList.toggle("active");
    }

    /**
     * @param {string} element
     * @returns {boolean}
     */
    static isToggleOn = (element) => $(element).classList.contains("active");

    toggle_assembler() {
        const visible = UI.toggleVisibility("assembler_panel");
        UI.toggleIcon("assembler_toggle");

        UI.setVisibility("canvas", !visible);

        visible ? $("assembler_panel").focus() : $("canvas").focus();
    }

    toggle_disassembler() {
        const visible = UI.toggleVisibility("disassembler_panel");
        UI.toggleIcon("disassembler_toggle");

        if (visible) $("disassembler_panel").focus();

        this.machine.ui.i8080disasm.refresh();
        this.machine.ui.i8080disasm.go_code(this.machine.cpu.pc);
    }

    toggle_terminal() {
        const visible = UI.toggleVisibility("terminal_panel");
        UI.toggleIcon("terminal_toggle");

        // This is the actual terminal object, not the panel.
        if (visible) this.terminal.focus();
    }

    toggle_visualizer() {
        const visible = UI.toggleVisibility("visualizer_panel");
        UI.toggleIcon("visualizer_toggle");

        this.visualizer_visible = visible;
    }

    toggle_keyboard() {
        const visible = UI.toggleVisibility("keyboard_panel");
        UI.toggleIcon("keyboard_toggle");
        // this.keyboard_visible = !this.keyboard_visible;

        // this.keyboard_panel.style.display = this.keyboard_visible ? "block" : "none";

        // UI.toggleIcon("keyboard_toggle", this.keyboard_visible);
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

        $("ruslat_toggle").addEventListener("click", () => {
            const ruslat_flag = 0x7606;
            const state = this.machine.memory.read(ruslat_flag) ? 0x00 : 0xff;
            this.machine.memory.write(ruslat_flag, state);
            this.update_ruslat(state);
        });

        $("sound_toggle").addEventListener("click", () => {
            const sound_enabled = UI.toggleIcon("sound_toggle");

            this.machine.runner.init_sound(sound_enabled);

            const toggle = $("sound-icon-toggle");
            toggle.src = sound_enabled ? toggle.dataset.on : toggle.dataset.muted;

            const icon = $("sound-icon");
            icon.textContent = icon.dataset[sound_enabled ? "on" : "off"];

            icon.classList.add("visible");
            setTimeout(() => icon.classList.remove("visible"), 2000);
        });

        document.getElementById("catalog").addEventListener("click", () => {
            document.getElementById("selected_file").style.display = "none";
            document.getElementById("file_selector").style.display = "block";
            document.getElementById("file_selector").focus();
        });

        $("assembler_toggle").addEventListener("click", () => this.toggle_assembler());
        $("disassembler_toggle").addEventListener("click", () => this.toggle_disassembler());
        $("visualizer_toggle").addEventListener("click", () => this.toggle_visualizer());
        $("terminal_toggle").addEventListener("click", () => this.toggle_terminal());

        moveable($("disassembler_panel"))();
        moveable($("visualizer_panel"))();
        moveable($("terminal_panel"))();
        moveable($("keyboard_panel"))();

        // keyboard dispatcher

        document.onkeydown = (event) => {
            if (this.command_mode) {
                switch (event.code) {
                    case "KeyL":
                        $("selected_file").style.display = "none";
                        $("file_selector").style.display = "block";
                        $("file_selector").focus();
                        event.preventDefault();
                        break;
                    case "KeyU":
                        $("upload_selector").click();
                        event.preventDefault();
                        break;
                    case "KeyP":
                        pause.click();
                        break;
                    case "KeyG":
                        $("run").click();
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
                        break;
                    case "KeyV":
                        this.toggle_visualizer();
                        break;
                    case "KeyS":
                        $("sound_toggle").click();
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
                    case "KeyB":
                        this.toggle_keyboard();
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

        $("disassembler_panel").addEventListener("keyup", (event) => {
            if (event.key === "Escape") {
                $("disassembler_panel").blur();
                this.toggle_disassembler();
            }
            if (event.key === "Enter") {
                this.machine.ui.i8080disasm.form_go_code();
            }
            event.stopPropagation();
        });

        $("disassembler_panel").addEventListener("keydown", (event) => {
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
        $("keyboard_toggle").addEventListener("click", () => this.toggle_keyboard());
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
    const keyboard = new Keyboard();
    const io = new IO();

    /** @type {{ font: string, keyboard: Keyboard, io: IO, ui: UI }} */
    const machine = {
        font: rk86_font_image(),
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

    /**
     *
     * @param {string} name
     * @returns {Promise<import('./rk86_file_parser.js').File >}
     */
    async function load_catalog_file(name) {
        const array = Array.from(new Uint8Array(await (await fetch("./files/" + name)).arrayBuffer()));
        console.log(`загрузка файла ${name} из каталога, размер ${array.length} байт`);
        const file = FileParser.parse_rk86_binary(name, array);
        console.log(
            `загружен файл`,
            `[${file.name}]`,
            `c адреса ${hex16(file.start)} до ${hex16(file.end)},`,
            `запуск: G${hex16(file.entry)}`
        );
        return file;
    }

    /** @typedef {Object.<number, string>} KeyCodes */
    const KEY_CODES = {
        8: "Backspace",
        9: "Tab",
        13: "Enter",
        16: "ShiftRight",
        17: "ControlLeft",
        32: "Space",
        35: "End",
        36: "Home",
        37: "ArrowLeft",
        38: "ArrowUp",
        39: "ArrowRight",
        40: "ArrowDown",
        46: "Delete",
        48: "Digit0",
        49: "Digit1",
        50: "Digit2",
        51: "Digit3",
        52: "Digit4",
        53: "Digit5",
        54: "Digit6",
        55: "Digit7",
        56: "Digit8",
        57: "Digit9",
        65: "KeyA",
        66: "KeyB",
        67: "KeyC",
        68: "KeyD",
        69: "KeyE",
        70: "KeyF",
        71: "KeyG",
        72: "KeyH",
        73: "KeyI",
        74: "KeyJ",
        75: "KeyK",
        76: "KeyL",
        77: "KeyM",
        78: "KeyN",
        79: "KeyO",
        80: "KeyP",
        81: "KeyQ",
        82: "KeyR",
        83: "KeyS",
        84: "KeyT",
        85: "KeyU",
        86: "KeyV",
        87: "KeyW",
        88: "KeyX",
        89: "KeyY",
        90: "KeyZ",
        112: "F1",
        113: "F2",
        114: "F3",
        115: "F4",
        116: "F5",
        117: "F6",
        118: "F7",
        121: "F10",
        186: "Semicolon",
        188: "Comma",
        189: "Minus",
        190: "Period",
        192: "Quote",
        191: "Slash",
        219: "BracketLeft",
        221: "BracketRight",
        226: "Backslash",
    };

    /**
     * @param {string|number} key - Either a string keyboard code (like "KeyA") or a numeric key code (like 65)
     * @returns {string} - The keyboard event code (like "KeyA")
     */
    function translate_key(key) {
        if (typeof key === "string") return key;
        return KEY_CODES[key];
    }

    /**
     * @param {Array<{keys: string[], duration: number, action: string}>} sequence
     * @param {number} i
     */
    function execute_commands_loop(sequence, i) {
        const { keyboard } = machine;
        if (i >= sequence.length) return;
        const { keys, duration, action } = sequence[i];
        const call = action === "down" ? keyboard.onkeydown : keyboard.onkeyup;
        if (action != "pause") keys.forEach((key) => call(translate_key(key)));
        setTimeout(() => execute_commands_loop(sequence, i + 1), +duration);
    }

    const execute_commands = (commands) => execute_commands_loop(commands, 0);

    function simulate_keyboard(commands) {
        const queue = convert_keyboard_sequence(commands);
        execute_commands(queue);
    }

    const basename = (url) => url.split("/").at(-1);

    function filenameURL(name) {
        if (name.startsWith("http")) return name;
        if (name.startsWith("./")) return name;
        return "files/" + name;
    }

    /**
     * @param {string} url
     * @returns {Promise<number[]|undefined>}
     */
    async function fetch_file(url) {
        console.log(`загрузка файла ${url}`);
        try {
            const content = new Uint8Array(await (await fetch(url)).arrayBuffer());
            console.log(`загружен файл %c${basename(url)}%c длиной ${content.length} байт`, "font-weight: bold", "");
            return Array.from(content);
        } catch (error) {
            console.error(`ошибка загрузки файла ${url}: ${error}`);
        }
    }

    /**
     * @param {string} name
     * @returns {Promise<void>}
     */
    async function loadAutoexecFile(name) {
        const url = filenameURL(name);
        const content = await fetch_file(url);
        if (!content) return;
        injectFile(name, content);
    }

    let selected_file_name = "";
    let selected_file_entry = 0;

    /**
     * @param {string} name
     * @param {number[]} binary
     */
    function injectFile(name, binary) {
        console.log(`размещаем файл [${name}] длиной ${binary.length} в память эмулятора`);
        const json = FileParser.is_json(binary);
        if (json) {
            rk86_snapshot_restore(json, machine, simulate_keyboard);
            console.log(`образ [${name}] загружен, PC=${hex16(json.cpu.pc)}`);
            return;
        }
        try {
            const file = FileParser.parse_rk86_binary(name, binary);
            machine.memory.load_file(file);
            selected_file_name = file.name;
            selected_file_entry = file.entry;
            console.log(
                `` +
                    `загружен файл [${name}] ` +
                    `c адреса ${hex16(file.start, "0x")} по ${hex16(file.end, "0x")}, ` +
                    `запуск: G${file.entry.toString(16)}`
            );
        } catch (e) {
            console.error(e);
            return;
        }
    }

    machine.memory.load_file(await load_catalog_file("mon32.bin"));

    machine.screen.start();

    const url = window.location.href;

    let match;
    const autoexec_file = (match = url.match(/file=([^&]+)/)) ? match[1] : null;
    const autoexec_loadonly = (match = url.match(/loadonly=([^&]+)/)) ? match[1] : null;

    if (autoexec_file) {
        console.log(`автозагрузка файла: ${autoexec_file}`);
        await loadAutoexecFile(autoexec_file);
    }

    machine.runner.execute();

    function reset() {
        machine.keyboard.reset();
        machine.cpu.jump(0xf800);
    }

    $("reset").addEventListener("click", () => reset());
    $("restart").addEventListener("click", () => {
        machine.memory.zero_ram();
        reset();
    });

    const hideablePanels = [
        "header",
        "footer",
        "disassembler_panel",
        "terminal_panel",
        "visualizer_panel",
        "keyboard_panel",
    ];

    document.addEventListener("fullscreenchange", () => {
        const fullscreen = document.fullscreenElement;
        hideablePanels.forEach((id) => {
            const classList = $(id).classList;
            fullscreen ? classList.add("hidden") : classList.remove("hidden");
        });
    });

    machine.memory.update_ruslat = machine.ui.update_ruslat;

    for (const name of tape_catalog()) {
        const option = document.createElement("option");
        option.value = name;
        $("catalog_files").appendChild(option);
    }

    $("file_selector").addEventListener("keyup", (event) => {
        if (event.key === "Escape") {
            $("file_selector").value = "";
            $("file_selector").blur();
        }
        event.stopPropagation();
    });

    $("file_selector").addEventListener("keydown", (event) => event.stopPropagation());

    $("file_selector").addEventListener("blur", (event) => {
        selected_file_name = $("file_selector").value;
        $("selected_file").textContent = selected_file_name;
        $("file_selector").style.display = "none";
        $("selected_file").style.display = selected_file_name ? "block" : "none";
        event.stopPropagation();
    });

    $("file_selector").addEventListener("change", (event) => {
        event.stopPropagation();
        $("file_selector").blur();
    });

    $("upload_selector").addEventListener("change", async (event) => {
        event.stopPropagation();
        const file = $("upload_selector").files[0];
        console.log(`загружаем файл [${file.name}]`);
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            if (!(data instanceof ArrayBuffer)) {
                console.error("%ошибка: данные не являются ArrayBuffer", "color: red");
                return;
            }
            const binary = new Uint8Array(data);
            console.log(`загружен внешний файл ${file.name}, размер ${binary.length} байт`);
            try {
                injectFile(file.name, binary);

                window.selected_file_entry = selected_file_entry;

                // Update the UI to show the selected file name
                $("selected_file").textContent = selected_file_name;
                $("selected_file").style.display = "block";
            } catch (error) {
                // Handle any errors that occur during file processing
                console.error(`Error loading file: ${error.message}`);
                alert(`Ошибка загрузки файла: ${error.message}`);
            }
        };
        reader.onerror = (error) => {
            console.error(`Error reading file: ${error.message}`);
            alert(`Ошибка чтения файла: ${error.message}`);
        };
        reader.readAsArrayBuffer(file);

        $("upload_selector").value = "";
        $("file_selector").value = selected_file_name;
        $("selected_file").style.display = "none";
    });

    const selected_file_element = $("selected_file");

    if (selected_file_name) {
        selected_file_element.textContent = selected_file_name;
        selected_file_element.style.display = "block";
    }

    async function load_catalog_file_from_selector() {
        if (!selected_file_name) return alert("Hе выбран файл для загрузки.");
        const filename = selected_file_name;
        console.log(`загружаем файл [${filename}]`);
        const file = await load_catalog_file(filename);
        console.log(`загружен файл [${filename}]`);
        machine.memory.load_file(file);
        return file;
    }

    $("load").addEventListener("click", async () => {
        const file = await load_catalog_file_from_selector();
        if (!file) return;
        alert(
            [
                `загружен файл [${file.name}]`,
                `с адреса ${hex16(file.start, "0x")} по ${hex16(file.end, "0x")}`,
                `запуск: G${hex16(file.entry)}`,
            ].join("\n")
        );
    });

    $("run").addEventListener("click", async () => {
        const file = await load_catalog_file_from_selector();
        if (!file) return;

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
        const content = await (await fetch("./i8080_visualizer.html")).text();
        const loaded = new DOMParser().parseFromString(content, "text/html");

        $("visualizer_panel").innerHTML = loaded.getElementById("visualizer_panel").innerHTML;

        machine.ui.visualizer = new Visualizer();
    }

    // keyboard visualizer
    {
        const content = await (await fetch("./kbd-js.html")).text();
        const loaded = new DOMParser().parseFromString(content, "text/html");

        $("keyboard_panel").innerHTML = loaded.getElementById("keyboard_panel").innerHTML;
        KeyboardVisualizer.create();
    }
}

await main();
