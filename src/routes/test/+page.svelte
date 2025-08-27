<script lang="ts">
	import { iOrpc } from '$lib/client/orpc';
	import Timer from '../../components/Timer.svelte';

	let timer = iOrpc.timer.live();

	const abc = 'sdsdsd';

	console.log('aaaa', iOrpc.planet.create({ name: abc }));
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
