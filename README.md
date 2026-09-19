# InspirEdu Music Studio

Browser-based practice-track processing prototype.

## Current milestone

Deployment trigger: offline transpose renderer enabled.


Validate Cloudflare deployment and local audio decoding, then render an instrumental from G to D (−5 semitones) while preserving 100% source tempo.

Audio stays local to the browser.

## Development

```bash
npm install
npm run dev
```

## Cloudflare

Build command: `npm run build`

Deploy command: `npx wrangler deploy`
