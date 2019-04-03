// Import types and APIs from graph-ts
import {
  Address,
  Bytes,
  ByteArray,
  JSONValue,
  TypedMap,
  crypto,
  ipfs
} from "@graphprotocol/graph-ts";

// Import event types from the registry contract ABI
import {
  NewOwner,
  Transfer as TransferEvent,
  NewResolver,
  NewTTL
} from "./types/ENSRegistry/EnsRegistry";

// Import entity types generated from the GraphQL schema
import { Domain, Account, Name } from "./types/schema";

// Preimage files on IPFS
let PREIMAGE_FILES = new TypedMap<string, string>();
PREIMAGE_FILES.set("0", "QmcGZPL7S5rUsb5KSH8sex5mGCEpymdvDFRwKynkhPZhKy");
PREIMAGE_FILES.set("1", "Qmb8yamzuAbDPJUbZHkDXj3WXa9ASrKs9n69nNf9hkSNm3");
PREIMAGE_FILES.set("2", "QmfYFzezs5S41oVrZj3DKVKED22NPiKwyvCt467uLTp5bu");
PREIMAGE_FILES.set("3", "QmQUN5iqxvTzBFVKaBwtxoDUP54MHnWaB7dpqV7bfTLFyy");
PREIMAGE_FILES.set("4", "QmbKEs2pj6ScZPYeichhbudTesAXdwKsKJ47BUQPTWqX7W");
PREIMAGE_FILES.set("5", "QmQTYxL2rqgpVRTYK4kgLupo8yb4kgkAHcCL5y8hUF4Mz2");
PREIMAGE_FILES.set("6", "QmYRRuKk2BXTiFxPZcXqrgfhqmMDtk5FmY3JoptbhfdHpZ");
PREIMAGE_FILES.set("7", "QmSQcsKrsbEeMD4PArDXtsTHRA8Z6dxGpFrqsuaRUk9EJ8");
PREIMAGE_FILES.set("8", "QmfWBAngtYvmBHPbez9YjjDXYPVjhscSWAa8mvk7nC8JtB");
PREIMAGE_FILES.set("9", "QmZmmUvt82dF55LfTAD4E93q6QFaozCpKx8mzYrnrRSTKk");
PREIMAGE_FILES.set("a", "QmPn52jVh47ZToBJVcqTLH2Ym79MJbhTFb1SVWXCCZaPqq");
PREIMAGE_FILES.set("b", "QmcMN6B6nsaJEoskHiRF8vKqMu9v7NYYuWqb61wa7TRGTw");
PREIMAGE_FILES.set("c", "QmZLewFrRkc5jaeGMShfpraTQn7acLsy9NpMyVPgKVutLn");
PREIMAGE_FILES.set("d", "QmR6ozprbbKjsnYswtpFQrBJHoEC61hC29FvHTWsXKDcdz");
PREIMAGE_FILES.set("e", "QmaRJeTebMgSPEREozxzEK8TthMc55Y1EBr849bSqUZkgV");
PREIMAGE_FILES.set("f", "QmP1qwT3VonQr457gvXHihWkrR2xSL5wW7YWgcBBzdogh9");

function maybeImportPreimageFile(hash: Bytes): void {
  let id = hash.toHex();
  let preimage = Name.load(id);
  if (preimage !== null) {
    return;
  }

  let nybble = id[2];
  let preimageFile = PREIMAGE_FILES.get(nybble);
  ipfs.map(preimageFile, "handlePreimageLine", ["json"]);
}

export function handlePreimageLine(value: JSONValue): void {
  let obj = value.toObject();
  let text = obj.get("t").toString();
  let name = new Name(text);
  name.save();
}

// Handler for NewOwner events
export function newOwner(event: NewOwner): void {
  let subnode = crypto
    .keccak256(concat(event.params.node, event.params.label))
    .toHex();

  let account = new Account(event.params.owner.toHex());
  account.save();

  maybeImportPreimageFile(event.params.label);

  let domain = new Domain(subnode);
  domain.owner = account.id;
  domain.parent = event.params.node.toHex();
  domain.labelhash = event.params.label;
  domain.save();
}

// Handler for Transfer events
export function transfer(event: TransferEvent): void {
  let node = event.params.node.toHex();

  // // Create transfer if it does not exists yet
  // let transfer = store.get('Transfer', domainId) as Transfer | null
  // if (transfer == null) {
  //   transfer = new Transfer()
  //   transfer.domain = domainId
  //   transfer.owners = new Array<Bytes>()
  // }
  //
  // // Add the new owner to the list of historical owners of the domain
  // let owners = transfer.owners
  // owners.push(event.params.owner)
  // transfer.owners = owners

  let account = new Account(event.params.owner.toHex());
  account.save();

  // Update the domain owner
  let domain = new Domain(node);
  domain.owner = account.id;
  domain.save();
}

// Handler for NewResolver events
export function newResolver(event: NewResolver): void {
  let node = event.params.node.toHex();

  let domain = new Domain(node);
  domain.resolver = event.params.resolver;
  domain.save();
}

// Handler for NewTTL events
export function newTTL(event: NewTTL): void {
  let node = event.params.node.toHex();

  let domain = new Domain(node);
  domain.ttl = event.params.ttl as i32;
  domain.save();
}

// Helper for concatenating two byte arrays
function concat(a: ByteArray, b: ByteArray): ByteArray {
  let out = new Uint8Array(a.length + b.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i];
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j];
  }
  return out as ByteArray;
}
