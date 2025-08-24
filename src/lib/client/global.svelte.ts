import { orpc } from "./orpc";
import { createLiveQuery } from "./test.svelte";

export const globalTimer = createLiveQuery(orpc.timer.live())