import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const STACK_MAX = 256, CALLS_MAX = 64, MEM_WORDS = 256, STEP_MAX = 1_000_000, OUT_MAX = 65_536;
/** Runs one program; returns its output bytes and exit code. */
function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const n = p.length;
  const S = new Int32Array(STACK_MAX);
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
      case 0x00:
        return end(0);
      case 0x01:
        if (pc + 1 >= n) return end(9);
        if (sp >= STACK_MAX) return end(3);
        S[sp++] = (p[pc + 1] << 24) >> 24;
        pc += 2;
        break;
      case 0x02:
        if (pc + 4 >= n) return end(9);
        if (sp >= STACK_MAX) return end(3);
        S[sp++] = p[pc + 1] | (p[pc + 2] << 8) | (p[pc + 3] << 16) | (p[pc + 4] << 24);
        pc += 5;
        break;
      case 0x03:
        if (sp < 1) return end(2);
        sp--; pc++;
        break;
      case 0x04:
        if (sp < 1) return end(2);
        if (sp >= STACK_MAX) return end(3);
        S[sp] = S[sp - 1]; sp++; pc++;
        break;
      case 0x05: {
        if (sp < 2) return end(2);
        const t = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = t; pc++;
        break;
      }
      case 0x06:
        if (sp < 2) return end(2);
        if (sp >= STACK_MAX) return end(3);
        S[sp] = S[sp - 2]; sp++; pc++;
        break;
      case 0x07: {
        if (sp < 3) return end(2);
        const a = S[sp - 3];
        S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = a; pc++;
        break;
      }
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        if (sp < 2) return end(2);
        const b = S[sp - 1], a = S[sp - 2];
        let r: number;
        if (op === 0x10) r = a + b;
        else if (op === 0x11) r = a - b;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) return end(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) {
          if (b === 0) return end(4);
          r = b === -1 ? 0 : a % b;
        } else if (op === 0x15) {
          if (b === 0) return end(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) {
          if (b === 0) return end(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        S[sp - 2] = r;
        sp--; pc++;
        break;
      }
      case 0x17:
        if (sp < 1) return end(2);
        S[sp - 1] = -S[sp - 1]; pc++;
        break;
      case 0x1b:
        if (sp < 1) return end(2);
        S[sp - 1] = ~S[sp - 1]; pc++;
        break;
      case 0x30: case 0x31: case 0x32: {
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
      case 0x33:
        if (pc + 2 >= n) return end(9);
        if (csp >= CALLS_MAX) return end(7);
        C[csp++] = pc + 3;
        pc = p[pc + 1] | (p[pc + 2] << 8);
        break;
      case 0x34:
        if (csp === 0) return end(8);
        pc = C[--csp];
        break;
      case 0x40: {
        if (sp < 1) return end(2);
        const addr = S[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        S[sp - 1] = M[addr]; pc++;
        break;
      }
      case 0x41: {
        if (sp < 2) return end(2);
        const addr = S[sp - 1];
        if (addr < 0 || addr >= MEM_WORDS) return end(6);
        M[addr] = S[sp - 2]; sp -= 2; pc++;
        break;
      }
      case 0x50: {
        if (sp < 1) return end(2);
        const s = String(S[sp - 1]);
        if (olen + s.length > OUT_MAX) return end(11);
        for (let i = 0; i < s.length; i++) buf[olen++] = s.charCodeAt(i);
        sp--; pc++;
        break;
      }
      case 0x51:
        if (sp < 1) return end(2);
        if (olen + 1 > OUT_MAX) return end(11);
        buf[olen++] = S[--sp] & 255; pc++;
        break;
      case 0x52:
        if (sp >= STACK_MAX) return end(3);
        S[sp++] = ip < inp.length ? inp[ip++] : -1; pc++;
        break;
      case 0x53:
        if (sp < 1) return end(2);
        return end(S[sp - 1] & 255);
      default:
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
