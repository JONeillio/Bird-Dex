# Bird-Dex · Dot's dialogue kit

Open START-HERE.html in a browser after extracting the ZIP. It contains a self-contained field-journal example with six selectable moments, two bubble colours, replay, tap-to-finish, standard and slow playback, instant text, and a lowercase/uppercase specimen. The HTML embeds its art, scripts and font, so it works offline. Dot-Lau-Dialogue-Preview.gif is a quick look at the default field-mark line.

## Hand-off to the Bird-Dex app

1. Load fieldhand-land.png, fieldhand-lock.png and fieldhand-glyphs.json once. The PNG pair contains 106 characters in two states. Each character's x/y identifies its 20×28 tile on both sheets. The advance is proportional and identical in both states. The individual glyph-uXXXX-land/lock files are editable source tiles. Keep the atlas pair in the app's runtime asset path.
2. Load the body and tail PNGs for the paper and lifer skins. The body is a 28×28 nine-slice; preserve a 7 px inset at every edge. The renderer aims the stepped tail at the current pose's mouth and stops near the silhouette. The name tab and dialogue are separate from the character PNG. The warm ivory skin is the default and the gold paper is for lifers.
3. Use the approved sprites from the companion character ZIP. dialogue-scenes.json contains the full example lines, portrait state, skin, mouth anchor and any display mirroring. Mouth anchors are measured in the original 96×96 portrait before mirroring. Use a different anchor when changing the art or orientation.
4. Include dialogue-player.js as a regular browser script and provide loaded images as shown in START-HERE.html. The public constructor and methods are documented in the script. The demo's dialogue canvas is 360×166 logical pixels and scales to the available width. Set CSS image-rendering: pixelated. The engine is also a reference for recreating the behaviour in a native game UI.
5. Announce each completed line once through a live region. Keep a keyboard-operable reveal/continue button as well as the tap target. Honour prefers-reduced-motion by supplying reducedMotion: true. Use the 32×32 head avatar from the character pack if the UI only has room for a speaker icon.

## Motion
Fieldhand is an original variable-width pixel font with a five-pixel lowercase x-height and true descenders. Its two atlas poses already contain the movement. The landing tile has a 12-degree counterclockwise tilt and sits 3 px above its resting position. The lock tile sits on the normal baseline. Both use the same outline ink and transparent padding. The optional Fieldhand-Regular.ttf draws the upright letterforms as a regular installable outline font. The atlas is the exact pixel reference.

Start a letter every 42 ms by default, hold its landing state for 88 ms, and then stamp it upright. Spaces take 14 ms. The renderer inserts a short pause at punctuation. It wraps complete words using the final advances before revealing the page. A word longer than a line breaks across lines. Pages hold up to four lines. Tapping the panel once completes the current page; the action button then continues a longer line or replays the example.

The renderer caches the static bubble and the locked letters on two small canvases. A timer wakes for the next arrival or lock, and stops when a page settles. No bitmap rotation, font fetch or per-letter DOM element is needed during playback. PNG transfer size is distinct from decoded memory and device-specific performance.

## Coverage
All 95 printable ASCII characters plus £, curly quotes, en/em dashes, ellipsis, middle dot, multiplication sign and é are included. Unsupported characters display a question mark. Space has two intentionally empty tiles and a positive advance. Filenames use Unicode code points to keep A and a distinct on case-insensitive filesystems. The manifest lists each asset and its role. All files are at the ZIP root.
