<script lang="ts">
	import { orpc } from '$lib/client/orpc';
	import { onMount } from 'svelte';

	let planets = $state<{ name: string }[]>([]);

	let liveIterator: AsyncIteratorObject<
		| {
				name: string;
		  }
		| {
				name: string;
		  }[],
		unknown,
		void
	>;

	const startIterator = async () => {
		liveIterator = await orpc.planet.live();

		for await (const data of liveIterator) {
			if (Array.isArray(data)) {
				planets = data;
			} else {
				planets = [...planets, data];
			}
		}
	};

	onMount(() => {
		startIterator();

		return () => {
			liveIterator?.return?.();
		};
	});

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const planet = formData.get('planet')?.toString();
		if (planet) {
			await orpc.planet.create({ name: planet });
		}
	};
</script>

<h2>List of Planets1</h2>
{#each planets as planet}
	<div>{planet.name}</div>
{/each}

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
