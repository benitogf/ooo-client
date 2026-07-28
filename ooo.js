// https://github.com/daviddoran/typescript-reconnecting-websocket/blob/master/reconnecting-websocket.ts
import { applyPatch } from 'fast-json-patch'
import ky from 'ky'

// https://stackoverflow.com/questions/49123222/converting-array-buffer-to-string-maximum-call-stack-size-exceeded
const binaryStringToString = (buf) => {
    const dataView = new DataView(buf)
    const decoder = new TextDecoder('utf8')
    return decoder.decode(dataView)
}

const binaryStringToObject = (buf) => JSON.parse(binaryStringToString(buf))

const binaryStringToInt = (buf) => parseInt(binaryStringToString(buf))

const patch = (msg, cache) => {
    if (msg.snapshot) {
        return msg.data
    }

    // mutateDocument: false -> a failed patch leaves `cache` untouched (all-or-nothing).
    // fast-json-patch v3 signature: applyPatch(document, patch, validateOperation, mutateDocument)
    return applyPatch(cache, msg.data, undefined, false).newDocument
}

const noop = (_e) => { }

const _ooo = {
    // cache
    cache: null,
    version: null,
    // Time to wait before attempting reconnect (after close)
    reconnectInterval: 3000,
    // Time to wait for WebSocket to open (before aborting and retrying)
    timeoutInterval: 5000,
    // Should only be used to read WebSocket readyState
    readyState: null,
    // Whether WebSocket was forced to close by this client
    forcedClose: false,
    // Whether WebSocket opening timed out
    timedOut: false,
    // List of WebSocket sub-protocols
    protocols: [],
    // The underlying WebSocket
    ws: null,
    wsUrl: null,
    httpUrl: null,
    mode: null,
    bound: false,
    frozen: false,
    // Set up the default 'noop' event handlers
    onopen: noop,
    onclose: noop,
    onconnecting: noop,
    onmessage: noop,
    onerror: noop,
    onfrozen: noop,
    onresume: noop,

    _time(event) {
        this.onmessage(binaryStringToInt(event.data))
    },

    _data(event) {
        let nextVersion
        let nextCache
        try {
            const msg = binaryStringToObject(event.data)
            nextVersion = msg.version
            nextCache = patch(msg, this.cache)
        } catch (err) {
            // a failed patch (or decode) must resync, never corrupt the cache.
            // resync BEFORE notifying: recovery must not depend on the consumer
            // callback (a throwing onerror must not leave the subscription frozen).
            // clear version so the redial carries no ?v= and the server answers
            // with a full snapshot, then drive the client's forced-reconnect path.
            this.cache = null
            this.version = null
            this.close(true)
            this.onerror(err)
            return
        }
        // commit only on success
        this.version = nextVersion
        this.cache = nextCache
        this.onmessage(this.cache)
    },

    _onfrozen(event) {
        this.frozen = true
        if (this.ws) {
            this.readyState = WebSocket.CLOSING
            this.ws.close()
        }
        this.onfrozen(event)
    },

    _onresume(event) {
        document.removeEventListener('resume', this._boundOnResume)
        this.connect(false, true)
        this.frozen = false
        this.onresume(event)
    },

    connect(reconnectAttempt, resuming) {
        const versionUrl = (reconnectAttempt || resuming) && this.version ? '?v=' + this.version : ''
        this.ws = new WebSocket(this.wsUrl + versionUrl, this.protocols)
        this.ws.binaryType = "arraybuffer"

        this.onconnecting()

        const localWs = this.ws
        const timeout = setTimeout(
            () => {
                this.timedOut = true
                localWs.close()
                this.timedOut = false
            },
            this.timeoutInterval)

        this.ws.onopen = (event) => {
            clearTimeout(timeout)
            this.readyState = WebSocket.OPEN
            reconnectAttempt = false
            this.onopen(event)
        }

        this.ws.onclose = (event) => {
            clearTimeout(timeout)
            if (this.forcedClose || this.frozen) {
                this.readyState = WebSocket.CLOSED
                this.ws = null
                document.removeEventListener('freeze', this._boundOnFrozen)
                this.onclose(event)
                return
            }

            this.readyState = WebSocket.CONNECTING
            this.onconnecting()
            if (!reconnectAttempt && !this.timedOut) {
                this.onclose(event)
            }
            setTimeout(
                () => {
                    this.connect(true)
                },
                this.reconnectInterval)
        }

        this.ws.onmessage = (event) => this.mode == 'time' ? this._time(event) : this._data(event)
        this.ws.onerror = this.onerror


        if (!this.bound) {
            this._boundOnFrozen = this._onfrozen.bind(this)
            this._boundOnResume = this._onresume.bind(this)
            this.bound = true
        }

        // https://wicg.github.io/page-lifecycle/spec.html#html-task-source-dfn
        document.addEventListener('freeze', this._boundOnFrozen, { capture: true, once: true })
        document.addEventListener('resume', this._boundOnResume, { capture: true })
    },

    close(reload) {
        if (this.ws) {
            this.forcedClose = !reload
            this.readyState = WebSocket.CLOSING
            this.ws.close()
            return true
        }
        return false
    },

    async stats() {
        return ky.get(this.httpUrl).json()
    },
    async get(key) {
        const data = await ky.get(this.httpUrl + '/' + key).json()
        return data
    },
    async publish(key, data) {
        const res = await ky.post(
            this.httpUrl + '/' + key, {
            json: data
        }
        ).json()

        return res.index
    },
    async unpublish(key) {
        return ky.delete(this.httpUrl + '/' + key)
    }
}
export default function (url, ssl, protocols = []) {
    let e = Object.assign({}, _ooo)
    if (url !== undefined) {
        let urlSplit = url.split('/')
        e.domain = urlSplit[0]
        // single entry
        e.mode = 'sa'
        if (url.indexOf('*') !== -1) {
            // entry list
            e.mode = 'mo'
        }
        if (urlSplit.length === 1) {
            // clock
            e.mode = 'time'
        }
        let wsProtocol = ssl ? 'wss://' : 'ws://'
        let httpProtocol = ssl ? 'https://' : 'http://'
        e.httpUrl = httpProtocol + e.domain
        e.wsUrl = wsProtocol + url
        e.protocols = protocols
        e.readyState = WebSocket.CONNECTING
        e.connect(false) // initialize connection
        return e
    }

    return e
}


