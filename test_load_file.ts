import fs from "node:fs/promises";

export async function load_file(name: string, memory: any, tracer: any): Promise<void> {
    const image = await fs.readFile("./test/" + name);
    image.forEach((byte, i) => memory.write(0x100 + i, byte));
    tracer.writeln(`> LOAD ${name} ${image.length}`);
}
