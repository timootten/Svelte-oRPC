<script lang="ts">
	import { client } from '$lib/client/orpc';
	import { onMount } from 'svelte';

	let planets = $state<Awaited<ReturnType<typeof client.planet.list>>>([]);

	onMount(async () => {
		planets = await client.planet.list();
	});

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const name = formData.get('planet')?.toString();
		if (name) {
			await client.planet.create({ name });
			planets = await client.planet.list();
		}
	};
</script>

<h2>List of Planets2</h2>
{#each planets as planet}
	<div>{planet.name}</div>
{/each}

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
