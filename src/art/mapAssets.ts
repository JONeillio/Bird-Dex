// Central lookup for map art (Bold Pixel drafts, converted from research/art-drafts/bold-pixel/expansion-v1/).
// Native sizes are the PNG sizes; show them at whole-number scales only. Anchors are where the real
// coordinate sits: the pin tip is the bottom centre of the file, the flag's pole foot is its bottom left.
// Scenery and the grass tile are ready for the Adventure skin (M4); they are decoration only and must not
// imply a real tree, path, access point or sighting.
const base = import.meta.env.BASE_URL + 'assets/map/'

export interface MapSprite {
  src: string
  w: number
  h: number
}

export const MAP_ART = {
  siteMarker: { src: `${base}markers/site.png`, w: 15, h: 20 },
  siteMarkerSelected: { src: `${base}markers/site-selected.png`, w: 16, h: 24 },
  targetFlag: { src: `${base}markers/target-flag.png`, w: 13, h: 16 },
  broadleafTree: { src: `${base}scenery/broadleaf-tree.png`, w: 30, h: 32 },
  coniferTree: { src: `${base}scenery/conifer-tree.png`, w: 22, h: 36 },
  bush: { src: `${base}scenery/bush.png`, w: 24, h: 17 },
  reeds: { src: `${base}scenery/reeds.png`, w: 23, h: 28 },
  grassTile: { src: `${base}patterns/grass.png`, w: 64, h: 64 },
} satisfies Record<string, MapSprite>

/** Image tag for a sprite at an integer scale. */
export function spriteImg(s: MapSprite, scale = 2, cls = ''): string {
  return `<img class="${cls}" src="${s.src}" width="${s.w * scale}" height="${s.h * scale}" alt="" draggable="false">`
}
