const {createStore} = require('./dist');

(async () => {
	const store = await createStore({
		path: './storage.json',
		selfRepair: false
	});

	await store.set('name', 'John');

	console.log(await store.get('name'));
})();
