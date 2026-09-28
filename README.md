# 武士道 — Deepak Meena · 3D Samurai Portfolio

An interactive 3D portfolio for **Deepak Meena**, Software Development Engineer — Full-Stack (.NET / Angular / Azure).

A low-poly ink samurai stands at the center of the world. As you scroll, a drone-style camera flies a smooth orbit around it, banking into turns, while sakura petals drift down and everything fades into aged paper at the edges like an ink-wash painting.

## Features

- **3D samurai centerpiece** built in Three.js: armor plates, kabuto helmet with a glowing crescent, katana with a glowing edge, and a cape that flutters in the wind
- **Drone camera**: a Catmull-Rom spline path around the samurai, with one waypoint per section, driven by scroll position and eased so it glides instead of jumping
- **Atmosphere**: a torii gate, a raked zen-garden ground, falling sakura petals, and paper-colored fog
- **Paper / ink / sakura palette** with brush-serif typography (Yuji Syuku, Shippori Mincho)
- **Resume content**: experience, projects, skills, education, plus a one-click resume PDF download
- **Accessible**: honors `prefers-reduced-motion`, supports keyboard navigation, and shows a static paper background when WebGL isn't available

## Tech

HTML, CSS, and JavaScript with Three.js 0.160, loaded through an ES-module import map. There is no build step and no `npm install`.

## Run locally

Any static file server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly via `file://` won't work, because browsers block ES modules from local files.

## Deploy

It's a static site, so you can drop the folder on Netlify, Vercel, or GitHub Pages with no build command and publish directory `/`.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Page content and sections |
| `style.css` | Paper/ink/pink theme and layout |
| `script.js` | Typing effect, nav highlighting, scroll progress, contact form |
| `three-scene.js` | 3D scene: samurai, torii gate, petals, drone camera |
| `Deepak_Meena_Resume.pdf` | Downloadable resume |

## Contact

- Email: deepaksingh1712000@gmail.com
- LinkedIn: [deepak-meena-734b9625b](https://www.linkedin.com/in/deepak-meena-734b9625b)
- GitHub: [DeepakMeena222187](https://github.com/DeepakMeena222187)
