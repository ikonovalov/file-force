# File Force

Decentralized file sharing with:
* [IPFS](https://ipfs.io/) - decentralized file store (or network).
* Elliptic curve cryptography (curve: [secp256k1](https://en.bitcoin.it/wiki/Secp256k1))
* [ECDH](https://en.wikipedia.org/wiki/Elliptic_curve_Diffie%E2%80%93Hellman), [HKDF](https://tools.ietf.org/html/rfc5869) and [AES-256](https://ru.wikipedia.org/wiki/Advanced_Encryption_Standard)-[CTR](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Counter_.28CTR.29)

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
    password: '123321'
    mother-contract: '0x8bdfcef3d5ec77a77985d07925b05e5f9302b9a8'
```
Configure instance:
```javascript
const CONFIG_PATH = SOME_PATH + 'app.yml';
const config = require('yaml-config').readConfig(CONFIG_PATH);
const FileForce = require('file-force');
const fileForce = new FileForce(config);
```

Unlock keys:
```javascript
let account = '0x7116673528278887d37038d93bd749b66110ec35';
let password = '123321';
let selfKeyPair = fileForce.unlockKeys(account, password);
```

Add file (_encrypt file (AES) -> IPFS -> tag -> encrypt with ECDH + hKDF + AES -> ecTag -> IPFS_):
```javascript
let path = '/tmp/some-your-file.txt';
fileForce.add(path, selfKeyPair, selfKeyPair.publicKey)
         .then((result) => {
            let ipfsHash = result.hash;
            let ecTag = result.ecTag;
            console.log(`ecTag ${ipfsHash}`);         
            console.log(`${JSON.stringify(ecTag, null, 2)}`);
         })
         .catch(error => console.error(error));
```
_// TODO: Add stream sample and JSON object sample_

### Using with CLI

####Help
```bash
> bin$ ./cli --help

  Usage: cli <command>


  Commands:

    account <subCommand> [arg]      Ethereum account operations.
    	 Subcommands:
    		 ls [balance]
    		 keys <index or address>
    ipfs <subCommand> <arg> [arg2]  IPFS files and tags operations.
    	 Subcommands: 
    		 add <file-path>
    		 cat <any-ipfs-hash>
    		 ecTag <ecTag-ipfs-hash>
    		 decryptEcTag <ecTag-ipfs-hash>
    		 decrypt <ecTag-ipfs-hash>
    		 delegate <ecTag-ipfs-hash> <party-pubkey>
    		 fwatch <filter>
    		 ecwatch <filter>
    		 ecdwatch <filter>
    config [subCmmand] [arg]        File-force configuration.
    	 Subcommand:
    		 show

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

####Add file
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

#### Decrypt 
```bash
> bin$ ./cli ipfs decrypt Qmc6ku6FQRWSwJfiy8NZhoEXPDvKjt46MBPVPNyUnmxjQ5 > /tmp/dec.out
Party account 0x7116673528278887d37038d93bd749b66110ec35. Unlock passphrase: ******
```

#### Delegate file
```bash
bin$ ./cli ipfs delegate Qmc6ku6FQRWSwJfiy8NZhoEXPDvKjt46MBPVPNyUnmxjQ5 04b7cb91f57ce522d7beea2927646d4056528b9abee0a9a285ff42e6f10d28ff8137a5f80e90388322dd0d1f195cd298e817e49cc11ee2fa29029566edf742f43f
Party account 0x7116673528278887d37038d93bd749b66110ec35.
Unlock account. Passphrase: ******
Origin ecTag Qmc6ku6FQRWSwJfiy8NZhoEXPDvKjt46MBPVPNyUnmxjQ5 delegated to 0xc80671754c3fcd934089e909a4f7c947acd517a1 with new ecTag Qmas1vomBYLzNk8292HiAawyHsPhW7d4ceHGGsLnai7jky
Transfer  0x7116673528278887d37038d93bd749b66110ec35 → 0xc80671754c3fcd934089e909a4f7c947acd517a1 complete.
```
#### Decrypt ecTag (unsecured)
```bash
bin$ ./cli ipfs decryptEcTag Qmc6ku6FQRWSwJfiy8NZhoEXPDvKjt46MBPVPNyUnmxjQ5
Party account 0x7116673528278887d37038d93bd749b66110ec35.
Unlock account. Passphrase: ******
{
  "algorithm": "aes-256-ctr",
  "iv": "f0fa6e090a6c61b23a77d400349acdae",
  "secret": "2e48ac1b9451735c6424844057cf518dd0a518b0599fa3407bc0c194fa456eb1",
  "ipfs": "QmaoF83opyhUW5jqhQUVJnmgqDHGgQZv6B51myqY8drAk3",
  "metadata": {
    "mimeType": "application/octet-stream",
    "filename": "package.json"
  },
  "signature": {
    "v": 1,
    "r": "c257be319d131a3456b2c41a14b894ec86416e0256b7c5ed44e7c951769c8008",
    "s": "e293331261774b0e0a7d6af5b2192d1d3d7843e9f57c0ace4ee2692f82b46620"
  }
}

```

### Harvester
Harvester watches an Ethereum blockchain for a new files and/or new ecTag events.
```bash
> bin$ ./harvester --help

File force harvester (IPFS-Ethereum)

  Listening FileForce's  IPFS activity in Ethereum 

Options

  --mode file|ectag|ecdtag   Switch to specified ethereum contract events. Default options. 
  --offset block             Listen from specified block                                    
  --scan-to block            Listen to specified block. Default is infinity.                
  --config config-path       Configuration file location.                                   
  --fail-fast                Crashes process on error 
```

## License
[LGPL-3.0](https://github.com/ikonovalov/file-force/blob/master/LICENSE)