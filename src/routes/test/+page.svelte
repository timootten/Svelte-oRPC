<script lang="ts">
	import { orpc, tOrpc } from '$lib/client/orpc';
	import Timer from '../../components/Timer.svelte';
	import { live } from '../../lib/client/live.svelte';

	let timer = tOrpc.timer.live();

	const abc = 'sdsdsd';

	console.log('aaaa', tOrpc.planet.create({ name: abc }));
</script>

<h2>Live Timer</h2>
{#if timer.current}
	<p>Current time: {timer.current}</p>
{:else}
	<p>Loading...</p>
{/if}

-------------------

<Timer {abc} />

-------------------

<Timer {abc} />
