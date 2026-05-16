#!/usr/bin/env node
/**
 * ulid MCP server. Two tools: `generate`, `decode`.
 *
 * ULIDs (Universally Unique Lexicographically Sortable Identifiers) are
 * 128-bit IDs encoded as 26-char Crockford base32: 10 chars of millisecond
 * timestamp + 16 chars of randomness. Sortable, URL-safe, monotonic.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { randomBytes } from 'node:crypto';

const VERSION = '0.1.0';

// Crockford base32 alphabet — no I/L/O/U.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeBase32(bigint: bigint, length: number): string {
  let n = bigint;
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(ALPHABET[Number(n & 31n)]);
    n >>= 5n;
  }
  return out.reverse().join('');
}

function decodeBase32(s: string): bigint {
  let n = 0n;
  for (const c of s) {
    const v = ALPHABET.indexOf(c.toUpperCase());
    if (v < 0) throw new Error('invalid base32 character: ' + c);
    n = n * 32n + BigInt(v);
  }
  return n;
}

/** Generate a fresh ULID for the given (or current) timestamp. */
export function generate(now: number = Date.now()): string {
  if (now < 0 || now > 281474976710655) throw new Error('timestamp out of range (48-bit ms)');
  const tsPart = encodeBase32(BigInt(now), 10);
  const rand = randomBytes(10); // 80 bits of randomness
  let n = 0n;
  for (const b of rand) n = (n << 8n) | BigInt(b);
  const randPart = encodeBase32(n, 16);
  return tsPart + randPart;
}

export interface DecodedUlid {
  ulid: string;
  timestamp_ms: number;
  iso: string;
  randomness: string;
}

export function decode(ulid: string): DecodedUlid {
  if (ulid.length !== 26) throw new Error('ULID must be 26 chars');
  const upper = ulid.toUpperCase();
  // Validate every char is in the Crockford base32 alphabet; decodeBase32
  // will throw on the first bad char, including in the randomness section.
  for (const c of upper) {
    if (ALPHABET.indexOf(c) < 0) throw new Error('invalid base32 character: ' + c);
  }
  const ts = upper.slice(0, 10);
  const rand = upper.slice(10);
  const tsMs = Number(decodeBase32(ts));
  return {
    ulid: upper,
    timestamp_ms: tsMs,
    iso: new Date(tsMs).toISOString(),
    randomness: rand,
  };
}

const server = new Server({ name: 'ulid', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'generate',
    description: 'Generate a fresh ULID. 26-char Crockford-base32: 10 chars timestamp + 16 chars random.',
    inputSchema: {
      type: 'object',
      properties: {
        timestamp_ms: { type: 'integer', description: 'Optional override; defaults to now.' },
      },
    },
  },
  {
    name: 'decode',
    description: 'Decode a ULID into timestamp (ms + ISO) and randomness parts.',
    inputSchema: {
      type: 'object',
      properties: { ulid: { type: 'string' } },
      required: ['ulid'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === 'generate') {
      const a = args as unknown as { timestamp_ms?: number };
      return jsonResult({ ulid: generate(a.timestamp_ms ?? Date.now()) });
    }
    if (name === 'decode') {
      const a = args as unknown as { ulid: string };
      return jsonResult(decode(a.ulid));
    }
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('ulid failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`ulid MCP server v${VERSION} ready on stdio\n`);
}
