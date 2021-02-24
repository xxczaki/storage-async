import {join} from 'path';
import {writeFile, readFile} from 'fs/promises';
import write from 'write-json-file';
import read from 'load-json-file';
import repair from 'jsonrepair';
import {JsonObject, JsonArray} from 'type-fest';

type JsonValue = string | number | boolean | JsonObject | JsonArray | null;

interface Options {
	path?: string;
	ttl?: number;
	resetOnFailure?: boolean;
}

interface InternalStructure {
	__timestamp: number;
	__ttl: number;
}

interface Handlers {
	set: (key: string, value: JsonValue) => Promise<void>;
	get: (key: string) => Promise<JsonValue | undefined>;
	has: (key: string) => Promise<boolean>;
	delete: (key: string) => Promise<void>;
	clear: () => Promise<void>;
}

const defaults = {
	path: join(__dirname, 'store.json'),
	ttl: 900_000, // 15 minutes
	resetOnFailure: true
};

/**
 * Creates a new store.
 *
 * @param {Options} options - Options object.
 * @return {Handlers} Store handlers (set of functions).
 *
 * @example
 * const store = await createStore();
 *
 * await store.set('name', 'John');
 */
export const createStore = async ({path, ttl, resetOnFailure}: Options = defaults): Promise<Handlers> => {
	// Check if file already exists (flag wx)
	try {
		await writeFile(path ?? defaults.path, `{"__timestamp": ${Date.now()}, "__ttl": ${ttl ?? defaults.ttl}}`, {flag: 'wx'});
	} catch {
		// Check if the file is corrupted
		try {
			await read(path ?? defaults.path);
		} catch {
			const content = await readFile(path ?? defaults.path, {encoding: 'utf-8'});

			// Attempt to repair the file
			try {
				await writeFile(path ?? defaults.path, repair(content));
			} catch {
				// If without success - reset it.
				if (resetOnFailure) {
					await writeFile(path ?? defaults.path, `{"__timestamp": ${Date.now()}, "__ttl": ${ttl ?? defaults.ttl}}`);
				} else {
					throw new SyntaxError(`The storage file (available at ${path ?? defaults.path}) is invalid or corrupted and could not be repaired.`);
				}
			}
		} finally {
			const data: InternalStructure | undefined = await read(path ?? defaults.path);

			// If the file's ttl has expired - reset it
			if (Date.now() - (data?.__timestamp ?? 0) > (data?.__ttl ?? 0)) {
				await writeFile(path ?? defaults.path,
					`{"__timestamp": ${Date.now()}, "__ttl": ${ttl ?? defaults.ttl}}`
				);
			}
		}
	}

	return {
		/**
		* Adds element to the store.
		*
		* @param {string} key - Key, used to access the element.
		* @param {JsonValue} value - A valid JSON value.
		* @return {void}
		*
		* @example
		* const store = await createStore();
		*
		* await store.set('name', 'John');
		*/
		set: async (key, _value) => {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			await write(path ?? defaults.path, {...data, [key]: _value});
		},
		/**
		* Tries to access a store element by its key.
		*
		* @param {string} key - Key, used to access the element.
		* @return {JsonValue} - A valid JSON value (or undefined, if not found)
		*
		* @example
		* const store = await createStore();
		*
		* await store.set('name', 'John');
	   	*
	   	* await store.get('name'); //=> 'John'
		*/
		get: async key => {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			return data[key] ?? undefined;
		},
		/**
		* Checks whether the element exists in the store.
		*
		* @param {string} key - Key, used to access the element.
		* @return {boolean}
		*
		* @example
		* const store = await createStore();
		*
		* await store.set('name', 'John');
	   	*
	   	* await store.has('name'); //=> true
		*/
		has: async key => {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			return typeof data[key] !== 'undefined';
		},
		/**
		* Removes the element from store.
		*
		* @param {string} key - Key, used to access the element.
		* @return {void}
		*
		* @example
		* const store = await createStore();
		*
		* await store.set('name', 'John');
	   	*
	   	* await store.delete('name');
		*/
		delete: async key => {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			const {[key]: value, ...rest} = data;

			await write(path ?? defaults.path, rest);
		},
		/**
		* Removes all elements from the store.
		*
		* @return {void}
		*
		* @example
		* const store = await createStore();
	   	*
	   	* await store.clear();
		*/
		clear: async () => {
			await write(path ?? defaults.path, {});
		}
	};
};
