import { query } from "$lib/client/orpc"

export const load = async ({ isDataRequest }) => {

  return {
    list: isDataRequest ? undefined : await query.planet.list()
  }
}