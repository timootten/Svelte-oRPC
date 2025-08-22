import { createPlanet, listPlanets, livePlanets, livePlanets2 } from './planet'
import { live } from './timer'

export const router = {
  planet: {
    live: livePlanets,
    live2: livePlanets2,
    list: listPlanets,
    create: createPlanet,
  },
  timer: {
    live
  }
}