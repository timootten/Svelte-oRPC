<script lang="ts">
	import { live } from '$lib/client/live.svelte';
	import { orpc, tOrpc, tsOrpc } from '$lib/client/orpc';
	import { onMount } from 'svelte';

	const { abc } = $props<{ abc: string }>();

	//let timer = live(tOrpc.timer.live(), 'timer');

	let timer = tOrpc.timer.live();
</script>

<h2>Live Timer</h2>
{#if !timer.current}
	<p>Loading...</p>
{:else}
	<p>Current time: {timer.current}</p>
{/if}

<h1>{abc}</h1>

<button onclick={() => (timer.current = 'New Timer Text')}>Change Timer Text</button>
