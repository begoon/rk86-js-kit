import { expect, test } from "bun:test";

import { rk86_check_sum } from "../rk86_check_sum.js";

test("extract_rk86_word", () => {
    expect(rk86_check_sum([0xc3, 0x36, 0xf8])).toBe(0xf9f1);
});
