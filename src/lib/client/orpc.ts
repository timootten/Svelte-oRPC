import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { router } from '$lib/server/router'
import { DedupeRequestsPlugin } from '@orpc/client/plugins'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { testOrpc } from './live/pathtracker'
import { createQuery } from './query/queryWrapper'

const link = new RPCLink({
  url: 'http://localhost:5173/rpc',
  plugins: [
    new DedupeRequestsPlugin({
      filter: () => true, // Filters requests to dedupe
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

export const tsOrpc = createTanstackQueryUtils(orpc);

export const iOrpc = testOrpc(orpc);

export const client = createQuery(orpc);