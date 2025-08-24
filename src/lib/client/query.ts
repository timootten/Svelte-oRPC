import { live } from "./live.svelte";
import { orpc } from "./orpc";

export const useTimer = () => live(orpc.timer.live());