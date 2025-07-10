function hex(v, prefix) {
    return v.toString(16).toUpperCase();
}

export function hex8(v, prefix) {
    return (prefix ? prefix : "") + hex(v & 0xff, prefix).padStart(2, "0");
}

export function hex16(v, prefix) {
    return (prefix ? prefix : "") + hex(v & 0xffff, prefix).padStart(4, "0");
}

export function hexArray(array) {
    return array.map((c) => hex8(c)).join(" ");
}

export function fromHex(v) {
    if (typeof v === "string") {
        return v.startsWith("0x") ? parseInt(v, 16) : parseInt(v);
    }
    return v;
}
