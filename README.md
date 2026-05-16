# ulid-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/ulid-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/ulid-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: generate and decode ULIDs. 128-bit identifiers that are sortable
by creation time and URL-safe — a good drop-in replacement for v4 UUIDs
when you want lexicographic ordering.

## Tools

- `generate` — `{ "ulid": "01HNXBM7PGZ9R8K2J4XQDV3T1A" }`. Optional `timestamp_ms` override.
- `decode` — split a ULID into `{ timestamp_ms, iso, randomness }`.

26 chars, Crockford base32 (no I/L/O/U). No external deps; randomness is
`crypto.randomBytes`.

## Configure

```json
{ "mcpServers": { "ulid": { "command": "npx", "args": ["-y", "@mukundakatta/ulid-mcp"] } } }
```

## License

MIT.
