/* ===== Krangle Capital — full-screen photo slideshow (TV) ===== */
(function () {
  var cfg = window.KC_CONFIG || {};
  var el = document.getElementById("show");
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("PASTE_") === 0) {
    el.innerHTML = '<div class="res-locked"><div class="seal">K</div><h1>Not connected yet</h1><p>Paste your Supabase URL and key into config.js.</p></div>';
    return;
  }
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  function photoURL(path) { try { return sb.storage.from("photos").getPublicUrl(path).data.publicUrl; } catch (e) { return ""; } }

  var photos = [], idx = 0, timer = null, playing = true, DUR = 5000;

  function empty() {
    el.innerHTML = '<div class="res-locked"><div class="seal">K</div><h1>No photos yet</h1><p>Photos submitted during the party will play here.</p></div>';
  }

  function frame() {
    var p = photos[idx];
    el.innerHTML =
      '<div class="ss-stage">' +
      '<img class="ss-img" src="' + photoURL(p.full_path) + '" alt="">' +
      '<div class="ss-cap"><b>Best Photo of the Evening</b><span>Submitted by ' + esc(p.owner_name) + "</span></div>" +
      '<div class="ss-count">' + (idx + 1) + " / " + photos.length + "</div>" +
      '<button class="ss-nav ss-prev" id="pv">‹</button>' +
      '<button class="ss-nav ss-next" id="nx">›</button>' +
      '<button class="ss-play" id="pp">' + (playing ? "❚❚ Pause" : "▶ Play") + "</button>" +
      "</div>";
    document.getElementById("pv").onclick = function () { step(-1); };
    document.getElementById("nx").onclick = function () { step(1); };
    document.getElementById("pp").onclick = toggle;
  }
  function step(d) { idx = (idx + d + photos.length) % photos.length; frame(); if (playing) arm(); }
  function arm() { clearTimeout(timer); timer = setTimeout(function () { step(1); }, DUR); }
  function toggle() { playing = !playing; if (playing) arm(); else clearTimeout(timer); frame(); }

  document.addEventListener("keydown", function (e) {
    if (!photos.length) return;
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === " ") { e.preventDefault(); toggle(); }
  });

  sb.rpc("list_gallery").then(function (r) {
    photos = (r && r.data) || [];
    if (!photos.length) { empty(); return; }
    // preload
    photos.forEach(function (p) { var im = new Image(); im.src = photoURL(p.full_path); });
    frame(); arm();
  });
})();
