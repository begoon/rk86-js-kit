import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TERMINAL = "src/lib/terminal/rk86_terminal.ts";

function runTerminal(args: string[], timeoutMs: number): Promise<{ code: number | null; elapsedMs: number }> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const child = spawn("bun", [TERMINAL, ...args], { stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (d) => (stderr += d.toString()));
        const killer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error(`timeout after ${timeoutMs}ms, stderr: ${stderr}`));
        }, timeoutMs);
        child.on("exit", (code) => {
            clearTimeout(killer);
            resolve({ code, elapsedMs: Date.now() - start });
        });
        child.on("error", reject);
    });
}

function withTmpDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const dir = mkdtempSync(join(tmpdir(), "rk86-e2e-"));
    return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

test("headless + timeout exits after N seconds and dumps screen", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen.txt");
        const { code, elapsedMs } = await runTerminal(
            ["--headless", "--timeout", "2", "--screen", screen],
            15000,
        );
        expect(code).toBe(0);
        expect(elapsedMs).toBeGreaterThanOrEqual(1800);
        expect(elapsedMs).toBeLessThan(5000);
        const text = readFileSync(screen, "utf-8");
        const lines = text.split("\r\n");
        expect(lines).toHaveLength(31); // 30 rows + trailing empty after final \r\n
        for (let i = 0; i < 30; i++) expect(lines[i]).toHaveLength(78);
        expect(text).toContain("РАДИО-86РК");
    });
});

test("memory dump writes exact byte range", async () => {
    await withTmpDir(async (dir) => {
        const mem = join(dir, "mem.bin");
        const { code } = await runTerminal(
            [
                "--headless",
                "--timeout",
                "2",
                "--memory",
                mem,
                "--memory-from",
                "0xF800",
                "--memory-to",
                "0xF803",
            ],
            15000,
        );
        expect(code).toBe(0);
        const bytes = readFileSync(mem);
        expect(bytes).toHaveLength(4); // F800..F803 inclusive
        // first byte of monitor ROM is JMP (c3)
        expect(bytes[0]).toBe(0xc3);
    });
});

test("--input injects monitor D command and produces hex dump on screen", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen.txt");
        const { code } = await runTerminal(
            [
                "--headless",
                "--timeout",
                "4",
                "--input",
                "KeyD,Digit0,Comma,KeyF,KeyF,Enter",
                "--screen",
                screen,
            ],
            15000,
        );
        expect(code).toBe(0);
        const text = readFileSync(screen, "utf-8");
        expect(text).toContain("-->D0,FF");
        expect(text).toMatch(/0000 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00/);
        expect(text).toMatch(/00F0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00/);
    });
});

test("--input + --exit-halt: write HLT at 0000 and run via monitor M/G commands", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen.txt");
        const mem = join(dir, "mem.bin");
        const { code, elapsedMs } = await runTerminal(
            [
                "--headless",
                "--exit-halt",
                "--input",
                "KeyM,Enter,Digit7,Digit6,Enter,Period,KeyG,Digit0,Enter",
                "--timeout",
                "12",
                "--screen",
                screen,
                "--memory",
                mem,
                "--memory-from",
                "0x0000",
                "--memory-to",
                "0x0000",
            ],
            20000,
        );
        expect(code).toBe(0);
        // should exit on HLT well before --timeout 12 seconds
        expect(elapsedMs).toBeLessThan(8000);
        const bytes = readFileSync(mem);
        expect(bytes[0]).toBe(0x76); // HLT was actually written
        const text = readFileSync(screen, "utf-8");
        expect(text).toContain("-->M");
        expect(text).toContain("-->G0");
    });
});
