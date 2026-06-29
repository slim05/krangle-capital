/* ===== Krangle Capital — Awards Results (TV reveal) ===== */
(function () {
  const cfg = window.KC_CONFIG || {};
  const el = document.getElementById("res");
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("PASTE_") === 0) {
    el.innerHTML = '<div class="res-locked"><div class="seal">K</div><h1>Not connected yet</h1><p>Paste your Supabase URL and key into config.js.</p></div>';
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n).toLocaleString();
  const MEDALS = ["🥇", "🥈", "🥉"];

  const PHOTOS = {
    "KC-001":"Kris_Krangle.jpg","KC-002":"Greer_Styles.jpg","KC-003":"Bradley_Pickens.jpg",
    "KC-004":"Keegan_Ng.jpg","KC-005":"Rowan_Black.jpg","KC-006":"Frankie_Ford.jpg",
    "KC-007":"Blake_Vega.jpg","KC-008":"Cody_Bright.jpg","KC-009":"Drew_Daniels.jpg",
    "KC-010":"Micah_Rojas.jpg","KC-011":"Dr_Patrice_Lin.jpg","KC-012":"Randy_Tinsley.jpg",
    "KC-013":"Riley_Marsh.jpg","KC-014":"Taylor_Knox.jpg","KC-015":"Max_Caldwell.jpg",
    "KC-016":"Jordan_Rowe.jpg","KC-017":"Shiloh_Dobbins.jpg","KC-018":"Morgan_Reed.jpg",
    "KC-019":"Devon_Yamada.jpg","KC-020":"Lexi_Hale.jpg","KC-021":"Sterling_Frost.jpg",
    "KC-022":"Cedar_Wells.jpg","KC-023":"Gabe_Snowden.jpg","KC-024":"Robin_Pyne.jpg",
    "KC-025":"Sage_Garland.jpg","KC-026":"Ivy_Maddox.jpg","KC-027":"Carol_Hollis.jpg",
    "KC-028":"Joy_Calloway.jpg","KC-029":"Marley_Birch.jpg","KC-030":"Holland_Reyes.jpg",
    "KC-031":"Star_Vance.jpg","KC-032":"Sunny_Belle.jpg","KC-033":"Nick_Chestnut.jpg",
    "KC-034":"Crispin_Vaughn.jpg","KC-035":"Goldie_Vaux.jpg","KC-036":"Penny_Lowe.jpg",
    "KC-037":"Jack_Brisk.jpg","KC-038":"Hazel_Crisp.jpg","KC-039":"Noel_Ashford.jpg",
    "KC-040":"Reggie_Pemberton.jpg"
  };
  function bigAvatar(row) {
    if (row.card_id && PHOTOS[row.card_id]) return '<img class="bav" src="headshots/' + PHOTOS[row.card_id] + '" alt="">';
    if (row.icon) return '<img class="bav" src="themes/' + row.icon + '" alt="">';
    if (row.card_id) { const i = (row.label || "?").split(" ").slice(-2).map((s) => s[0]).join(""); return '<div class="bav mini-av">' + esc(i) + "</div>"; }
    return '<div class="bav mini-av">🎄</div>';
  }

  let slides = [], idx = 0, timer = null, built = false;

  function locked() {
    el.innerHTML = '<div class="res-locked"><div class="seal">K</div>' +
      "<h1>Voting in progress</h1><p>The Krangle &amp; Co. Awards will be revealed here once the host closes voting.</p></div>";
  }

  function renderSlide() {
    const s = slides[idx];
    const rows = s.rows.length ? s.rows.map((r, i) =>
      '<div class="big-row r' + i + '"><div class="big-medal">' + MEDALS[i] + "</div>" +
      bigAvatar(r) +
      '<div class="big-name"><b>' + esc(r.label) + "</b>" + (r.sub ? "<span>" + esc(r.sub) + "</span>" : "") + "</div>" +
      '<div class="big-val">' + esc(r.value) + "</div></div>").join("")
      : '<div class="big-empty">No votes were cast in this category.</div>';

    el.innerHTML =
      '<div class="reveal">' +
      '<button class="nav-arrow left" id="prev"' + (idx === 0 ? " disabled" : "") + ">‹</button>" +
      '<div class="reveal-card">' +
      '<div class="reveal-kicker">' + s.kicker + " · " + (idx + 1) + " / " + slides.length + "</div>" +
      '<h1 class="reveal-title">' + esc(s.title) + "</h1>" +
      '<div class="reveal-podium">' + rows + "</div>" +
      "</div>" +
      '<button class="nav-arrow right" id="next"' + (idx === slides.length - 1 ? " disabled" : "") + ">›</button>" +
      '<div class="reveal-dots">' + slides.map((x, i) => '<span class="' + (i === idx ? "on" : "") + '"></span>').join("") + "</div>" +
      "</div>";
    const prev = document.getElementById("prev"), next = document.getElementById("next");
    prev.onclick = () => { if (idx > 0) { idx--; renderSlide(); } };
    next.onclick = () => { if (idx < slides.length - 1) { idx++; renderSlide(); } };
  }

  function build(cats, board) {
    slides = [];
    const rich = (board || []).slice(0, 3).map((p) => ({ label: p.character_name, sub: p.role, card_id: p.card_id, value: money(p.balance) }));
    slides.push({ kicker: "Krangle & Co.", title: "💰 Richest Employee", rows: rich });
    (cats || []).forEach((c) => {
      const isTheme = c.kind === "theme";
      const rows = (c.standings || []).slice(0, 3).map((r) => ({
        label: r.label, card_id: r.card_id, icon: r.icon,
        value: isTheme ? (r.votes + " pts") : (r.votes === 1 ? "1 vote" : r.votes + " votes")
      }));
      slides.push({ kicker: isTheme ? "Next Year" : "Awards", title: c.label, rows: rows });
    });
    idx = 0; renderSlide();
  }

  document.addEventListener("keydown", (e) => {
    if (!slides.length) return;
    if (e.key === "ArrowRight" && idx < slides.length - 1) { idx++; renderSlide(); }
    if (e.key === "ArrowLeft" && idx > 0) { idx--; renderSlide(); }
  });

  async function poll() {
    if (built) { if (timer) { clearInterval(timer); timer = null; } return; }
    let res; try { res = await sb.rpc("get_results"); } catch (e) { return; }
    const d = res && res.data;
    if (!d || d.locked) { if (!slides.length) locked(); return; }
    built = true;
    if (timer) { clearInterval(timer); timer = null; }
    let lb; try { lb = await sb.rpc("get_leaderboard"); } catch (e) { lb = { data: [] }; }
    build(d.categories || [], (lb && lb.data) || []);
  }
  poll();
  timer = setInterval(poll, 5000);
})();
