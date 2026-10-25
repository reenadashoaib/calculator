/* Renders every ad slot on the page from window.ADS_CONFIG. */
(function () {
  "use strict";

  var cfg = window.ADS_CONFIG || {};
  var slots = cfg.slots || {};
  var live = /^ca-pub-\d{10,20}$/.test(cfg.client || "");
  var LABEL = "Advertisement";

  var TYPES = {
    top: { name: "Top banner", size: "728 × 90", mobileSize: "320 × 100", responsive: true },
    tile: { name: "Tile ad", w: 300, h: 250 },
    railLeft: { name: "Vertical banner", w: 160, h: 600, minWidth: 1320 },
    railRight: { name: "Vertical banner", w: 300, h: 600, minWidth: 1100 },
    video: { name: "Video ad", w: 320, h: 180 },
    popup: { name: "Full-screen ad", size: "336 × 280 to 728 × 400" }
  };

  var adsenseRequested = false;
  function loadAdSense() {
    if (adsenseRequested) return;
    adsenseRequested = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(cfg.client);
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }

  // innerHTML does not run <script> tags, so recreate them.
  function injectHTML(box, html) {
    box.innerHTML = html;
    box.querySelectorAll("script").forEach(function (old) {
      var s = document.createElement("script");
      for (var i = 0; i < old.attributes.length; i++) s.setAttribute(old.attributes[i].name, old.attributes[i].value);
      s.text = old.text;
      old.replaceWith(s);
    });
  }

  function placeholder(box, type) {
    var t = TYPES[type];
    var size = t.size || t.w + " × " + t.h;
    if (t.mobileSize && window.matchMedia("(max-width: 760px)").matches) size = t.mobileSize;
    box.classList.add("ad__box--placeholder");
    box.innerHTML = "<span>" + t.name + "</span><span class=\"ad__size\">" + size + "</span>";
  }

  // Returns true when the box got something to show.
  function fill(box, type, opts) {
    opts = opts || {};
    if (opts.html) {
      injectHTML(box, opts.html);
      return true;
    }
    var slotId = opts.allowAdSense === false ? "" : slots[type];
    if (live && slotId) {
      loadAdSense();
      var t = TYPES[type];
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.setAttribute("data-ad-client", cfg.client);
      ins.setAttribute("data-ad-slot", slotId);
      if (t.responsive) {
        ins.style.display = "block";
        ins.style.width = "100%";
        ins.setAttribute("data-ad-format", "horizontal");
        ins.setAttribute("data-full-width-responsive", "true");
      } else {
        ins.style.display = "inline-block";
        ins.style.width = t.w + "px";
        ins.style.height = t.h + "px";
      }
      box.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ad blocked */ }
      return true;
    }
    if (cfg.showPlaceholders) {
      placeholder(box, type);
      return true;
    }
    return false;
  }

  function build(el, type) {
    el.innerHTML = "";
    var label = document.createElement("span");
    label.className = "ad__label";
    label.textContent = LABEL;
    var box = document.createElement("div");
    box.className = "ad__box";
    el.appendChild(label);
    el.appendChild(box);
    return box;
  }

  // In-page slots: <div class="ad ad--tile" data-ad="tile"></div>
  function renderInline() {
    document.querySelectorAll("[data-ad]").forEach(function (el) {
      var type = el.getAttribute("data-ad");
      var t = TYPES[type];
      if (!t) return;
      // Skip rails the screen is too narrow to show; AdSense errors on hidden slots.
      if (t.minWidth && !window.matchMedia("(min-width: " + t.minWidth + "px)").matches) {
        el.classList.add("ad--off");
        return;
      }
      if (!fill(build(el, type), type)) el.classList.add("ad--off");
    });
  }

  function storage(fn) {
    try { return fn(window.sessionStorage); } catch (e) { return null; }
  }

  function renderDock() {
    var v = cfg.video || {};
    if (v.enabled === false) return;
    if (v.minScreenWidth && !window.matchMedia("(min-width: " + v.minScreenWidth + "px)").matches) return;
    if (storage(function (s) { return s.getItem("ad-dock-closed"); })) return;

    var dock = document.createElement("aside");
    dock.className = "dock";
    dock.setAttribute("aria-label", LABEL);
    dock.setAttribute("data-state", "hidden");
    dock.innerHTML =
      "<div class=\"dock__bar\"><span class=\"ad__label\">" + LABEL + "</span>" +
      "<button type=\"button\" class=\"dock__close\">Close ad</button></div>";
    var box = document.createElement("div");
    box.className = "ad__box";
    dock.appendChild(box);

    dock.querySelector(".dock__close").addEventListener("click", function () {
      dock.remove();
      storage(function (s) { s.setItem("ad-dock-closed", "1"); });
    });

    setTimeout(function () {
      document.body.appendChild(dock);
      if (!fill(box, "video", { html: v.html })) { dock.remove(); return; }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { dock.setAttribute("data-state", "shown"); });
      });
    }, Math.max(0, (v.showAfterSeconds || 0) * 1000));
  }

  function renderPopup() {
    var p = cfg.popup || {};
    if (p.enabled === false) return;
    if (p.oncePerSession !== false && storage(function (s) { return s.getItem("ad-popup-shown"); })) return;
    if (!p.html && !cfg.showPlaceholders) return;

    setTimeout(function () {
      var returnFocus = document.activeElement;
      var popup = document.createElement("div");
      popup.className = "popup";
      popup.setAttribute("role", "dialog");
      popup.setAttribute("aria-modal", "true");
      popup.setAttribute("aria-label", LABEL);
      popup.innerHTML =
        "<div class=\"popup__panel\"><div class=\"popup__bar\"><span class=\"ad__label\">" + LABEL + "</span>" +
        "<button type=\"button\" class=\"popup__close\">Close ad</button></div></div>";
      var box = document.createElement("div");
      box.className = "ad__box";
      popup.querySelector(".popup__panel").appendChild(box);
      // Never put an AdSense unit in a pop-up (policy); html tag or placeholder only.
      if (!fill(box, "popup", { html: p.html, allowAdSense: false })) return;

      function close() {
        popup.remove();
        document.removeEventListener("keydown", onKey, true);
        document.documentElement.style.overflow = "";
        if (returnFocus && returnFocus.focus) returnFocus.focus();
      }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); }
        else { e.stopPropagation(); }
      }
      var closeBtn = popup.querySelector(".popup__close");
      closeBtn.addEventListener("click", close);
      popup.addEventListener("click", function (e) { if (e.target === popup) close(); });
      document.addEventListener("keydown", onKey, true);

      document.body.appendChild(popup);
      document.documentElement.style.overflow = "hidden";
      closeBtn.focus();
      storage(function (s) { s.setItem("ad-popup-shown", "1"); });
    }, Math.max(0, (p.delaySeconds || 0) * 1000));
  }

  function start() {
    renderInline();
    renderDock();
    renderPopup();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
