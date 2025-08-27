<script lang="ts">
	import { iOrpc } from '$lib/client/orpc';

	const { abc } = $props<{ abc: string }>();

	//let timer = live(tOrpc.timer.live(), 'timer');

	let timer = iOrpc.timer.live();
</script>

<h2>Live Timer</h2>
{#if !timer.current}
	<p>Loading...</p>
{:else}
	<p>Current time: {timer.current}</p>
{/if}

<h1>{abc}</h1>

<button onclick={() => (timer.current = 'New Timer Text')}>Change Timer Text</button>
