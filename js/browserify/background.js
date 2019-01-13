const protocol = "/chat/0.0.1";
const PeerInfo = require("peer-info");
const CID = require("cids");
const crypto = require("crypto");
const Pushable = require('pull-pushable')
const pull     = require('pull-stream')
const Node = require("./browser-bundle");

let connections = {};

let streams = {};   // cId => streams[]
let providers = {};   //  peerId => cId[]

let currentCID;
let providing = [];   

PeerInfo.create((err, peerInfo) => {
  if (err) return console.log("Could not create WebRTC node.", err);
  var id = peerInfo.id.toB58String();

  peerInfo.multiaddrs.add(
    `/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/ipfs/${id}`
  );

  const node = new Node({ peerInfo });
  node.idStr = id;

  node.on("peer:discovery", peerInfo => {
    let id = peerInfo.id.toB58String();
    if (connections[id]) return; // If we're already trying to connect to this peer, dont dial again

    console.log("Discovered peer:", id);

    connections[id] = true;
    node.dialProtocol(peerInfo, protocol, (err, conn) => {
      if (err) {
        // Prevent immediate connection retries from happening
        // and include a 10s jitter
        const timeToNextDial = 25 * 1000 + (Math.random(0) * 10000).toFixed(0);
        console.log("Failed to dial:", id);
        setTimeout(() => delete connections[id], timeToNextDial);
      }
    });
  });

  node.on("peer:connect", peer => {
    console.log("Got connection to: ", peer.id.toB58String());
  });

  node.on("peer:disconnect", peerInfo => {
    let id = peer.id.toB58String();
    delete connections[id];
    console.log("Lost connection to: " + id);
  });

  node.handle(protocol, (protocol, conn) => {
    let p = Pushable();
    pull(p, conn);

    // let id = conn.getPeerInfo().id.toB58String();
    if (!steams[currentCID].includes(p)){
      streams[currentCID].push(p);
    }

    pull(
      conn,
      pull.map(data => {
        return data.toString("utf8").replace("\n", "");
      }),
      pull.drain((data) => {
        let msg = {};
        msg.text = data;
        msg.time = Date.now();
        chrome.runtime.sendMessage(msg);
      })
    );
    
  });

  node.start(err => {
    if (err) return console.log("WebRTC not supported");
    console.log("Node is ready. ID: " + node.peerInfo.id.toB58String());
  });
});


chrome.runtime.onMessage.addListener((msg, sender, callback) => {
  streams[currentCID].forEach(p => {
    p.push(msg.text);
  });
});

// Search for other clients on the same url when tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    let url = tab.url;
    let cid = str2cid(url);

    if (!providing.includes(cid)) {
      node.contentRouting.provide(cid, err => {
        if (err) throw err;
        providing.push(cid);
      });
    }

    currentCID = cid;

    node.contentRouting.findProviders(cid, 100, (err, peers) => {
      if (err) throw err;
      let n = 0;
      peers.forEach(peer => {
        let id = peer.id.toB58String();
        if (!providers[id].includes(cid)) {
          if (providers[id] == null) {
            providers[id] = [];
          }
          providers[id].push(cid);
        }
        n = n + 1;
      });
      chrome.browserAction.setBadgeText(n.toString());
    });
  }
});

// Turn string into cid-friendly hash
function str2cid(url) {
  let hash = crypto
    .createHash("sha256")
    .update(url)
    .digest("base64");

  return new CID(hash);
}
