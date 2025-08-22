<script lang="ts">
	import { orpc } from '$lib/client/orpc';
	import { live } from '../../lib/client/live.svelte';

	let timer = live(orpc.timer.live());
</script>

<h2>Live Timer</h2>
<div>{timer.current}</div>
