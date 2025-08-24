<script lang="ts">
	import { live } from '$lib/client/live.svelte';
	import { orpc } from '$lib/client/orpc';

	const { abc } = $props<{ abc: string }>();

	let timer = live(orpc.timer.live());
</script>

<h2>Live Timer</h2>
{#if timer.current}
	<p>Current time: {timer.current}</p>
{:else}
	<p>Loading...</p>
{/if}

<h1>{abc}</h1>
