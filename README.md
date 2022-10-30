# ooo-client

[![Test](https://github.com/benitogf/ooo-client/actions/workflows/test.yml/badge.svg)](https://github.com/benitogf/ooo-client/actions/workflows/test.yml)

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/ooo-client.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/ooo-client

js client for [ooo](https://github.com/benitogf/ooo) though the service should be usable with the [standard websocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [http/fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) request method, this client provides encode/decode methods and a reconnecting websocket abstraction.

Messages will arrive either as a snapshot or a [patch](https://json-patch-builder-online.github.io/) the subscription keeps a cache of the latest state.

## how to

### install
```bash
npm i ooo-client
```

#### object
```js
import ooo from 'ooo-client'

const client = ooo('localhost:8800/box')
let msgs = []
client.onopen = async () => {
  await client.publish('box', { name: 'something 🧰' }) // create
  await client.publish('box', { name: 'still something 💾' }) // update
  await client.unpublish('box') // delete
}
client.onmessage = async (msg) => { // read
  msgs.push(msg)
  if (msgs.length === 4) {
    client.close()
    console.log(msgs)
  }
}
client.onerror = (err) => {
  client.close()
}
```

#### list
```js
import ooo from 'ooo-client'

const client = ooo('localhost:8800/box/*')
let msgs = []
client.onopen = async () => {
  const id = await client.publish('box/*', { name: 'something 🧰' }) // create
  await client.publish('box/' + id, { name: 'still something 💾' }) // update
  await client.publish('box/custom', { name: 'custom something 🧰' }) // create
  await client.unpublish('box/*') // delete list
}
client.onmessage = async (msg) => { // read
  msgs.push(msg)
  if (msgs.length === 5) {
    client.close()
    console.log(msgs)
  }
}
client.onerror = (err) => {
  client.close()
}
```



