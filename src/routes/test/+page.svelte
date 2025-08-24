<script lang="ts">
	import { orpc } from '$lib/client/orpc';
	import Timer from '../../components/Timer.svelte';
	import { live } from '../../lib/client/live.svelte';

	let timer = live(orpc.timer.live(), 'timer');

	const abc = 'sdsdsd';
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
