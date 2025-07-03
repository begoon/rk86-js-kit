import { expect, test } from "bun:test";

import "../format.js";

test("String.prototype.format", () => {
    expect("%04x".format(123)).toBe("007b");
    expect("%x".format(123)).toBe("7b");
    expect("%X".format(123)).toBe("7B");
    expect("%d".format(123)).toBe("123");
    expect("%u".format(-123)).toBe("123");
    expect("%s".format("test")).toBe("test");
    expect("%c".format(65)).toBe("A");
    expect("%b".format(5)).toBe("101");
    expect("%f".format(3.14159)).toBe("3.14159");
    expect("%e".format(123456)).toBe("1.23456e+5");
    expect("%o".format(8)).toBe("10");
});
