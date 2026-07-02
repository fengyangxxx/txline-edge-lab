# Deployment Notes

`TxLINE Edge Lab` is a static Vite app. It can be deployed from the repo root
after installing dependencies and building the production bundle.

## Required Commands

```bash
npm install
npm run smoke
npm run packet
npm run build
```

## Static Hosts

Any static host that serves `dist/` works:

- GitHub Pages: the included workflow builds `dist/` from `main` and deploys it
  through GitHub Pages Actions.
- Vercel: import the public GitHub repo, build command `npm run build`, output
  directory `dist`.
- Netlify: build command `npm run build`, publish directory `dist`.
- Cloudflare Pages: build command `npm run build`, output directory `dist`.

## Environment

No build-time secret is required. Live TxLINE credentials are pasted into the
browser during the demo session and are not stored.

## Pre-Submission Deployment Check

After deployment, open the public URL in a clean browser profile and verify:

- The replay stream starts automatically.
- The signal tape generates entries within a few seconds.
- The Signal Evidence panel shows threshold, move, consensus, volume, source,
  confidence, and field rows.
- Export JSON downloads successfully.
- There is no request for wallet funding, betting, custody, or payment.
