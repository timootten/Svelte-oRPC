<script lang="ts">
	import { query } from '$lib/client/orpc';
	import { createQuery } from '@tanstack/svelte-query';

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const name = formData.get('planet')?.toString();
		if (name) {
			await query.planet.create({ name });
		}
	};

	const { data } = $props();

	const planets = createQuery({
		queryKey: ['planets'],
		queryFn: () => query.planet.list(),
		initialData: data.list,
		staleTime: 5000,
		gcTime: 0
	});
</script>

<h2>List of Planets2</h2>
{#if $planets.isLoading}
	<p>Loading...</p>
{/if}
{#if $planets.isSuccess}
	{#each $planets.data as planet}
		<div>{planet.name}</div>
	{/each}
{/if}

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
