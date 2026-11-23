// tiny-stack-vm-01: an interpreter for make.fun's tiny stack ISA (kit: generator/subject/ISA.md).
// Per instance: <id>/program.bin + <id>/input.bin in, <id>/stdout.bin and <id>/exit.txt out.
// Steps check in ISA order: step limit, pc range, opcode, immediate fit, stack needs, own traps.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STACK_MAX = 256, CALLS_MAX = 64, MEM_WORDS = 256, STEP_MAX = 1_000_000, OUT_MAX = 65_536;

/** Runs one program; returns its output bytes and exit code. */
function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const n = p.length;
  const S = new Int32Array(STACK_MAX); // data stack, S[sp-1] the top
  let sp = 0;
  const C = new Int32Array(CALLS_MAX);
  let csp = 0;
  const M = new Int32Array(MEM_WORDS);
  const buf = new Uint8Array(OUT_MAX);
  let olen = 0, ip = 0, pc = 0, steps = 0;
  const end = (code: number) => ({ out: buf.slice(0, olen), code });

  for (;;) {
    if (steps >= STEP_MAX) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = p[pc];
    steps++;
    switch (op) {
      case 0x00: // HALT
        return end(0);
      case 0x01: // PUSH8: sign-extended immediate byte
        if (pc + 1 >= n) return end(9);
        if (sp >= STACK_MAX) return end(3);
        S[sp++] = (p[pc + 1] << 24) >> 24;
        pc += 2;
        break;
      case 0x02: // PUSH32: the immediate word, little-endian
        if (pc + 4 >= n) return end(9);
        if (sp >= STACK_MAX) return end(3);
        S[sp++] = p[pc + 1] | (p[pc + 2] << 8) | (p[pc + 3] << 16) | (p[pc + 4] << 24);
        pc += 5;
        break;
      case 0x03: // POP
        if (sp < 1) return end(2);
        sp--; pc++;
        break;
      case 0x04: // DUP
        if (sp < 1) return end(2);
        if (sp >= STACK_MAX) return end(3);
        S[sp] = S[sp - 1]; sp++; pc++;
        break;
      case 0x05: { // SWAP
        if (sp < 2) return end(2);
        const t = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = t; pc++;
        break;
      }
      case 0x06: // OVER: copy of the second value
        if (sp < 2) return end(2);
        if (sp >= STACK_MAX) return end(3);
        S[sp] = S[sp - 2]; sp++; pc++;
        break;
      case 0x07: { // ROT: ( a b c -- b c a )
        if (sp < 3) return end(2);
        const a = S[sp - 3];
        S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = a; pc++;
        break;
      }
      // Binary ops: ( a b -- r ), b on top. MUL is the exact product's low 32 bits; DIVU/MODU/LTU
      // read operands as unsigned; shift counts use their low 5 bits only.
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        if (sp < 2) return end(2);
        const b = S[sp - 1], a = S[sp - 2];
        let r: number;
        if (op === 0x10) r = a + b; // ADD
        else if (op === 0x11) r = a - b; // SUB
        else if (op === 0x12) r = Math.imul(a, b); // MUL
        else if (op === 0x13) { // DIV: signed, truncated toward zero
          if (b === 0) return end(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) { // MOD: remainder takes the dividend's sign; x % -1 is 0
          if (b === 0) return end(4);
          r = b === -1 ? 0 : a % b;
        } else if (op === 0x15) { // DIVU
          if (b === 0) return end(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) { // MODU
          if (b === 0) return end(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b; // AND
        else if (op === 0x19) r = a | b; // OR
        else if (op === 0x1a) r = a ^ b; // XOR
        else if (op === 0x1c) r = a << (b & 31); // SHL
        else if (op === 0x1d) r = a >> (b & 31); // SHR (arithmetic)
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0; // SHRU (logical)
        else if (op === 0x20) r = a === b ? 1 : 0; // EQ
        else if (op === 0x21) r = a < b ? 1 : 0; // LT
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU
        S[sp - 2] = r;
        sp--; pc++;
        break;
      }
      case 0x17: // NEG
        if (sp < 1) return end(2);
        S[sp - 1] = -S[sp - 1]; pc++;
        break;
      case 0x1b: // NOT
        if (sp < 1) return end(2);
        S[sp - 1] = ~S[sp - 1]; pc++;
        break;
      // Jumps: pc = (next instruction's address) + signed offset; bad targets trap next step.
      case 0x30: case 0x31: case 0x32: { // JMP, JZ, JNZ
        if (pc + 2 >= n) return end(9);
        const rel = ((p[pc + 1] | (p[pc + 2] << 8)) << 16) >> 16;
        let take = op === 0x30;
        if (!take) {
          if (sp < 1) return end(2);
          const v = S[--sp];
          take = op === 0x31 ? v === 0 : v !== 0;
        }
        pc = take ? pc + 3 + rel : pc + 3;
        break;
      }
      case 0x33: // CALL: unsigned target
        if (pc + 2 >= n) return end(9);
        if (csp >= CALLS_MAX) return end(7);
        C[csp++] = pc + 3;
        pc = p[pc + 1] | (p[pc + 2] << 8);
        break;
      case 0x34: // RET
        if (csp === 0) return end(8);
        pc = C[--csp];
        break;
      case 0x40: { // LOAD
        if (sp < 1) return end(2);
        const addr = S[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        S[sp - 1] = M[addr]; pc++;
        break;
      }
      case 0x41: { // STORE: ( v addr -- )
        if (sp < 2) return end(2);
        const addr = S[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        M[addr] = S[sp - 2]; sp -= 2; pc++;
        break;
      }
      case 0x50: { // PRINT: the value in decimal ASCII
        if (sp < 1) return end(2);
        const s = String(S[sp - 1]);
        if (olen + s.length > OUT_MAX) return end(11); // writes none of its bytes
        for (let i = 0; i < s.length; i++) buf[olen++] = s.charCodeAt(i);
        sp--; pc++;
        break;
      }
      case 0x51: // PUTC: the value's low byte
        if (sp < 1) return end(2);
        if (olen + 1 > OUT_MAX) return end(11);
        buf[olen++] = S[--sp] & 255; pc++;
        break;
      case 0x52: // IN: the next input byte, or -1 past the end
        if (sp >= STACK_MAX) return end(3);
        S[sp++] = ip < inp.length ? inp[ip++] : -1; pc++;
        break;
      case 0x53: // EXIT: code is the value's low byte
        if (sp < 1) return end(2);
        return end(S[sp - 1] & 255);
      default: // a byte no opcode names
        return end(5);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(
    new Uint8Array(readFileSync(join(I, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(I, id, 'input.bin'))),
  );
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
