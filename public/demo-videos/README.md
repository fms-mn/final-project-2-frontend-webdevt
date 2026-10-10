These local MP4 files let the frontend preview work without the FILME API or an external video host. They are sample footage for fictional demo movies. The hero labels them “Demo preview video — not this movie’s trailer” and advances on actual end events.

- `flower.mp4`: [MDN CC0 example video](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4), licensed under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- `bunny-trailer.mp4`: [Big Buck Bunny trailer hosted by W3C](https://media.w3.org/2010/05/bunny/trailer.mp4), © Blender Foundation, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- `sintel-trailer.mp4`: [Sintel trailer hosted by W3C](https://media.w3.org/2010/05/sintel/trailer.mp4), © Blender Foundation, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

The mapping lives in `client/src/data/demoHeroMedia.js`. Actual movie trailers take precedence. Live mode never substitutes these samples.

The hero fills its panel without stretching. The Sintel preview also crops the 58-pixel letterbox bands encoded in the source during inline display; the original video file and attribution remain intact. Native fullscreen preserves the complete original frame.
