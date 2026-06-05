# Cloudflare Pages deployment

This project is prepared for Cloudflare Pages with static assets in `public/`
and Pages Functions in `functions/`.

## Cloudflare Pages settings

- Build command: `npm run build`
- Build output directory: `public`
- Functions directory: `functions`

## Environment variables

Set these in Cloudflare Pages > Settings > Environment variables:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `JWT_SECRET`

Use the same values for Production and Preview if both environments should use
the same Supabase project.

## Local development

```sh
npm run pages:dev
```

## Direct deploy

```sh
npm run pages:deploy
```

