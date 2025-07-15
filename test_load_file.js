import fs from "node:fs/promises";

/**
 * @param {string} name
 * @param {object} memory
 * @param {object} tracer
 * @returns {Promise<void>}
 */
export async function load_file(name, memory, tracer) {
    const image = await fs.readFile("./test/" + name);
    image.forEach((byte, i) => memory.write(0x100 + i, byte));
    tracer.writeln(`> LOAD ${name} ${image.length}`);
}
