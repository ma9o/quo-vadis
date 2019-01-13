"use strict";

const WebRTCStar = require("libp2p-webrtc-star");
const WebSockets = require("libp2p-websockets");
const WebSocketStar = require("libp2p-websocket-star");
const Mplex = require("libp2p-mplex");
const SPDY = require("libp2p-spdy");
const SECIO = require("libp2p-secio");
const defaultsDeep = require("@nodeutils/defaults-deep");
const KadDHT = require("libp2p-kad-dht");
const libp2p = require("libp2p");

class Node extends libp2p {
  constructor(_options) {
    const wrtcStar = new WebRTCStar({ id: _options.peerInfo.id });
    const wsstar = new WebSocketStar({ id: _options.peerInfo.id });

    const defaults = {
      modules: {
        transport: [wrtcStar, WebSockets, wsstar],
        streamMuxer: [Mplex, SPDY],
        connEncryption: [SECIO],
        peerDiscovery: [wrtcStar.discovery, wsstar.discovery],
        dht: KadDHT
      },
      config: {
        peerDiscovery: {
          webRTCStar: {
            enabled: true
          },
          websocketStar: {
            enabled: true
          }
        },
        dht: {
          kBucketSize: 20
        },
        relay: {
          enabled: true,
          hop: {
            enabled: true,
            active: false
          }
        },
        EXPERIMENTAL: {
          dht: true,
          pubsub: false
        }
      },
      connectionManager: {
        maxPeers: 50
      }
    };

    super(defaultsDeep(_options, defaults));
  }
}

module.exports = Node;
