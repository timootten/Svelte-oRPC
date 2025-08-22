<script lang="ts">
	import { liveArray } from '$lib/client/live.svelte';
	import { orpc } from '$lib/client/orpc';

	let planets = liveArray(orpc.planet.live());

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const name = formData.get('planet')?.toString();
		if (name) {
			await orpc.planet.create({ name });
		}
	};
</script>

<h2>List of Planets3</h2>
{#each planets.current as planet}
	<div>{planet.name}</div>
{/each}

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
