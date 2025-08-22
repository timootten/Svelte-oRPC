import { RPCHandler } from '@orpc/server/fetch'
import { router } from '../../../lib/server/router'
import { onError } from '@orpc/server'
import type { RequestHandler } from '@sveltejs/kit'

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

const handle: RequestHandler = async ({ request }) => {

  const { response } = await handler.handle(request, {
    prefix: '/rpc',
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle