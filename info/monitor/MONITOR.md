# RK-86 Monitor ROM Reference

## Memory Map

| Range           | Description                          |
|-----------------|--------------------------------------|
| 0000h-75FFh     | RAM (user programs)                  |
| 7600h-765Fh     | Monitor variables                    |
| 76D0h-7FF4h     | Video memory (30 rows x 78 cols)     |
| 8000h-8003h     | Keyboard (Intel 8255 PPI)            |
| A000h-A003h     | Tape recorder I/O                    |
| C000h-C001h     | CRT controller (Intel 8275)          |
| F800h-FFFFh     | Monitor ROM                          |

## Monitor Variables

| Address | Description                              |
|---------|------------------------------------------|
| 7600h   | Cursor video address (2 bytes)           |
| 7602h   | Cursor X,Y position (2 bytes: col, row)  |
| 7604h   | Cursor escape sequence state             |
| 7606h   | Rus/Lat flag (00h=lat, FFh=rus)           |
| 761Ch   | Saved stack pointer (2 bytes)            |
| 7631h   | Memory limit (2 bytes)                   |
| 7633h   | Keyboard input buffer                    |

## Video Memory

- Start: 76D0h
- Layout: 30 rows x 78 bytes per row
- Monitor text area: 64 columns x 25 rows (cols 8-71, rows 3-27)
- Text area base address: 77C2h (row 3, col 8)
- Row stride: 78 bytes
- Address for play area (x, y): 77C2h + y*78 + x

### Control Characters (via putc)

| Code | Effect         |
|------|----------------|
| 08h  | Cursor left    |
| 0Ah  | Line feed      |
| 0Dh  | Carriage return|
| 18h  | Cursor right   |
| 19h  | Cursor up      |
| 1Ah  | Cursor down    |
| 1Bh  | Escape         |
| 1Fh  | Clear screen   |
| 0Ch  | Home cursor    |

### CRT Controller (Intel 8275)

| Address | Description       |
|---------|-------------------|
| C000h   | Data/parameter    |
| C001h   | Command/status    |

Video init sequence (at entry_video, FACEh):
C001h=00h, C000h=4Dh, 1Dh, 99h, 93h, C001h=27h.

## Keyboard (Intel 8255 PPI)

| Address | Description                              |
|---------|------------------------------------------|
| 8000h   | Port A — row select (output, active low) |
| 8001h   | Port B — column data (input, active low) |
| 8002h   | Port C — modifiers/status                |
| 8003h   | Control register                         |

PPI init at boot: 8Bh to 8003h (Port A=output, Port B=input, Port C mixed).

### Reading Keys Directly

Write inverted row mask to 8000h, read 8001h, CMA to get 1=pressed.

Row 1 (write FDh to 8000h) — special keys:

| Bit | Key          | Code |
|-----|--------------|------|
| 0   | TAB          | 09h  |
| 1   | LF           | 0Ah  |
| 2   | CR (Enter)   | 0Dh  |
| 3   | DEL          | 7Fh  |
| 4   | Left arrow   | 08h  |
| 5   | Up arrow     | 19h  |
| 6   | Right arrow  | 18h  |
| 7   | Down arrow   | 1Ah  |

Rows 2-7 contain the main alphanumeric keys (8 columns each).
Row 0 contains F1-F5 and other function keys.

## Monitor ROM Entry Points (jump table at F800h)

| Address | Name     | In                                  | Out                                 | Description                          |
|---------|----------|-------------------------------------|-------------------------------------|--------------------------------------|
| F800h   | start    | —                                   | — (no return)                       | Cold start, reinitialize everything  |
| F803h   | getc     | —                                   | A = key code                        | Wait for keypress (blocking)         |
| F806h   | inpb     | A = FFh for sync byte               | A = byte read                       | Read one byte from tape              |
| F809h   | putc     | C = character                       | —                                   | Print character to screen at cursor  |
| F80Ch   | outb     | C = byte                            | —                                   | Write one byte to tape               |
| F80Fh   | temp     | C = character                       | —                                   | Same as putc                         |
| F812h   | kbhit    | —                                   | A = key code, or 0                  | Non-blocking keyboard check          |
| F815h   | hexb     | A = byte                            | —                                   | Print A as two hex digits at cursor  |
| F818h   | puts     | HL = string address                 | —                                   | Print null-terminated string         |
| F81Bh   | scan_kbd | —                                   | A = key, FFh=none, FEh=rus/lat      | Raw keyboard matrix scan             |
| F81Eh   | getxy    | —                                   | H = row, L = col                    | Get cursor position                  |
| F821h   | curc     | —                                   | A = char under cursor               | Read character at cursor position    |
| F824h   | inpblock | HL = offset                         | HL = start, DE = end, BC = checksum | Read block from tape                 |
| F827h   | outblock | HL = start, DE = end, BC = checksum | -                                   | Write block to tape                  |
| F82Ah   | chksum   | HL = start, DE = end                | BC = checksum                       | Calculate checksum of memory block   |
| F82Dh   | video    | —                                   | —                                   | Initialize/restart CRT controller    |
| F830h   | getlim   | —                                   | HL = memory limit                   | Get top of user RAM                  |
| F833h   | setlim   | HL = memory limit                   | —                                   | Set top of user RAM                  |

### Other Useful Addresses

| Address | Name        | Description                                                        |
|---------|-------------|--------------------------------------------------------------------|
| F86Ch   | prompt_loop | Warm restart — return to monitor prompt without reinitializing HW  |

## Stack

Monitor sets SP to 76CFh (just below video memory at 76D0h).
Stack grows downward into 7660h-76CEh area.
User programs should use the same stack or set SP to a safe address below 7600h.

## Character Set

0x00-0x7F base characters. 0x80-0xFF are inverse video copies of 0x00-0x7F.

|      | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | A   | B   | C   | D   | E   | F   |
|------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 0x0_ |     | ▘   | ▝   | ▀   | ▗   | ▚   | ▐   | ▜   |     | ✿   |     | ↑   |     |     | ◀   | ▼   |
| 0x1_ | ▖   | ▌   | ▞   | ▛   | ▄   | ▙   | ▟   | █   |     |     |     | │   | ─   | ▶   | ⌐   |     |
| 0x2_ |     | !   | "   | #   | $   | %   | &   | '   | (   | )   | *   | +   | ,   | -   | .   | /   |
| 0x3_ | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | :   | ;   | <   | =   | >   | ?   |
| 0x4_ | @   | A   | B   | C   | D   | E   | F   | G   | H   | I   | J   | K   | L   | M   | N   | O   |
| 0x5_ | P   | Q   | R   | S   | T   | U   | V   | W   | X   | Y   | Z   | [   | \   | ]   | ^   | _   |
| 0x6_ | Ю   | А   | Б   | Ц   | Д   | Е   | Ф   | Г   | Х   | И   | Й   | К   | Л   | М   | Н   | О   |
| 0x7_ | П   | Я   | Р   | С   | Т   | У   | Ж   | В   | Ь   | Ы   | З   | Ш   | Э   | Щ   | Ч   | █   |

- 0x00-0x1F: block graphics and arrows (empty cells render as space)
- 0x20-0x3F: ASCII punctuation and digits
- 0x40-0x5F: ASCII uppercase Latin and symbols
- 0x60-0x7F: Russian uppercase (KOI-7 layout), 0x7F = full block

## Newline

Newline is CR+LF: 0Dh, 0Ah (two bytes in strings for puts).

## Program Loading

Programs are loaded at the address encoded in the binary filename (e.g., 0000h).
The assembler `org` directive sets the start address.
To run in the emulator: `bunx rk86 program.bin`.
