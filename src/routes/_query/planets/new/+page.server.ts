import { client } from "$lib/client/orpc"

export const load = async ({ isDataRequest }) => {

  return {
    list: isDataRequest ? undefined : await client.planet.list()
  }
}