import { query } from "$lib/client/orpc"

export const load = async ({ depends, isDataRequest }) => {

  depends("tsquery:planets");

  return {
    list: isDataRequest ? undefined : await query.planet.list()
  }
}