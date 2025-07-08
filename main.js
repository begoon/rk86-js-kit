import { Bus } from "./bus.js";
import { I8080 } from "./i8080.js";
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
import { UI } from "./ui.js";

function IO() {
    this.input = function (port) {
        return 0;
    };
    this.output = function (port, w8) {};
    this.interrupt = function (iff) {};
}

export async function main() {
    const bus = new Bus();

    bus.on("sound", (enabled) => console.log("sound enabled:", enabled));

    const keyboard = new Keyboard();
    const io = new IO();

    const machine = {
        bus,
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

    async function load_file(name) {
        const array = Array.from(new Uint8Array(await (await fetch("./files/" + name)).arrayBuffer()));
        console.log(`loading file: ${name}, size: ${array.length} bytes`);
        return machine.file_parser.parse_rk86_binary(name, array);
    }

    machine.memory.load_file(await load_file("mon32.bin"));
    // machine.memory.load_file(await load_file("DIVERSE.GAM"));
    machine.memory.load_file(await load_file("GFIRE.GAM"));
    // machine.memory.load_file(await load_file("RESCUE.GAM"));

    machine.screen.start();

    machine.runner.execute();

    bus.on("reset", () => reset());

    function reset() {
        machine.keyboard.reset();
        machine.cpu.jump(0xf800);
    }

    document.getElementById("reset").addEventListener("click", () => {
        bus.emit("reset");
    });

    document.getElementById("restart").addEventListener("click", () => {
        machine.memory.zero_ram();
        bus.emit("reset");
    });

    const header = document.getElementById("header");
    const footer = document.getElementById("footer");
    const disassember_panel = document.getElementById("disassembler_panel");
    const terminal_panel = document.getElementById("console");
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
        selected_file = file_selector.value;
        document.getElementById("selected_file").textContent = selected_file;
        file_selector.style.display = "none";
        document.getElementById("selected_file").style.display = selected_file ? "block" : "none";
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
            const array = Array.from(new Uint8Array(e.target.result));
            console.log(`loaded file: ${file.name}, size: ${array.length} bytes`);
            try {
                const parsed_file = machine.file_parser.parse_rk86_binary(file.name, array);
                machine.memory.load_file(parsed_file);
                selected_file = parsed_file.name;
                selected_file_entry = parsed_file.entry;
                window.selected_file_entry = selected_file_entry;
                alert(
                    `Загружен файл "${parsed_file.name}"\n` +
                        `Адрес: 0x${parsed_file.start.toString(16).padStart(4, "0")}` +
                        `-` +
                        `0x${parsed_file.end.toString(16).padStart(4, "0")}\n` +
                        `Запуск: G${parsed_file.entry.toString(16)}`
                );
                document.getElementById("selected_file").textContent = selected_file;
                document.getElementById("selected_file").style.display = "block";
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
        file_selector.value = selected_file; // Update the file selector with the uploaded file name
        document.getElementById("selected_file").style.display = "none"; // Hide the selected file input
    });

    let selected_file = undefined;
    let selected_file_entry = 0;

    if (selected_file) {
        document.getElementById("selected_file").textContent = selected_file;
        document.getElementById("selected_file").style.display = "block";
    }

    document.getElementById("load").addEventListener("click", async () => {
        const filename = file_selector.options[file_selector.selectedIndex].value;
        console.log(`loading file: ${filename}`);
        const file = await load_file(filename);
        console.log(`loaded file: ${filename}`);
        machine.memory.load_file(file);
        alert(
            `` +
                `Загружен файл "${filename}"\n` +
                `Адрес: 0x${file.start.toString(16).padStart(4, "0")}` +
                `-` +
                `0x${file.end.toString(16).padStart(4, "0")}\n` +
                `Запуск: G${file.entry.toString(16)}`
        );
    });

    document.getElementById("run").addEventListener("click", async () => {
        if (!selected_file) return alert("Не выбран файл для запуска.");
        const filename = selected_file;
        console.log(`loading file: ${filename}`);
        const file = await load_file(filename);
        console.log(`loaded file: ${filename}`);
        machine.memory.load_file(file);
        machine.cpu.jump(file.entry);
    });

    machine.ui.i8080disasm = new I8080DisasmPanel(machine.memory);
    window.i8080disasm = machine.ui.i8080disasm;

    machine.ui.terminal = new Console(machine);
    machine.ui.terminal.init(machine);

    machine.ui.start_update_perf();

    window.ui = machine.ui;
    window.cpu = machine.cpu;
    window.memory = machine.memory;
    window.runner = machine.runner;

    window.machine = machine;
}

await main();
