// The twelve Reserve Warden personas (AUTOPILOT D2). Plain data with no browser imports, so the pipeline can use it too.
// The id matches the art file name `warden_<id>.png` (see src/art/wardens.ts).
export type WardenHabitat = 'wetland' | 'coast' | 'woodland' | 'farmland-upland' | 'garden' | 'raptors' | 'night'

export interface Persona {
  id: string
  name: string
  habitat: WardenHabitat
  /** One line, in their voice. */
  greeting: string
}

export const PERSONAS: readonly Persona[] = [
  { id: 'maud', name: 'Maud the Marsh Warden', habitat: 'wetland', greeting: 'Mind the boardwalk, love. The marsh is full of surprises today.' },
  { id: 'reg', name: 'Reg the Reedcutter', habitat: 'wetland', greeting: 'Reeds are cut and the paths are clear. Take your time and watch the water’s edge.' },
  { id: 'bev', name: 'Bev the Bait-digger', habitat: 'coast', greeting: 'Tide’s on the turn. Come and see who’s feeding on the mud.' },
  { id: 'tomasz', name: 'Tomasz the Tideline Counter', habitat: 'coast', greeting: 'I count every wader on this shore, and I’m always glad of another pair of eyes.' },
  { id: 'rowan', name: 'Rowan the Woodland Ranger', habitat: 'woodland', greeting: 'Quiet feet in the woods, please. The best birds don’t care for a fuss.' },
  { id: 'agnes', name: 'Agnes "Old Acorn"', habitat: 'woodland', greeting: 'I’ve watched these oaks for forty years and they still surprise me.' },
  { id: 'harold', name: 'Harold the Hedgelayer', habitat: 'farmland-upland', greeting: 'Good hedges, good birds. Have a look along the fence line.' },
  { id: 'sunita', name: 'Sunita the Stubble-field Surveyor', habitat: 'farmland-upland', greeting: 'The stubble fields are busy this time of year. Bring your binoculars.' },
  { id: 'pat', name: 'Pat the Park Keeper', habitat: 'garden', greeting: 'Welcome to the park. Even a small patch can hold a good bird.' },
  { id: 'fran', name: 'Feeder Fran', habitat: 'garden', greeting: 'Feeders are full and the kettle’s on. Pull up a seat and watch.' },
  { id: 'fergus', name: 'Fergus the Raptor Watcher', habitat: 'raptors', greeting: 'Look high, and keep looking. There’s always something up there.' },
  { id: 'olu', name: 'Olu "Owl-light"', habitat: 'night', greeting: 'Wait for the light to fade. The night shift is about to start.' },
]

export const personaById = (id: string): Persona | undefined => PERSONAS.find((p) => p.id === id)
