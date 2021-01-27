import {join} from 'path';
import {writeFile, readFile} from 'fs/promises';
import write from 'write-json-file';
import read from 'load-json-file';
import repair from 'jsonrepair';

interface Options {
	path?: string;
	ttl?: number;
}

interface Handlers {
	set: (key: string, value: unknown) => Promise<void>;
	get: (key: string) => Promise<unknown>;
	delete: (key: string) => Promise<void>;
	clear: () => Promise<void>;
}

const defaults = {
	path: join(__dirname, 'store.json'),
	ttl: 900_000 // 15 minutes
};

/**
 * Creates a new storage
 *
 * @param {Options} options - Options object.
 * @return {Handlers} Storage handlers (set of functions).
 *
 * @example
 * format(new Date(2014, 1, 11), '{yyyy}-{MM}-{dd}') //=> '2014-01-11'
 */
export const createStore = async ({path, ttl}: Options = defaults): Promise<Handlers> => {
	// Check if file already exists (flag wx)
	try {
		await writeFile(path ?? defaults.path, `{"__timestamp": ${Date.now()}, "__ttl": ${ttl ?? defaults.ttl}}`, {flag: 'wx'});
	} catch {
		// Check if the file corrupted
		try {
			await read(path ?? defaults.path);
		} catch {
			const content = await readFile(path ?? defaults.path, {encoding: 'utf-8'});

			// Attempt to repair the file
			try {
				await writeFile(path ?? defaults.path, repair(content));
			} catch {
				await writeFile(path ?? defaults.path, `{"__timestamp": ${Date.now()}, "__ttl": ${ttl ?? defaults.ttl}}`);
			}
		} finally {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			if (Date.now() - data?.__timestamp > data?.__ttl) {
				await writeFile(path ?? defaults.path,
					`{"__timestamp": ${Date.now()}, "__ttl": ${ttl ?? defaults.ttl}}`
				);
			}
		}
	}

	return {
		set: async (key, _value) => {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			await write(path ?? defaults.path, {...data, [key]: _value});
		},
		get: async key => {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			return data[key] ?? undefined;
		},
		delete: async key => {
			const data = await read(path ?? defaults.path);

			// @ts-expect-error
			const {[key]: value, ...rest} = data;

			await write(path ?? defaults.path, rest);
		},
		clear: async () => {
			await write(path ?? defaults.path, {});
		}
	};
};
