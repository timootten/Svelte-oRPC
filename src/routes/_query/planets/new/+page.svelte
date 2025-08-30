<script lang="ts">
	import { client } from '$lib/client/orpc';
	import { useQuery } from '$lib/client/query/hooks.svelte';
	import { onMount } from 'svelte';
	import { createPost, getPosts } from './posts.remote.js';

	const { data } = $props();

	let planets = useQuery(client.planet.list(), {
		initialValue: data.list,
		cacheTimeMs: 10000,
		staleTimeMs: 5000
	});

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const name = formData.get('planet')?.toString();
		if (name) {
			await client.planet.create({ name });
			await planets.refetch();
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
{#if planets.error}
	<p>Error loading planets: {planets.error.message}</p>
{/if}

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
