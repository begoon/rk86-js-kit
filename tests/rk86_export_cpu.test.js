import { beforeEach, expect, test } from "bun:test";

import { I8080 } from "../i8080.js";

let cpu = undefined;

beforeEach(() => {
    cpu = new I8080({});
    cpu.set_a(0xe6);
    cpu.sf = 1;
    cpu.zf = 0;
    cpu.hf = 1;
    cpu.pf = 0;
    cpu.cf = 1;
    cpu.set_b(0x11);
    cpu.set_c(0x22);
    cpu.set_d(0x33);
    cpu.set_e(0x44);
    cpu.set_h(0x55);
    cpu.set_l(0x66);
    cpu.sp = 0x7788;
    cpu.pc = 0x9999;
    cpu.iff = 1;
});

test("cpu export", () => {
    const exported = cpu.export();
    expect(exported.a).toBe("0xE6");
    expect(exported.sf).toBe(1);
    expect(exported.zf).toBe(0);
    expect(exported.hf).toBe(1);
    expect(exported.pf).toBe(0);
    expect(exported.cf).toBe(1);
    expect(exported.bc).toBe("0x1122");
    expect(exported.de).toBe("0x3344");
    expect(exported.hl).toBe("0x5566");
    expect(exported.sp).toBe("0x7788");
    expect(exported.pc).toBe("0x9999");
    expect(exported.iff).toBe(1);
});

// test("cpu import", () => {
//     const cpu = t.context;

//     const imported = new I8080(new Memory(), undefined);
//     imported.import(cpu.export());

//     t.is(imported.a(), cpu.a());
//     t.is(imported.sf, cpu.sf);
//     t.is(imported.zf, cpu.zf);
//     t.is(imported.hf, cpu.hf);
//     t.is(imported.pf, cpu.pf);
//     t.is(imported.cf, cpu.cf);
//     t.is(imported.b(), cpu.b());
//     t.is(imported.c(), cpu.c());
//     t.is(imported.d(), cpu.d());
//     t.is(imported.e(), cpu.e());
//     t.is(imported.h(), cpu.h());
//     t.is(imported.l(), cpu.l());
//     t.is(imported.sp, cpu.sp);
//     t.is(imported.pc, cpu.pc);
// });
