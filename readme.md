# Storage Async

> Lightweight, asynchronous, key-value JSON storage for Node.js applications. Supports TTL, atomic updates, self-repairing and more.

[![Build Status](https://github.com/xxczaki/storage-async/workflows/CI/badge.svg)](https://github.com/xxczaki/storage-async/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/xxczaki/storage-async/badge.svg?branch=master)](https://coveralls.io/github/xxczaki/storage-async?branch=master)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)
![minified size](https://img.shields.io/bundlephobia/minzip/storage-async)

This module aims to provide relatively lightweight and reliable way of locally storing JSON data, such as cache, preferences or temporary settings.

---

## Highlights

* **Lightweight.** About 30kB (minified and gzipped). Only 3 dependencies.
* **Reliable.** Uses atomic file updates and can self-repair from invalid manual changes.
* **Temporary.** Supports TTL (time-to-live).
* **Familiar API.** Uses the same API as the [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) object.
* **Well tested.** To make sure it handles various use cases correctly.
* **Written in TypeScript.**

## Install

```
$ npm install storage-async
```

## Usage

```ts
import {createStore} from 'storage-async';

(async () => {
	const store = await createStore();

	await store.set('name', 'John);
	await store.set('age', 20);

	await store.has('name'); //=> true

	await store.delete('age');

	await store.get('name'); //=> 'John'

	await store.clear();
})();
```

## API

### `createStore(options)`

Creates a new store, which features the following API:

```ts
interface Handlers {
	set: (key: string, value: unknown) => Promise<void>;
	get: (key: string) => Promise<unknown>;
	has: (key: string) => Promise<boolean>;
	delete: (key: string) => Promise<void>;
	clear: () => Promise<void>;
}
```

##### `options`

Type: `Options`

Storage options:

```ts
interface Options {
	path?: string;	// defaults to './store.json
	ttl?: number;	// defaults to 900000ms (15 minutes)
}
```

## How it works?

1) When the store file (`./store.json` by default) does not exist, it will be created automatically.
2) If the file can't be read (possibly due to invalid format), the module will attempt to repair it (to avoid data loss).
3) If the repairing process can't finish, the module will delete it and create a new one (possibly resulting in data loss).
4) If the file is valid and contains the information about TTL and creation time, the module will check whether the TTL hasn't yet expired.
5) The module will now be able to read/write data. Writing is done atomically, so that unexpected shutdowns won't corrupt the store file.

## License

MIT © [Antoni Kepinski](https://kepinski.me)
