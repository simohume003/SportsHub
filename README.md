# FixtureHub V1

A clean personal sports dashboard that reads fixtures from `fixtures.csv`.

## How it works

- The homepage automatically finds the next upcoming event based on today's date.
- The hero section uses the row's `image` and `logo` columns.
- The nav buttons filter the same CSV into clean calendar views.
- Search and month filters work on the calendar list.

## Files

- `index.html`
- `style.css`
- `app.js`
- `fixtures.csv`
- `assets/`

## Assets to add

Put these image files into the `assets` folder:

- `westham.png`
- `westham-bg.jpg`
- `leinster.png`
- `leinster-bg.jpg`
- `f1.png`
- `f1-bg.jpg`
- `pdc.png`
- `darts-bg.jpg`

For now, if images are missing, the site still works. It just hides broken logos and uses the background gradient.

## Run locally

Because the browser uses `fetch("fixtures.csv")`, open it through a local server rather than double-clicking the HTML file.

On Mac:

```bash
cd fixturehub-v1
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages

Upload the folder contents to a GitHub repo, then turn on Pages from the repo settings.
