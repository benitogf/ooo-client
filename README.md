# ooo-client

[![Test](https://github.com/benitogf/ooo-client/actions/workflows/test.yml/badge.svg)](https://github.com/benitogf/ooo-client/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/ooo-client.svg?style=flat-square)](https://www.npmjs.com/package/ooo-client)

JavaScript client for the [ooo](https://github.com/benitogf/ooo) ecosystem. Provides encode/decode methods and a reconnecting WebSocket abstraction.

## Features

- **Reconnecting WebSocket** with automatic retry
- **JSON patch support** for efficient updates
- **State caching** for latest subscription data
- **Works with standard APIs** (WebSocket, fetch)

## Installation

```bash
npm i ooo-client
```

## Usage

### Single Object

```js
import ooo from 'ooo-client'

const client = ooo('localhost:8800/box')

client.onopen = async () => {
  await client.publish('box', { name: 'something 🧰' })    // create
  await client.publish('box', { name: 'updated 💾' })      // update
  await client.unpublish('box')                         // delete
}

client.onmessage = (msg) => {
  console.log('received:', msg)
}

client.onerror = (err) => {
  console.error('error:', err)
  client.close()
}
```

### List (Glob Pattern)

```js
import ooo from 'ooo-client'

const client = ooo('localhost:8800/items/*')

client.onopen = async () => {
  const id = await client.publish('items/*', { name: 'item 1' })  // create
  await client.publish('items/' + id, { name: 'updated' })        // update
  await client.publish('items/custom', { name: 'custom item' })   // create with key
  await client.unpublish('items/*')                               // delete all
}

client.onmessage = (items) => {
  console.log('items:', items)
}

client.onerror = (err) => {
  console.error('error:', err)
  client.close()
}
```

## Message Format

Messages arrive as either:
- **Snapshot**: Full state on initial connection
- **Patch**: [JSON Patch](https://json-patch-builder-online.github.io/) for incremental updates

The client maintains a cache of the latest state.

## Related Projects

- [ooo](https://github.com/benitogf/ooo) - Main server library (Go)
- [ko](https://github.com/benitogf/ko) - Persistent storage adapter
- [auth](https://github.com/benitogf/auth) - JWT authentication
- [mono](https://github.com/benitogf/mono) - Full-stack boilerplate



