/* ===== Krangle Capital — TV leaderboard =====
   Full net worth list slowly scrolls on a loop.
   Full screen button in the header (or press F). */
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

  const SCROLL_SPEED = 22;   // pixels per second. Raise to scroll faster.
  const TOP_PAUSE = 4;       // seconds to hold at #1 each time the list loops.

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

  /* ---------- full screen ---------- */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function toggleFull() {
    if (isFull()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const d = document.documentElement;
      const req = d.requestFullscreen || d.webkitRequestFullscreen;
      if (req) req.call(d);
    }
  }
  function syncFullBtn() {
    const b = document.getElementById("fsbtn");
    if (b) b.textContent = isFull() ? "Exit full screen" : "Full screen";
    document.body.classList.toggle("is-full", isFull());
  }
  document.addEventListener("fullscreenchange", syncFullBtn);
  document.addEventListener("webkitfullscreenchange", syncFullBtn);
  document.addEventListener("keydown", (e) => {
    if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey) toggleFull();
  });

  /* ---------- page shell (built once so scrolling never resets) ---------- */
  let built = false, wrap, track, sideEl;
  function build() {
    const ticker = GAGS.map((g) => "&nbsp;&nbsp;•&nbsp;&nbsp;" + g).join("");
    el.innerHTML =
      '<div class="tv"><div class="tvhead">' +
      '<div class="t"><b>Live Net Worth</b><span>Krangle Capital · Holiday Edition</span></div>' +
      '<div class="live"><span class="dot"></span>Live</div>' +
      '<button id="fsbtn" class="fsbtn" type="button">Full screen</button></div>' +
      '<div class="tvgrid"><div class="lbwrap" id="lbwrap"><div class="lbtrack" id="lbtrack"></div></div>' +
      '<div class="side" id="lbside"></div></div>' +
      '<div class="ticker"><div class="run">' + ticker + ticker + "</div></div></div>";
    wrap = document.getElementById("lbwrap");
    track = document.getElementById("lbtrack");
    sideEl = document.getElementById("lbside");
    document.getElementById("fsbtn").addEventListener("click", toggleFull);
    syncFullBtn();
    built = true;
    requestAnimationFrame(tick);
  }

  /* ---------- slow scroll loop ---------- */
  let offset = 0, copyH = 0, looping = false, pauseLeft = TOP_PAUSE, last = 0;
  function measure() {
    const first = track.querySelector(".lbcopy");
    copyH = first ? first.offsetHeight : 0;
    looping = copyH > wrap.clientHeight + 4;
    track.classList.toggle("looping", looping);
    if (!looping) offset = 0;
    else if (copyH) offset = offset % copyH;
  }
  function tick(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
    last = t;
    if (looping && copyH) {
      if (pauseLeft > 0) pauseLeft -= dt;
      else {
        offset += SCROLL_SPEED * dt;
        if (offset >= copyH) { offset -= copyH; pauseLeft = TOP_PAUSE; }
      }
    }
    track.style.transform = "translateY(" + (-offset).toFixed(2) + "px)";
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", () => { if (built) measure(); });

  /* ---------- data ---------- */
  async function load() {
    const [lb, tx] = await Promise.all([
      sb.rpc("get_leaderboard"),
      sb.rpc("get_recent_transactions", { p_limit: 400 })
    ]);
    if (lb.error) return; // keep showing the last good board
    const board = (lb.data || []);
    const txs = (tx.data || []);
    if (!board.length) {
      if (!built) el.innerHTML = '<div class="notfound"><div class="seal">K</div><h1>No employees yet</h1><p>Run the database setup file to seed the cast.</p></div>';
      return;
    }
    if (!built) build();

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
    const generous = topOf(given);
    const suspicious = transfers.length ? transfers[Math.floor(Math.random() * Math.min(transfers.length, 15))] : null;

    const rows = board.map((p, i) =>
      '<div class="rank"><div class="n">' + (i + 1) + "</div>" +
      av(p, p.photo ? "" : "mono-av") +
      '<div class="nm"><b>' + esc(p.character_name) + "</b><span>" + esc(p.role) + "</span></div>" +
      '<div class="bal">' + fmt(p.balance) + "</div></div>"
    ).join("");
    const copy = '<div class="lbcopy">' + rows + '<div class="lbgap">• Krangle Capital •</div></div>';
    track.innerHTML = copy + copy;

    const sup = (k, v) => '<div class="super"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>";
    sideEl.innerHTML =
      "<h4>Finance has questions</h4>" +
      sup("Richest Employee", esc(board[0].character_name) + " <small>" + fmt(board[0].balance) + "</small>") +
      (largest ? sup("Largest Single Transaction", esc(largest.from_name || "Finance") + " → " + esc(largest.to_name || "Finance") + " <small>" + fmt(largest.amount) + "</small>") : "") +
      (generous ? sup("Most Generous", esc(generous) + " <small>" + fmt(given[generous]) + " given</small>") : "") +
      (suspicious ? sup("Most Suspicious Transaction", esc(suspicious.from_name || "?") + " → " + esc(suspicious.to_name || "?") + " <small>" + fmt(suspicious.amount) + (suspicious.note ? " · " + esc(suspicious.note) : "") + "</small>") : "") +
      sup("Most In Need of a Bonus", esc(poorest.character_name) + " <small>" + fmt(poorest.balance) + "</small>");

    // wait for headshots to lay out, then measure the list height
    requestAnimationFrame(measure);
    track.querySelectorAll("img").forEach((img) => { if (!img.complete) img.addEventListener("load", measure, { once: true }); });
  }

  load();
  setInterval(load, 5000);
})();
