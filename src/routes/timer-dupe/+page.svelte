<script lang="ts">
	import { orpc } from '$lib/client/orpc';
	import { live } from '../../lib/client/live/live.svelte';

	let timer = live(orpc.timer.live());

	let timer2 = live(orpc.timer.live());
</script>

<h2>Live Timer</h2>
{#if timer.current}
	<p>Current time: {timer.current}</p>
{:else}
	<p>Loading...</p>
{/if}

<h2>Live Timer 2</h2>
{#if timer2.current}
	<p>Current time: {timer2.current}</p>
{:else}
	<p>Loading...</p>
{/if}
