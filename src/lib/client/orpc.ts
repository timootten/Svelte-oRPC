import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { router } from '$lib/server/router'
import { DedupeRequestsPlugin } from './dedupe'

const link = new RPCLink({
  url: 'http://localhost:5173/rpc',
  plugins: [
    new DedupeRequestsPlugin({
      filter: ({ request }) => request.method === 'POST', // Filters requests to dedupe
      groups: [
        {
          condition: () => true,
          context: {}, // Context used for the rest of the request lifecycle
        },
      ],
    }),
  ],
})

export const orpc: RouterClient<typeof router> = createORPCClient(link)