# File-force

Decentralized file sharing with:
* IPFS - decentralized file store (or network).
* Elliptic curve cryptography (curve: secp256k1)
* ECDH (shared keys), HKDF (key derivation function) and AES-256-CTR

#### License: LGPL-3.0

_package.json_
<pre>
   "dependencies": {
     "file-force": "https://github.com/ikonovalov/file-force.git"
   }
</pre>

_Usage_ 
<pre>
const CONFIG_PATH = './config/app.yml';
const config = require('yaml-config').readConfig(CONFIG_PATH);
const FileForce = require('file-force');
const fileForce = new FileForce(config);

// unlock keys
let account = '0x7116673528278887d37038d93bd749b66110ec35';
let password = '123321';
let selfKeyPair = fileForce.unlockKeys(account, password);

// encrypt file (AES) -> IPFS -> tag -> ecncrypt with ECDH + hKDF + AES -> ecTag -> IPFS
fileForce.add(
    path, 
    selfKeyPair, 
    selfKeyPair.publicKey, // for himself
    (ecTag, ecTagHash) => {
            console.log(`ecTag location /ipfs/${ecTagHash}`);
    }
);
</pre>