# 武士道 — Deepak Meena · 3D Samurai Portfolio

An interactive 3D portfolio for **Deepak Meena**, Software Development Engineer — Full-Stack (.NET / Angular / Azure).

A samurai stands inside an ink-wash mountain painting. Each section of the portfolio is a drone shot of a different part of the samurai. As you scroll, the camera flies from shot to shot, pulling out and swooping back in and banking into turns, while painted sakura petals drift down.

| Section | Drone shot |
|---|---|
| Home | Low heroic angle, full body |
| About | Close on the face and helmet |
| Experience | Behind, on the katana across the back |
| Projects | Down at the hands |
| Skills | The chest armor |
| Education | Top-down over the helmet crest |
| Contact | Pulled out to a wide shot |

## Features

- **Real 3D model** (`assets/samurai.glb`), scaled and centered automatically
- **Body-part targeting**: uses the model's skeleton when it has one; otherwise reads the mesh geometry to find the head, hands, chest and back, so unrigged AI-generated models work too
- **Drone camera**: each section holds its shot while its panel is on screen; the camera flies to the next shot through the open space between panels
- **Ink-wash world**: the mountain painting wraps the whole scene, the samurai casts a soft shadow onto the page's paper, and falling petals are cut from a real sakura painting
- **Loading screen** with progress while the model downloads, and a skip button
- **Resume content**: experience, projects, skills, education, plus a one-click resume PDF download
- **Accessible**: honors `prefers-reduced-motion`, supports keyboard navigation, and falls back to a static paper background without WebGL

## Adding or changing the model

1. Put a `.glb` file at `assets/samurai.glb`. Any size up to about 25 MB works; larger files load slower.
2. Open the site with `?anchors` in the URL (for example `http://localhost:8000/?anchors`) to see a blue dot on each detected body part.
3. If the model faces the wrong way, set `MODEL_YAW_DEG` at the top of `three-scene.js` (for example `180`).
4. Shot angles and distances live in the `SHOTS` table in the same file.

If the model has an animation clip whose name contains "idle", it plays automatically.

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

It's a static site: on Netlify, Vercel or GitHub Pages, leave the build command empty and set the publish directory to `/`.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Page content and sections |
| `style.css` | Paper/ink/pink theme and side-panel layout |
| `script.js` | Loading screen, typing effect, nav highlighting, scroll progress, contact form |
| `three-scene.js` | 3D scene: model loading, body-part anchors, drone shots, panorama, petals |
| `assets/` | Samurai model, paper texture, mountain painting, sakura branch, petal sprites |
| `Deepak_Meena_Resume.pdf` | Downloadable resume |

## Contact

- Email: deepaksingh1712000@gmail.com
- LinkedIn: [deepak-meena-734b9625b](https://www.linkedin.com/in/deepak-meena-734b9625b)
- GitHub: [DeepakMeena222187](https://github.com/DeepakMeena222187)
