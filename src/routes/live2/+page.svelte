<script lang="ts">
	import { orpc } from '$lib/client/orpc';
	import { live } from '../../lib/client/live/live.svelte';

	let planet = live(orpc.planet.live2());

	const addPlanet = async (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const name = formData.get('planet')?.toString();
		if (name) {
			//await orpc.planet.create({ name });
			planet.current = name;
		}
	};
</script>

<h2>List of Planets2</h2>
<div>{planet.current}</div>

<form action="POST" onsubmit={addPlanet}>
	<input type="text" name="planet" placeholder="Add a new planet" />
	<button type="submit">Add Planet</button>
</form>
