<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	import { onMount } from 'svelte';
	import { preloadData } from '$app/navigation';

	onMount(async () => {
		const modules = import.meta.glob('/src/routes/**/+page.svelte', { eager: true });
		const paths = Object.keys(modules).map(
			(file) =>
				file
					.replace('/src/routes', '')
					.replace('/+page.svelte', '')
					.replace(/\/index$/, '') || '/'
		);

		await Promise.all(paths.map((p) => preloadData(p)));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:boundary>
	<div>
		<h1>My App</h1>
		<a href="/timer">Timer</a>
		<a href="/live">Live1 Planets</a>
		<a href="/live2">Live2 Planets</a>
		<a href="/live3">Live3 Planets</a>
	</div>

	{#snippet failed(error)}
		<div>Error loading content: {(error as any).message}</div>
	{/snippet}
	{#snippet pending()}
		<div>Loading...</div>
	{/snippet}

	{@render children?.()}
</svelte:boundary>
