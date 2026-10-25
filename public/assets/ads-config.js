/*
 * Ad configuration — the only file you need to edit to turn ads on.
 *
 * 1. Set `client` to your AdSense publisher ID (looks like "ca-pub-1234567890123456").
 * 2. In AdSense, create one display ad unit per slot below and paste its
 *    numeric "data-ad-slot" value. Slots left empty show a placeholder
 *    (or nothing, once showPlaceholders is false).
 * 3. Set `showPlaceholders` to false before going live.
 * 4. Put the same publisher ID in /ads.txt.
 */
window.ADS_CONFIG = {
  client: "",
  showPlaceholders: true,

  slots: {
    top: "",        // Top banner: 728×90 on desktop, 320×100 on phones (responsive unit)
    tile: "",       // Tile ads: 300×250 (used several times per page)
    railLeft: "",   // Left vertical banner: 160×600, shown on screens 1320px and wider
    railRight: "",  // Right vertical banner: 300×600, shown on screens 1100px and wider
    video: ""       // Bottom-right dock: 320×180 display unit
  },

  // Bottom-right floating video ad. AdSense has no video unit you can place
  // yourself, so the dock shows the `video` display slot above, or — if `html`
  // is set — any video ad tag from another network (scripts are executed).
  video: {
    enabled: true,
    showAfterSeconds: 4,
    minScreenWidth: 768, // hidden on phones so it never covers the calculator
    html: ""
  },

  // Full-screen popup ad. Google does not allow AdSense units inside pop-ups,
  // so this popup never loads an AdSense unit. For AdSense full-screen ads,
  // turn on "Vignette ads" under Auto ads in your AdSense account instead.
  // Use this popup for direct-sold ads or another network's interstitial tag.
  popup: {
    enabled: true,
    delaySeconds: 25,
    oncePerSession: true,
    html: ""
  }
};
