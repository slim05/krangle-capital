/* ===== Krangle Capital — TV leaderboard ===== */
(function () {
  const cfg = window.KC_CONFIG || {};
  const el = document.getElementById("tv");
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("PASTE_") === 0) {
    el.innerHTML = '<div class="notfound"><div class="seal">K</div><h1>Not connected yet</h1><p>Paste your Supabase URL and key into config.js.</p></div>';
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const fmt = (n) => "$" + Number(n).toLocaleString();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function av(p, cls) {
    if (p.photo) return '<img class="' + cls + '" src="headshots/' + esc(p.photo) + '" alt="">';
    const i = p.character_name.split(" ").slice(-2).map((s) => s[0]).join("");
    return '<div class="' + cls + ' mono-av">' + esc(i) + "</div>";
  }

  const GAGS = [
    "Fraud Detection is feeling <b>festive</b> tonight.",
    "Suspicious generosity detected.",
    "Liquidity crisis reported near the open bar.",
    "Reimbursement approved — a genuine holiday miracle.",
    "Accounting has <b>questions</b>.",
    "Your expense report was selected for a totally random audit.",
    "HR has flagged someone’s recent financial activity. ❤",
    "Questionable consulting fees detected. Nice work."
  ];

  async function load() {
    const [lb, tx] = await Promise.all([
      sb.rpc("get_leaderboard"),
      sb.rpc("get_recent_transactions", { p_limit: 400 })
    ]);
    const board = (lb.data || []);
    const txs = (tx.data || []);
    if (!board.length) { el.innerHTML = '<div class="notfound"><div class="seal">K</div><h1>No employees yet</h1><p>Run the database setup file to seed the cast.</p></div>'; return; }

    const top = board.slice(0, 8);
    const poorest = board[board.length - 1];

    // superlatives from the transaction history
    const transfers = txs.filter((t) => t.type === "transfer");
    let largest = null, given = {}, recv = {};
    transfers.forEach((t) => {
      if (!largest || t.amount > largest.amount) largest = t;
      if (t.from_name) given[t.from_name] = (given[t.from_name] || 0) + t.amount;
      if (t.to_name) recv[t.to_name] = (recv[t.to_name] || 0) + t.amount;
    });
    const topOf = (o) => Object.keys(o).sort((a, b) => o[b] - o[a])[0];
    const generous = topOf(given), receiver = topOf(recv);
    const suspicious = transfers.length ? transfers[Math.floor(Math.random() * Math.min(transfers.length, 15))] : null;

    const rows = top.map((p, i) =>
      '<div class="rank"><div class="n">' + (i + 1) + "</div>" +
      av(p, p.photo ? "" : "mono-av") +
      '<div class="nm"><b>' + esc(p.character_name) + "</b><span>" + esc(p.role) + "</span></div>" +
      '<div class="bal">' + fmt(p.balance) + "</div></div>"
    ).join("");

    const sup = (k, v) => '<div class="super"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>";
    const side =
      "<h4>Finance has questions</h4>" +
      sup("Richest Employee", esc(board[0].character_name) + " <small>" + fmt(board[0].balance) + "</small>") +
      (largest ? sup("Largest Single Transaction", esc(largest.from_name || "Finance") + " → " + esc(largest.to_name || "Finance") + " <small>" + fmt(largest.amount) + "</small>") : "") +
      (generous ? sup("Most Generous", esc(generous) + " <small>" + fmt(given[generous]) + " given</small>") : "") +
      (suspicious ? sup("Most Suspicious Transaction", esc(suspicious.from_name || "?") + " → " + esc(suspicious.to_name || "?") + " <small>" + fmt(suspicious.amount) + (suspicious.note ? " · " + esc(suspicious.note) : "") + "</small>") : "") +
      sup("Most In Need of a Bonus", esc(poorest.character_name) + " <small>" + fmt(poorest.balance) + "</small>");

    const ticker = GAGS.map((g) => "&nbsp;&nbsp;•&nbsp;&nbsp;" + g).join("");

    el.innerHTML =
      '<div class="tv"><div class="tvhead">' +
      '<div class="t"><b>Live Net Worth</b><span>Krangle Capital · Holiday Edition</span></div>' +
      '<div class="live"><span class="dot"></span>Live</div></div>' +
      '<div class="tvgrid"><div>' + rows + '</div><div class="side">' + side + "</div></div>" +
      '<div class="ticker"><div class="run">' + ticker + ticker + "</div></div></div>";
  }

  load();
  setInterval(load, 5000);
})();
