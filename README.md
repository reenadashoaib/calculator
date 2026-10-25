# Calcdesk

A static calculator website with ad slots ready for Google AdSense. Plain HTML, CSS and JavaScript, with no build step.

**Pages:** main calculator (basic and scientific, with a history tape), percentage, loan, BMI, tip and age calculators, plus About, Privacy policy and a 404 page.

## Files

```
public/                 ← everything that gets deployed
  index.html …          one HTML file per page
  assets/ads-config.js  ← the only file you edit to turn ads on
  assets/ads.js         renders every ad slot
  assets/calculator.js  main calculator
  assets/tools.js       percentage, loan, BMI, tip, age
  assets/styles.css
  ads.txt               ← put your publisher ID here
  robots.txt, sitemap.xml  ← put your domain here
wrangler.jsonc          Cloudflare config
```

## Ad slots

| Slot | Size | Where |
|---|---|---|
| Top banner | 728×90 (320×100 on phones) | Under the header on every page |
| Tile ads | 300×250 | Two rows of two on every calculator page |
| Left vertical banner | 160×600 | Sticky, screens 1320px and wider |
| Right vertical banner | 300×600 | Sticky, screens 1100px and wider |
| Video dock | 320×180 | Bottom right, closable, screens 768px and wider |
| Full-screen popup | 336×280 to 728×400 | Once per visit after 25 seconds, closable |

Until you add your AdSense details, each slot shows a grey placeholder with its size.

## Turning on AdSense

1. Get approved for AdSense with your deployed domain.
2. In AdSense, create a display ad unit for each slot (top, tile, rail left, rail right, video).
3. Open `public/assets/ads-config.js` and fill in `client` (your `ca-pub-…` ID) and each slot's number.
4. Set `showPlaceholders: false`.
5. In `public/ads.txt`, replace `pub-0000000000000000` with your ID.
6. In AdSense, go to Privacy & messaging and turn on the consent message for the EEA, UK and Switzerland. Google requires this.

### Two AdSense limits to know

- **Popup.** Google does not allow AdSense units inside pop-ups, so the popup never loads one. For AdSense full-screen ads, turn on **Vignette ads** under Auto ads. You can use the popup for direct-sold ads or another network's interstitial tag: paste its code into `popup.html` in `ads-config.js`.
- **Video.** AdSense has no video ad unit you can place yourself. The dock shows a normal AdSense display unit. For real video ads, paste a video network's tag into `video.html`.

## Deploying to Cloudflare

**Workers (uses `wrangler.jsonc`):**

```sh
npx wrangler login
npx wrangler deploy
```

**Pages (from the dashboard):** connect this repository and set the build output directory to `public`. Leave the build command empty.

Both serve clean URLs, so `/loan` loads `loan.html`.

To preview locally, run `npx wrangler dev`.

## Before going live

- Replace `example.com` in `robots.txt` and `sitemap.xml` with your domain.
- Replace `hello@example.com` in `about.html` and `privacy.html` with your email.
- The site name "Calcdesk" is a placeholder. Search and replace it across `public/` to rename it.
