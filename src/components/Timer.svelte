<script lang="ts">
	import { live, liveCacheState } from '$lib/client/live.svelte';
	import { orpc } from '$lib/client/orpc';

	const { abc } = $props<{ abc: string }>();

	const timer = live(orpc.timer.live(), 'timer');
</script>

<h2>Live Timer</h2>
{#if !timer.current}
	<p>Loading...</p>
{:else}
	<p>Current time: {timer.current}</p>
{/if}

<h1>{abc}</h1>

<button onclick={() => (timer.current = 'New Timer Text')}>Change Timer Text</button>
