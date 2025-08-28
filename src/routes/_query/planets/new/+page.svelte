<script lang="ts">
	import { query } from '$lib/client/orpc';
	import { useQuery } from '$lib/client/query/hooks.svelte';

	const { data } = $props();

	let planets = useQuery(query.planet.list(), {
		initialValue: data.list,
		cacheTimeMs: 0
	});

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const name = formData.get('planet')?.toString();
		if (name) {
			await query.planet.create({ name });
		}
	};
</script>

<h2>List of Planets2</h2>
{#if planets.isLoading}
	<p>Loading...</p>
{:else}
	{#each planets.value as planet}
		<div>{planet.name}</div>
	{/each}
{/if}

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
