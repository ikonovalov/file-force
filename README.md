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

_CLI usage_

Add file
<pre>
bin$ ./cli ipfs add test.txt
Prepare ETH account
File added to IPFS with tag:
{
  "algorithm": "aes-256-ctr",
  "iv": "d645db4e200c7fbb82c03d1143d25c81",
  "secret": "9fa.....41cc",
  "ipfsHash": "Qmeh........MNVY",
  "ipfsHashSign": "MEUCIQDeWv9BfW1yKSlke4v674pym3dXEjVTDuDxlOG45CYf3gIgIE+quJboOChlQ5U1Y5JvrK96TbPF26aQ+GPAymFIMOE="
}
Encrypting tag with ECDH using AES...
ecTag stored in IPFS
ecTag QmWr5AbnnpkfYiV88ioPcdpE7nPEUp5vCvrprwLCuKw8M5 → File Qmeh9DfGVyScvdMG8zW8hoJF9RWwY4gP55fwwTQLoYMNVY
</pre>

Cat ecTag (this is a public info)
<pre>
./cli ipfs cat QmWr5AbnnpkfYiV88ioPcdpE7nPEUp5vCvrprwLCuKw8M5 | jq
{
  "ownerAddress": "0x7116673528278887d37038d93bd749b66110ec35",
  "partyAddress": "0x7116673528278887d37038d93bd749b66110ec35",
  "tag": "HJnJi4qLMrJfOcseM3CyHQKQQqkNevGZQg95qY90/z8br6qo2RfdqDPTlhf3NC+MQ3kdHdEVhjnai//cqxa97qqONaEIrUCDp2SI8ZwKm594qnA/U7QVUcvDTY+GK5nDZ8gFvjQhWTj1RBigdYyknz8wHMI6WlAVrNMle5yZHJEOH+P6611dSU1oATtyPZz8EJ3tlmd4RJGgU0ySW2bnA/JpRrD7fUvgLif2uVo7xFaA1wE65KqmQe7P908rgzkrg4fPueWleDmmXyAN+haSXsfLSHNwaEey9V6JQTczNuevIuXh6BL4me0BGeq+368eb4Eq1wf/IPK89Me+WyWK2wBYtB+i+FRgXeS4Iq8E4iHbAjO0FAxoU1D3X6swoFsj6W40xV6TACVs9khP9rYT/1dfzJk0+vAsD07RVto=",
  "tagEncryption": {
    "protocol": "ECDH",
    "ownerPublicKey": "0x0401eb187902aaa78b9e33b1c2ab1367a0af14c71ed8a0c8e81d1cc5abd80c0c2d54a92af2ca02909d25bbb662b4039d1c9240924c6442921942849f31c4c31adc",
    "kdf": {
      "name": "hkdf",
      "params": {
        "hashAgl": "sha256",
        "salt": "241eb0f0bb6382f9a75791fdb70c13c37966a8acae56b3a5ea931779e4c8db77",
        "info": "file-force",
        "size": 32
      }
    },
    "encryption": {
      "algorithm": "aes-256-ctr",
      "iv": "832d46e0d6b4ce7b94670d7ec7406dc0"
    }
  }
}
</pre>

Decrypt tag and file with ecTag
<pre>
./cli ipfs decrypt QmWr5AbnnpkfYiV88ioPcdpE7nPEUp5vCvrprwLCuKw8M5
... file content in stdout
</pre>