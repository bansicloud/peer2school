import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'
import { Emitter } from './lib/emitter'

const log = require('debug')('app:sync')

const doc = new Y.Doc()

class Sync extends Emitter {

  chat
  stream
  indexeddbPersistence
  webrtcProvider
  peerID
  doc

  streams = {}

  constructor({ room }) {
    super()

    const webrtcProvider = new WebrtcProvider('peer-school-' + room, doc, {
      filterBcConns: true,
    })

    webrtcProvider.on('peers', info => {
      let added = Array.from(info.added)
      for (let peerID of added) {
        let peer = this.getPeer(peerID)
        if (peer) {
          if (this.stream) {
            peer.peer.addStream(this.stream)
          }
          peer.peer.on('stream', stream => {
            this.streams[peerID] = stream
            this.emit('stream', { peerID, stream })
          })
        } else {
          console.warn('added peer but cannot find', peerID, info)
        }
      }
      this.emit('peers')
    })

    webrtcProvider.on('synced', info => {
      this.peerID = webrtcProvider.room.peerId
      this.emit('ready', { peerID: this.peerID })
    })

    //  const awareness = webrtcProvider.awareness

    const indexeddbPersistence = new IndexeddbPersistence('peer-school-' + room, doc)

    this.webrtcProvider = webrtcProvider
    this.indexeddbPersistence = indexeddbPersistence

    this.doc = doc
  }

  getWebRTCConns() {
    log('getWebRTCConns', this.webrtcProvider?.room?.webrtcConns)
    return this.webrtcProvider?.room?.webrtcConns
  }

  getPeers() {
    return Array.from(this.getWebRTCConns()?.values() || [])
  }

  getPeer(peerID) {
    return this.getWebRTCConns()?.get(peerID) || null
  }

  getPeerList() {
    try {
      return Array.from(this.getWebRTCConns()?.keys() || [])
    } catch (err) {
      console.warn('getPeerList err', err)
    }
    return []
  }

  getStream(peerID) {
    try {
      return this.streams[peerID]
    } catch (err) {
      console.warn('getStream err', err, peerID)
    }
    return null
  }

  setStream(stream) {
    this.stream = stream
    let currentPeers = this.getPeers()
    for (let peer of currentPeers) {
      peer.peer.addStream(stream)
    }
  }

}

export function setupSync({ room } = {}) {
  return new Sync({ room })
}
