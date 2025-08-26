<script lang="ts">
	import { orpc, tOrpc } from '$lib/client/orpc';
	import { onMount } from 'svelte';
	import { live } from '../../lib/client/live.svelte';

	let timer = live(orpc.timer.live());

	let time1;

	onMount(async () => {
		time1 = await orpc.timer.value();
	});

	let time2 = tOrpc.timer.value();
</script>

{time1}
{time2.current}

<h2>Live Timer</h2>
{#if timer.current}
	<p>Current time: {timer.current}</p>
{:else}
	<p>Loading...</p>
{/if}
