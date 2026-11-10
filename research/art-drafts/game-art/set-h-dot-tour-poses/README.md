# Dot Lau in conversation

Six 96 × 96 transparent portraits for everyday Bird-Dex dialogue. Open Dot-Lau-Tour-Poses.png to see each portrait paired with a finished speech bubble.

## Using the poses

Each record in dot-tour-scenes.json pairs a portrait key and PNG filename with a gesture, a suggested use, an example line and a mouth anchor measured in native sprite pixels from the top left. For the “Reported here” tour block, use dot-tour-introduce. For an ordinary line without a cue, use dot-tour-chat.

Select a pose when the purpose of a line changes. Let Dot keep it while the letters land and over consecutive blocks that make the same point. Bring back the existing sketchbook artwork for drawing and bird identification. The gull counts, dates and redshank in the examples come from the sample screen. Use the current sighting data for live dialogue.

## Existing dialogue player

Load the PNG named in the selected scene. Pass the loaded image in the existing player’s portrait field. The scene already carries its mouth coordinates, paper skin and text. These assets are drawn for a speaker on the right with the bubble on the left. Keep pixelated or nearest-neighbour scaling enabled.

```js
const scene = scenes.find(item => item.portrait === 'dot-tour-introduce');
const portrait = new Image();
portrait.src = assetBase + scene.filename;
await portrait.decode();
player.say({ ...scene, portrait, reducedMotion });
```

Here, scenes is the parsed scene list, assetBase is the asset directory URL ending in a slash, player is the existing FieldDialogue instance, and reducedMotion is the player’s animation preference.
