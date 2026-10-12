# rishiraaj-portfolio

Personal site for Rishiraaj Khurma. Plain HTML, CSS and JavaScript, no build step.

## Files

- `index.html` holds all the content. Edit text here.
- `assets/styles.css` holds colors, type and layout. Colors are at the top under `:root`.
- `assets/main.js` draws the flight path in the hero, runs the case-work tabs, scroll progress and the copy-email button.
- `assets/pfp.png` is your profile photo. Add it here (portrait, about 4:5). Until it exists, the page falls back to the photo on the old Lovable site.
- `assets/og.png` is the preview image shown when the link is shared.

## Updating the flight path

The milestones on the curve are the `stops` list at the top of `assets/main.js`. `at` is how far along the curve (0 to 1) each point sits; `NOW` marks today.

## Deploying on Vercel

1. vercel.com → Add New → Project → import this repo.
2. Framework preset: **Other**. Leave build command and output directory empty.
3. Deploy. Every push to `main` redeploys automatically.

## Preview locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080.
