import { eventIterator, os } from "@orpc/server";
import z from "zod";

export const live = os
  .route({
    method: 'GET',
    path: '/timer',
    summary: 'Live timer',
    tags: ['Timer'],
  })
  .output(eventIterator(z.string()))
  .handler(async function* () {
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      while (true) {
        yield new Date().toLocaleString('de-DE');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      console.log('Cleanup logic here')
    }
  })

export const value = os
  .route({
    method: 'GET',
    path: '/timer',
    summary: 'On time timer',
    tags: ['Timer'],
  })
  .output(z.string())
  .handler(async function () {
    return new Date().toLocaleString('de-DE');
  })