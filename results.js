/* ===== Krangle Capital — Awards Results (TV) ===== */
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
  const MEDALS = ["🥇", "🥈", "🥉"];

  function avatar(row) {
    if (row.card_id && PHOTOS[row.card_id]) return '<img src="headshots/' + PHOTOS[row.card_id] + '" alt="">';
    if (row.icon) return '<img src="themes/' + row.icon + '" alt="">';
    if (row.card_id) {
      const i = row.label.split(" ").slice(-2).map((s) => s[0]).join("");
      return '<div class="mini-av">' + esc(i) + "</div>";
    }
    return '<div class="mini-av">🎄</div>';
  }
  const money = (n) => "$" + Number(n).toLocaleString();

  function locked() {
    el.innerHTML = '<div class="res-locked"><div class="seal">K</div>' +
      "<h1>Voting in progress</h1><p>The Krangle &amp; Co. Awards results will appear here once the host closes voting.</p></div>";
  }

  async function load() {
    let res, lb;
    try {
      [res, lb] = await Promise.all([sb.rpc("get_results"), sb.rpc("get_leaderboard")]);
    } catch (e) { return; }
    const d = res && res.data;
    if (!d || d.locked) { locked(); return; }
    const cats = d.categories || [];
    const board = (lb && lb.data) || [];

    // Richest podium (from final money standings)
    const rich = board.slice(0, 3);
    const richRows = rich.length ? rich.map((p, i) =>
      '<div class="podium-row"><div class="medal">' + MEDALS[i] + "</div>" +
      (PHOTOS[p.card_id] ? '<img src="headshots/' + PHOTOS[p.card_id] + '" alt="">' : '<div class="mini-av">$</div>') +
      '<div class="pn"><b>' + esc(p.character_name) + "</b><span>" + esc(p.role) + "</span></div>" +
      '<div class="pv">' + money(p.balance) + "</div></div>").join("")
      : '<div class="podium-row"><div class="pn"><span>No standings yet.</span></div></div>';
    const richCard = '<div class="res-cat res-rich"><h3>💰 Richest Employee</h3>' + richRows + "</div>";

    const voteCards = cats.map((c) => {
      const isTheme = c.kind === "theme";
      const top = (c.standings || []).slice(0, 3);
      const rows = top.length ? top.map((r, i) => {
        const unit = isTheme ? (r.votes + " pts") : (r.votes === 1 ? "1 vote" : r.votes + " votes");
        return '<div class="podium-row"><div class="medal">' + MEDALS[i] + "</div>" +
          avatar(r) + '<div class="pn"><b>' + esc(r.label) + "</b><span>" + unit + "</span></div></div>";
      }).join("")
        : '<div class="podium-row"><div class="pn"><span>No votes cast.</span></div></div>';
      return '<div class="res-cat"><h3>' + esc(c.label) + "</h3>" + rows + "</div>";
    }).join("");

    el.innerHTML =
      '<div class="res-head"><div><span>Krangle &amp; Co. Annual Awards</span>' +
      "<b>And the winners are…</b></div></div>" +
      '<div class="res-grid">' + richCard + voteCards + "</div>";
  }

  load();
  setInterval(load, 6000);
})();
