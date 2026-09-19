# InspirEdu Music Studio

> Cloudflare Git integration reconnected — automatic deployment check.

Browser-based music practice-track processor.

## V0.2 audio acceptance build

- local browser audio decoding
- G → D transpose test (−5 semitones)
- playback rate fixed at 1.0 / 100%
- offline SoundTouch render
- original vs processed duration comparison
- original vs processed preview
- 16-bit PCM WAV export
- audio remains local to the browser

This is deliberately a narrow acceptance build. Tempo adjustment, trimming, arbitrary key selection and the wider practice-studio interface come after the −5 semitone quality test passes.

## Development

```bash
npm install
npm run dev
```

## Cloudflare

Build command: `npm run build`

Deploy command: `npx wrangler deploy`
