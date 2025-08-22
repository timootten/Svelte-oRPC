import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { router } from '$lib/server/router'

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
})

export const orpc: RouterClient<typeof router> = createORPCClient(link)