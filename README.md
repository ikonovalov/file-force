# File Force

Decentralized file sharing with:
* IPFS - decentralized file store (or network).
* Elliptic curve cryptography (curve: secp256k1)
* ECDH (shared keys), HKDF (key derivation function) and AES-256-CTR

#### License: [LGPL-3.0](https://github.com/ikonovalov/file-force/blob/master/LICENSE)

### Install 
_package.json_
```json
"dependencies": {
     "file-force": "https://github.com/ikonovalov/file-force.git"
}
```
   
```bash
> npm install
```

### Use in Node.js
Configuration _app.yml_ for _yaml-config_ module
```yaml
default:
  ipfs:
    api: /ip4/127.0.0.1/tcp/5001
    enable-eth: true
    advertising-level: medium
  eth:
    datadir: ~/.geth
    api: http://localhost:8545
    event-offset: 100

development:
  eth:
    datadir: /mnt/u110/ethereum/pnet1
    account: '0x7116673528278887d37038d93bd749b66110ec35'
    password: dlheu0
    mother-contract: '0x8bdfcef3d5ec77a77985d07925b05e5f9302b9a8'
```
Configure instance:
```javascript
const CONFIG_PATH = SOME_PATH + 'app.yml';
const config = require('yaml-config').readConfig(CONFIG_PATH);
const FileForce = require('file-force');
const fileForce = new FileForce(config);
```

Add file (_encrypt file (AES) -> IPFS -> tag -> ecncrypt with ECDH + hKDF + AES -> ecTag -> IPFS_):
```javascript
// unlock keys
let account = '0x7116673528278887d37038d93bd749b66110ec35';
let password = '123321';
let selfKeyPair = fileForce.unlockKeys(account, password);

// 
fileForce.add(path, selfKeyPair, selfKeyPair.publicKey)
         .then((result) => {
            let ipfsHash = result.hash;
            let ecTag = result.ecTag;
            console.log(`ecTag ${ipfsHash});         
            console.log(`${JSON.stringify(ecTag, null, 2)}`);
         })
         .catch(error => console.error(error));
```


###CLI usage

Add file
```bash
> bin$ ./cli ipfs add ../package.json 
Unlock ETH account 0x7116673528278887d37038d93bd749b66110ec35
File → QmaoF83opyhUW5jqhQUVJnmgqDHGgQZv6B51myqY8drAk3
ecTag stored in IPFS
ecTag → Qmc6ku6FQRWSwJfiy8NZhoEXPDvKjt46MBPVPNyUnmxjQ5 
ecTag:
{
  "ownerAddress": "0x7116673528278887d37038d93bd749b66110ec35",
  "partyAddress": "0x7116673528278887d37038d93bd749b66110ec35",
  "tag": "BF0SJEr+2OPJHv+0GjSxmrSR3ZevnxbSytfXKxbxeqKFvHZ1SVcILG7bmBXR/dr1qa2KQyU4bDCgmRo7GNv9+iKnWWkS05iTBkwSEI3Jjxr2Fo3xjXUqNNQ0WVOMqPx0yF4sc4aLvLj1Ln9ywCJ0Ht98AKW79T7SS/bLi9WFUVp/rXKFlr4k+FiEga57VucDsl6z+tVK37hbPiv3gk4cbfs3qLf1nYQsCcNxSTcBxTXIcG+04H9lue7ESe0Zhke1CTfQDnpPT+Xn+ruNmKFQ/xXZbQV7N+HiN6h+SiKCOJ08qA0VBZaIH5Y1esy8py9frkwnPKlHPG51Vy1tKjrsWVT2FRLTDHdCtJMjy+Ev6GgtnV02iuzR34BRRuqAJePOXHJnRNKOhg6tkrXRowaj9LYG99r21dY2fKGwqzT6XobJpTE0pxoPcwew99zE59PuUOXnQZeClnNVoUsBnakPe1x8euf0X7HMAFV5g7REhLi8WTafh7rSGbQaD3GiNYpkg0pbX+FSn7oSyTTRuq+7SG/Q+Sa9VIFEoQlmslhQV4S7zY6v/zSjL54Dan53myVjuied8ULM",
  "metadata": {
    "mimeType": "application/octet-stream",
    "filename": "package.json"
  },
  "tagEncryption": {
    "protocol": "ECDH",
    "ownerPublicKey": "0x0401eb187902aaa78b9e33b1c2ab1367a0af14c71ed8a0c8e81d1cc5abd80c0c2d54a92af2ca02909d25bbb662b4039d1c9240924c6442921942849f31c4c31adc",
    "kdf": {
      "name": "hkdf",
      "params": {
        "hashAgl": "sha256",
        "salt": "c14b29c48853954034e0631fe6ce72ed1c0c4b5ceb51664b4abc3f261fd14519",
        "info": "file-force",
        "size": 32
      }
    },
    "encryption": {
      "algorithm": "aes-256-ctr",
      "iv": "d223814dadfdb26d77d9af207159de87"
    }
  }
}

```

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