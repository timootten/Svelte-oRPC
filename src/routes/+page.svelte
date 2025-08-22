<script lang="ts">
	import { orpc } from '$lib/client/orpc';
	import { onMount } from 'svelte';

	let planets: string[] = [];

	onMount(() => {
		refresh();
	});

	const refresh = async () => {
		planets = await orpc.planet.list();
	};

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const planet = formData.get('planet')?.toString();
		if (planet) {
			await orpc.planet.create({ name: planet });
			await refresh();
		}
	};
</script>

<h2>List of Planets</h2>
{#each planets as planet}
	<div>{planet}</div>
{/each}

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
