# Bird portrait batches for ChatGPT (Bold Pixel)

Written 8 Nov 2026. 92 Starter Dex birds still use generated placeholders. They are split into 10 batches, ordered by how often Lewis and Joseph will meet them (everyday birds first, summer visitors last because it's November).

## How Joseph uses this

1. Open ChatGPT (use the newest image model it offers; switch on thinking or reasoning if it's an option). Use the same chat as the earlier Bold Pixel birds if you still have it. Otherwise attach `robin_bold_pixel_draft_v1.png`, `kingfisher_bold_pixel_draft_v1.png` and `selected_style_reference.jpg` from the repo (`research/art-drafts/bold-pixel/`).
2. Paste the **style block** below, then one **batch block**.
3. Ask for one PNG per bird. If ChatGPT can only make one image per message, say "next" until the batch is done.
4. Ask it to put them in a flat ZIP with the manifest (the style block explains how), then upload the ZIP here. Claude converts it and puts the birds in the app.
5. Check every bird looks like its species before uploading. Lewis will notice mistakes.

## Style block (paste first, every time)

```
You're making portrait sprites for Bird-Dex, a retro pixel-art birdwatching app. Match the attached Bold Pixel robin and kingfisher exactly in style: chunky square pixel clusters, a strong dark outline (near-black green #213B32), high contrast, bright but natural species colours, clear readable silhouette, simple 2–3 tone shading, no gradients, no anti-aliasing, no dithering noise.

Rules for every image:
- One bird, adult, full body including feet, side or three-quarter view, facing the same way as the robin.
- Transparent background. No ground, perch, water, shadow, text, frame or border. (Only the birds marked "in flight" are drawn flying.)
- Square image, bird centred and filling about 85% of the height, the same framing as the robin.
- Draw for a 64×64 final sprite: big simple shapes, and every identification feature listed must still read when shrunk to 64 pixels.
- Species accuracy matters more than style: use the field marks I give exactly. Do not invent markings.
- File name: bird_<id>_bold_pixel_v1.png using the id I give (keep the hyphens).

When the batch is done, give me a flat ZIP (no folders) containing the PNGs plus asset_manifest.json:
{"pack": "Bird-Dex Bold Pixel batch NN", "assets": [{"id": "<id>", "file": "bird_<id>_bold_pixel_v1.png", "role": "<one line: plumage shown>"}]}
```

## Batch blocks

Paste one of these after the style block. Ids match the app's Starter Dex exactly.

### Batch 01: everyday garden and park birds

```
Batch 01. Ten birds:
1. common-wood-pigeon (Woodpigeon): plump blue-grey pigeon, white neck patch with green-purple gloss above it, pinkish breast, white bar along the edge of the closed wing, pale yellow eye, small orange-red bill with white base.
2. eurasian-magpie (Magpie): black and white; black head, breast and back with blue-green gloss on wings and the long graduated tail; white belly and white shoulder patches.
3. carrion-crow (Carrion Crow): entirely glossy black, heavy black bill with feathered base, no grey anywhere.
4. black-headed-gull (Black-headed Gull): breeding plumage: chocolate-brown hood (not black) with a thin white eye-crescent, dark red bill and legs, pale grey back, white body, black wingtips.
5. house-sparrow (House Sparrow), male: grey crown, chestnut behind the eye and nape, black bib, pale grey cheeks, streaked brown back, one white wing bar, stout dark bill.
6. common-starling (Starling): glossy black with purple-green iridescence and small pale spots, pointed yellow bill, short tail, pinkish legs.
7. common-chaffinch (Chaffinch), male: blue-grey crown and nape, pinkish-orange face and breast, chestnut back, two bold white wing bars, greenish rump.
8. european-goldfinch (Goldfinch): red face, black-and-white head, warm beige body, black wings with a broad bright yellow bar, pale pointed bill.
9. dunnock (Dunnock): blue-grey head and breast, warm brown back with dark streaks, streaked flanks, thin dark pointed bill (not a sparrow's thick bill), reddish eye, pink legs.
10. long-tailed-tit (Long-tailed Tit): tiny round body with a very long black-and-white tail, white head with a broad black stripe above the eye, pink shoulders and pink wash on the belly, tiny stubby bill.
```

### Batch 02: lakes and rivers

```
Batch 02. Ten birds:
1. eurasian-coot (Coot): all sooty black, white bill and white forehead shield, red eye, grey-green lobed toes.
2. common-moorhen (Moorhen): dark slate body, red forehead shield and red bill with a yellow tip, white line along the flank, white under the tail, green legs.
3. canada-goose (Canada Goose): big brown-grey goose, black head and long black neck, white chin strap, pale breast, black tail.
4. tufted-duck (Tufted Duck), male: black with clean white flanks, drooping tuft on the back of the head, bright yellow eye, blue-grey bill with black tip.
5. great-cormorant (Cormorant): large, dark with bronze scaly wings, long hooked bill, white cheek and throat patch, yellow skin at the bill base; standing with wings half spread to dry.
6. little-grebe (Little Grebe): small round grebe with a fluffy rear, breeding: chestnut cheeks and neck, dark brown body, pale yellow-green spot at the bill base.
7. great-crested-grebe (Great Crested Grebe), breeding: long white neck and face, black crest, orange-chestnut and black frills on the cheeks, pinkish dagger bill, brown back.
8. herring-gull (Herring Gull), adult: large, pale grey back, black wingtips with white spots, yellow bill with a red spot, pink legs, pale yellow eye.
9. greylag-goose (Greylag Goose): big grey-brown goose, thick orange bill, pink legs, pale barring on the flanks.
10. gadwall (Gadwall), male: finely patterned grey body, plain brownish head, black rear end, small white wing patch, dark bill.
```

### Batch 03: more garden and town birds

```
Batch 03. Nine birds:
1. eurasian-collared-dove (Collared Dove): pale sandy pinkish-grey, thin black half-collar on the back of the neck edged white, dark red eye, darker wingtips.
2. rock-dove-feral-pigeon (Feral Pigeon), classic rock dove pattern: blue-grey, two black wing bars, iridescent green-purple neck, orange eye.
3. western-jackdaw (Jackdaw): small crow, black with a grey nape and neck shawl, striking pale silver eye, short bill.
4. eurasian-jay (Jay): pinkish-brown body, bright blue patch barred black and white on the wing, black moustache stripe, pale streaked crown, black tail, white rump.
5. coal-tit (Coal Tit): small; black cap and black bib, white patch on the back of the neck (key mark), white cheeks, olive-grey back, buff underparts, two white wing bars.
6. european-greenfinch (Greenfinch), male: olive green with bright yellow flashes on the wing edge and tail sides, stout pale pink bill.
7. song-thrush (Song Thrush): warm brown back, white underparts with neat dark arrowhead spots, buff wash on the breast.
8. white-wagtail-pied-wagtail (Pied Wagtail, British form), male: black back, black crown and bib, white face, long black tail with white edges, white wing bars.
9. goldcrest (Goldcrest): tiny, olive green, bright yellow-and-orange crown stripe edged black, plain face with a big dark eye, two pale wing bars.
```

### Batch 04: winter visitors and winter ducks

```
Batch 04. Nine birds:
1. redwing (Redwing): small thrush, bold cream stripe over the eye, rusty red patch on the flank under the wing, streaked breast, brown back.
2. fieldfare (Fieldfare): grey head and grey rump, chestnut-brown back, dark tail, orange-buff breast covered in dark chevrons, pale stripe over the eye.
3. eurasian-teal (Teal), male: small duck, chestnut head with a broad green eye patch outlined cream, grey body with a white side stripe, yellow triangle under the tail.
4. eurasian-wigeon (Wigeon), male: chestnut head with a cream-yellow forehead stripe, pinkish breast, grey body, white patch near the rear, black stern, small blue-grey bill.
5. northern-shoveler (Shoveler), male: huge spoon-shaped bill, dark green head, yellow eye, white breast, chestnut flanks.
6. common-pochard (Pochard), male: chestnut-red head, red eye, black breast, pale grey body, black rear, dark bill with a grey band.
7. common-goldeneye (Goldeneye), male: black head with green gloss and a peaked crown, round white spot between eye and bill, yellow eye, white body, black-and-white striped back.
8. goosander (Goosander), male: long slim red bill with hooked tip, dark green head (looks black), creamy white body with a salmon tint, black back.
9. mew-gull (Common Gull): medium gull with a gentle round head, thin plain yellow-green bill with no red spot, dark eye, mid-grey back, black wingtips with large white spots, yellow-green legs.
```

### Batch 05: estuary and marsh (Lewis's Thames marshes)

```
Batch 05. Nine birds:
1. little-egret (Little Egret): all-white small heron, black bill, black legs with bright yellow feet, fine plumes on the back of the head.
2. common-shelduck (Shelduck): large white duck, dark green head, broad chestnut band round the breast, bright red bill, black wing stripes, pink legs.
3. eurasian-oystercatcher (Oystercatcher): black upperparts and breast, white belly, long straight orange-red bill, red eye, pink legs.
4. common-redshank (Redshank): grey-brown wader with speckled breast, bright orange-red legs, straight bill red at the base.
5. eurasian-curlew (Curlew): large streaky brown wader, very long down-curved bill, long blue-grey legs.
6. northern-lapwing (Lapwing): long thin wispy crest, black breast band, white face with dark marks, glossy green-purple back, orange under the tail.
7. lesser-black-backed-gull (Lesser Black-backed Gull): dark slate-grey back, white head and body, yellow legs, yellow bill with a red spot.
8. common-snipe (Snipe): crouched, cryptic brown with gold-buff stripes on the back and head, very long straight bill, short legs.
9. common-sandpiper (Common Sandpiper): small olive-brown wader, white belly with a white notch up in front of the wing, short greenish legs, tail raised mid-bob.
```

### Batch 06: raptors, owls and look-alikes

```
Batch 06. Eight birds:
1. eurasian-sparrowhawk (Sparrowhawk), male: slate-blue back, fine orange barring on the underparts, orange cheeks, yellow eye, long yellow legs, long barred tail, perched.
2. red-kite (Red Kite), in flight: rufous body, pale grey streaky head, long deeply forked rufous tail, white patches near the wingtips, black wingtips.
3. peregrine-falcon (Peregrine): slate-blue back, black hood with a thick black moustache, white cheeks and throat, finely barred white underparts, yellow eye-ring and feet, perched upright.
4. western-barn-owl (Barn Owl): white heart-shaped face, dark eyes, golden-buff and grey back, white underparts.
5. tawny-owl (Tawny Owl): round head with no ear tufts, mottled rich brown, big dark eyes in a facial disc.
6. little-owl (Little Owl): small and flat-headed, brown with white spots, yellow eyes under fierce white 'eyebrows'.
7. rook (Rook): black with purple gloss, bare grey-white face around the bill base, shaggy feathered 'trousers', peaked crown.
8. stock-dove (Stock Dove): blue-grey pigeon, glossy green neck patch with no white, dark eye, two short black bars on the wing, pinkish breast.
```

### Batch 07: woodland

```
Batch 07. Nine birds:
1. eurasian-nuthatch (Nuthatch): blue-grey back, black stripe through the eye, white cheeks, orange-buff underparts, strong pointed bill; head-down pose.
2. eurasian-treecreeper (Treecreeper): streaky brown back, silvery-white underparts, thin down-curved bill, stiff tail; clinging pose.
3. eurasian-green-woodpecker (Green Woodpecker), male: green back, yellow rump, red crown, black face mask, red centre to the black moustache, pale eye.
4. eurasian-bullfinch (Bullfinch), male: rose-pink breast, black cap, grey back, white rump, black wings with a pale bar, stubby black bill.
5. eurasian-siskin (Siskin), male: streaky yellow-green, black cap and small black bib, yellow wing bars, fine pointed bill.
6. lesser-redpoll (Lesser Redpoll): small streaky brown finch, red forehead patch, small black bib, pink wash on the breast, buff wing bar.
7. brambling (Brambling), male winter: orange breast and shoulders, mottled dark head, white belly with dark flank spots.
8. mistle-thrush (Mistle Thrush): large pale grey-brown thrush, round bold black spots on white underparts, upright stance.
9. common-pheasant (Pheasant), male: copper-gold body, glossy dark green head, red face wattles, white neck ring, very long barred tail.
```

### Batch 08: farmland, heath and reeds

```
Batch 08. Nine birds:
1. skylark (Skylark): streaky brown, short crest, pale stripe over the eye, white outer tail feathers.
2. meadow-pipit (Meadow Pipit): small streaky olive-brown, thin bill, streaked breast, pinkish legs.
3. common-linnet (Linnet), male breeding: crimson forehead and breast, grey head, chestnut back, white flashes on the wing and tail.
4. yellowhammer (Yellowhammer), male: bright yellow head and underparts, chestnut rump, streaked brown back, rusty streaks on the flanks.
5. european-stonechat (Stonechat), male: black head, white half-collar, orange-red breast, dark back, small white wing patch.
6. eurasian-tree-sparrow (Tree Sparrow): chestnut crown, white cheek with a black spot, small black bib.
7. grey-partridge (Grey Partridge): orange face, grey neck and breast, dark chestnut horseshoe patch on the belly, chestnut-barred flanks.
8. red-legged-partridge (Red-legged Partridge): white throat edged with a black necklace that breaks into streaks, red bill and legs, boldly barred black-white-chestnut flanks, blue-grey breast.
9. reed-bunting (Reed Bunting), male breeding: black head and bib, white moustache and white collar, streaky brown back.
```

### Batch 09: specialists and winter specials

```
Batch 09. Eight birds:
1. eurasian-bittern (Bittern): stocky golden-brown heron, heavily streaked, black crown, bill pointed straight up in camouflage pose.
2. water-rail (Water Rail): slate blue-grey face and breast, long red bill, black-and-white barred flanks, streaky brown back, cocked tail.
3. white-throated-dipper (Dipper): plump dark brown, big white bib, chestnut band below the bib, short tail.
4. grey-wagtail (Grey Wagtail), male: blue-grey back, bright lemon-yellow underparts (strongest under the tail), black throat, very long tail.
5. whooper-swan (Whooper Swan): large white swan, straight neck, wedge-shaped bill that is yellow from the base to past the nostril and black at the tip, no knob.
6. pink-footed-goose (Pink-footed Goose): small grey-brown goose with a dark brown head and short neck, small bill pink in the middle and dark at base and tip, pink legs.
7. bohemian-waxwing (Waxwing): pinkish-brown with a big swept-back crest, black mask and throat, yellow tail tip, red waxy tips and yellow-white marks on the wing.
8. sedge-warbler (Sedge Warbler): streaky brown back, bold creamy stripe over the eye, dark streaked crown, singing with open bill.
```

### Batch 10: summer visitors

```
Batch 10. Eleven birds:
1. common-swift (Swift), in flight: all dark sooty brown, long scythe-shaped wings, short forked tail, small pale throat.
2. barn-swallow (Swallow): glossy blue-black upperparts, dark red forehead and throat, cream underparts, long tail streamers.
3. western-house-martin (House Martin): glossy blue-black above, pure white underparts and white rump, short forked tail, white feathered feet.
4. common-chiffchaff (Chiffchaff): small plain olive-brown warbler, short pale stripe over the eye, dark legs.
5. willow-warbler (Willow Warbler): like the chiffchaff but yellower, with a longer clearer pale eye stripe and pale pinkish legs.
6. eurasian-blackcap (Blackcap), male: grey warbler with a neat jet-black cap.
7. common-whitethroat (Whitethroat), male: grey head, puffed-out white throat, rusty-brown wings, pinkish-buff breast.
8. common-redstart (Redstart), male: orange-red tail, black face and throat, white forehead, orange breast, grey back.
9. european-pied-flycatcher (Pied Flycatcher), male: black above, white below, small white forehead spot, big white wing patch.
10. northern-wheatear (Wheatear), male: blue-grey back, black mask and black wings, apricot breast, white rump and tail with a black inverted 'T' at the tip.
11. common-tern (Common Tern): white with a pale grey back, black cap, red bill with a black tip, red legs, long tail streamers.
```

## Also still needed (separate small batches, later)

- **Water and woodland map textures**: 32×32 seamless tiles, same style as the grass tile already supplied. Missing from expansion v1.
- **Reserve Warden portraits, badge pins, rank frames, duel condition icons**: briefs will be written when those features are built (AUTOPILOT.md phases D and E). Original characters only.
