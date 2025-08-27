import * as z from 'zod'
import { eventIterator, EventPublisher, os } from '@orpc/server';


const publisher = new EventPublisher<Record<string, { name: string }>>()

const planets: { name: string }[] = [];

export const listPlanets = os
  .route({
    method: 'GET',
    path: '/planets',
    summary: 'List all planets',
    tags: ['Planets'],
  })
  .output(z.array(z.object({ name: z.string() })))
  .handler(async () => {
    console.log('Fetching planets...');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return planets;
  })

export const livePlanets = os
  .route({
    method: 'GET',
    path: '/planets/live',
    summary: 'Live list of all planets',
    tags: ['Planets'],
  })
  .output(eventIterator(z.object({ name: z.string() }).or(z.array(z.object({ name: z.string() }))))) // Handle both single updates and full list
  .handler(async function* () {
    try {
      yield planets;
      for await (const payload of publisher.subscribe('planet.created')) {
        yield { name: payload.name }
      }
    } finally {
      console.log('Cleanup logic here')
    }
  })

export const livePlanets2 = os
  .route({
    method: 'GET',
    path: '/planets/live2',
    summary: 'Live list of all planets (v2)',
    tags: ['Planets'],
  })
  .output(eventIterator(z.string())) // Handle both single updates and full list
  .handler(async function* () {
    try {
      //yield "XXX";
      for await (const payload of publisher.subscribe('planet.created')) {
        yield payload.name;
      }
    } finally {
      console.log('Cleanup logic here')
    }
  })

export const createPlanet = os
  .route({
    method: 'POST',
    path: '/planets',
    summary: 'Create a planet',
    tags: ['Planets'],
  })
  .input(z.object({
    name: z.string().min(1).max(100),
  }))
  .output(z.object({
    success: z.boolean(),
  }))
  .handler(async ({ input }) => {
    planets.push({ name: input.name });
    publisher.publish('planet.created', { name: input.name });
    return {
      success: true,
    };
  })
