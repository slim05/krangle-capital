/* ===== Krangle Capital — guest app ===== */
(function () {
  const cfg = window.KC_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("PASTE_") === 0) {
    document.getElementById("root").innerHTML =
      '<div class="notfound"><div class="seal">K</div><h1>Almost there</h1>' +
      '<p>The app isn’t connected to your database yet. Open <b>config.js</b> and paste your Supabase URL and key.</p></div>';
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const params = new URLSearchParams(location.search);
  const CARD = (params.get("id") || "").toUpperCase().trim();
  const ME_KEY = "kc_me";

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
  const me = () => localStorage.getItem(ME_KEY);
  const setMe = (id) => localStorage.setItem(ME_KEY, id);

  const root = document.getElementById("root");
  const state = { acc: null };

  const fmt = (n) => "$" + Number(n).toLocaleString();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ERR = {
    NO_CARD: "That card isn’t recognized.",
    NO_SENDER: "Your account couldn’t be found.",
    NO_RECIPIENT: "That recipient couldn’t be found.",
    ALREADY_ACTIVE: "This card is already activated.",
    BAD_PIN: "That access code is incorrect. Finance has noted this.",
    BAD_AMOUNT: "Enter an amount greater than zero. Unlike management.",
    SAME_CARD: "You can’t send Krangle Capital to yourself. Nice try.",
    NOT_ACTIVATED: "Activate your card before sending funds.",
    LOCKED: "Too many wrong codes — locked for 2 minutes. Finance is watching.",
    INSUFFICIENT: "You cannot spend money you do not have. Unlike management.",
    MONEY_LOCKED: "Finance is closed during awards voting. Transfers reopen after the reveal.",
    BAD_PIN_FORMAT: "Your access code must be exactly 3 digits."
  };
  const errText = (code) => ERR[code] || "Something went wrong. Try again.";

  let toastTimer;
  function toast(msg, isErr) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 2600);
  }

  function photoTag(p, cls) {
    if (p.photo) return '<img class="' + cls + '" src="headshots/' + esc(p.photo) + '" alt="' + esc(p.character_name) + '">';
    const initials = p.character_name.split(" ").slice(-2).map((s) => s[0]).join("");
    return '<div class="' + cls + ' mono-av">' + esc(initials) + "</div>";
  }
  function rating(bal) {
    if (bal >= 2000) return { g: "AAA", t: "Aggressively Solvent", warn: false };
    if (bal >= 1500) return { g: "AA", t: "Comfortably Liquid", warn: false };
    if (bal >= 1000) return { g: "A", t: "Adequately Festive", warn: false };
    if (bal >= 600) return { g: "BBB", t: "Under Review by Accounting", warn: true };
    return { g: "CC", t: "Liquidity Crisis Detected", warn: true };
  }
  function tier(r) {
    if (r <= 3) return "Upper-Management Liquidity";
    if (r <= 8) return "Solidly Mid-Tier";
    if (r <= 20) return "Cleared for the Open Bar";
    return "Flagged for a Wellness Check";
  }

  async function fetchAccount(card) {
    const { data, error } = await sb.rpc("get_account", { p_card: card });
    if (error) { console.error(error); return null; }
    return data && data[0];
  }

  const bar = (subtitle, watch) =>
    '<div class="appbar"><div class="wm"><b>Krangle Capital</b><span>' + subtitle +
    '</span></div><div class="watch">' + (watch || "Finance is watching") + "</div></div>";

  // ---------- ACTIVATION ----------
  function renderActivation(acc) {
    root.innerHTML =
      '<div class="center"><div class="phone">' +
      bar("Finance Division") +
      '<div class="actwrap">' +
      '<img class="actlogo" src="logo.png" alt="Krangle & Co.">' +
      "<h1>Welcome to Krangle&nbsp;Capital</h1>" +
      '<p class="lead">' + esc(acc.character_name) + ', create your <b>3-digit access code</b>. ' +
      "This code authorizes every future transfer.</p>" +
      '<p class="joke">Do not use 123 unless you want Accounting to judge you.</p>' +
      '<div class="pinrow">' +
      '<div class="field"><label>Enter access code</label><input id="p1" class="mono" inputmode="numeric" maxlength="3" placeholder="•••"></div>' +
      '<div class="field"><label>Confirm access code</label><input id="p2" class="mono" inputmode="numeric" maxlength="3" placeholder="•••"></div>' +
      "</div>" +
      '<div style="max-width:280px;margin:0 auto"><button class="btn btn-gold" id="actBtn">Activate card</button></div>' +
      '<div id="actMsg" class="msg"></div>' +
      "</div></div></div>";
    document.getElementById("actBtn").onclick = doActivate;
  }
  async function doActivate() {
    const a = document.getElementById("p1").value.trim();
    const b = document.getElementById("p2").value.trim();
    const m = document.getElementById("actMsg");
    if (!/^[0-9]{3}$/.test(a)) { m.className = "msg err"; m.textContent = ERR.BAD_PIN_FORMAT; return; }
    if (a !== b) { m.className = "msg err"; m.textContent = "Those codes don’t match. Try again."; return; }
    const btn = document.getElementById("actBtn"); btn.disabled = true; btn.textContent = "Activating…";
    const { data, error } = await sb.rpc("activate_card", { p_card: CARD, p_pin: a });
    if (error || !data || !data.ok) {
      btn.disabled = false; btn.textContent = "Activate card";
      m.className = "msg err"; m.textContent = errText(data && data.error); return;
    }
    setMe(CARD);
    m.className = "msg ok";
    m.innerHTML = "✓ Card activated. Starting balance $1,000 loaded.";
    setTimeout(() => { state.acc = null; renderDashboard(); }, 800);
  }

  // ---------- DASHBOARD ----------
  async function renderDashboard() {
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Employee Finance Portal") +
      '<div class="body"><div class="loading" style="min-height:40vh"><div class="spinner"></div></div></div></div></div>';
    const acc = await fetchAccount(CARD);
    if (!acc) { renderNotFound("Card not recognized", "Check with the host."); return; }
    state.acc = acc;
    const [lb, tx, vs, ps] = await Promise.all([
      sb.rpc("get_leaderboard"),
      sb.rpc("get_my_transactions", { p_card: CARD, p_limit: 15 }),
      sb.rpc("get_my_voting", { p_voter: CARD }),
      sb.rpc("get_photo_state", { p_voter: CARD })
    ]);
    const v = (vs && vs.data) || {};
    const votingOpen = !!v.open, moneyLocked = !!v.money_locked, submitted = !!v.submitted;
    const pstate = (ps && ps.data) || {};
    const uploadsOpen = !!pstate.uploads_open, myPhotos = pstate.my_count || 0;
    const board = (lb.data || []);
    const rank = board.findIndex((p) => p.card_id === CARD) + 1;
    const rt = rating(acc.balance);
    const txs = tx.data || [];

    const txHtml = txs.length ? txs.map((t) => {
      const inb = t.direction === "in";
      const who = (inb ? "From " : "To ") + (t.other_name || "Krangle & Co.");
      const label = t.type === "admin_bonus" ? "Holiday Finance" :
                    t.type === "admin_fine" ? "Adjustment by Accounting" :
                    (t.note ? esc(t.note) : "Transfer");
      return '<div class="tx"><div class="ic ' + (inb ? "in" : "out") + '">' + (inb ? "+" : "–") + "</div>" +
        '<div class="d"><b>' + esc(who) + "</b><span>" + label + "</span></div>" +
        '<div class="a ' + (inb ? "in" : "out") + '">' + (inb ? "+" : "–") + fmt(t.amount) + "</div></div>";
    }).join("") : '<div style="padding:14px 2px;color:#8a7c60;font-size:13px">No activity yet. The night is young.</div>';

    document.querySelector("#root .body").innerHTML =
      '<div class="profile">' + photoTag(acc, "avatar") +
      '<div class="who"><h2>' + esc(acc.character_name) + "</h2>" +
      '<div class="role">' + esc(acc.role) + "</div>" +
      '<div class="dept">' + esc(acc.department) + "</div>" +
      '<div class="eid">Employee ID ' + esc(acc.card_id) + " · Member since 2026</div></div></div>" +
      '<div class="kcard"><div class="ghostk">K</div><div class="lbl">Available Holiday Capital</div>' +
      '<div class="amt">' + fmt(acc.balance) + "</div>" +
      '<div class="band">Together We Sleigh.</div></div>' +
      '<div class="stats">' +
      '<div class="stat"><div class="k">Net Worth Rank</div><div class="v">#' + (rank || "—") +
      ' <small style="font-size:12px;color:#8a7c60">of ' + board.length + "</small></div>" +
      '<div class="sub">' + tier(rank) + "</div></div>" +
      '<div class="stat"><div class="k">Performance Rating</div><div class="v">' + rt.g + "</div>" +
      '<div class="sub ' + (rt.warn ? "warn" : "") + '">' + rt.t + "</div></div></div>" +
      (votingOpen && !submitted ? '<button class="btn btn-vote" id="toVote">🗳&nbsp;&nbsp;Cast your votes</button>' : "") +
      (votingOpen && submitted ? '<div class="votes-done">✓ Votes Submitted</div>' : "") +
      (!votingOpen && moneyLocked ? '<button class="btn btn-ghost" id="toResults">🏆&nbsp;&nbsp;See the awards results →</button>' : "") +
      (moneyLocked
        ? '<div class="money-locked">💰 Transfers are closed.</div>'
        : '<button class="btn btn-gold" id="toXfer">Send Krangle Capital →</button>') +
      '<div class="sec-h" style="margin-top:20px"><h3>Photo Contest</h3><div class="rule"></div></div>' +
      (uploadsOpen
        ? '<button class="btn btn-photo" id="toPhotos">📸&nbsp;&nbsp;Add your photos&nbsp;&nbsp;<span class="pcount">' + myPhotos + '/4</span></button>'
        : '<div class="photo-closed">📸 Photo submissions are closed.</div>') +
      '<button class="btn btn-ghost" id="toGallery" style="margin-top:8px">🖼&nbsp;&nbsp;View the gallery</button>' +
      '<div class="sec-h" style="margin-top:20px"><h3>Recent Activity</h3><div class="rule"></div></div>' +
      txHtml +
      '<div class="foot">Krangle &amp; Co. · Finance Division · Fully Auditable</div>';
    if (votingOpen && !submitted) document.getElementById("toVote").onclick = () => renderBallot();
    if (!votingOpen && moneyLocked) document.getElementById("toResults").onclick = () => (location.href = "results.html");
    if (!moneyLocked) document.getElementById("toXfer").onclick = () => renderTransfer(acc, board);
    if (uploadsOpen) document.getElementById("toPhotos").onclick = () => renderPhotos();
    document.getElementById("toGallery").onclick = () => renderGallery();
  }

  // ---------- TRANSFER (type-to-search recipient) ----------
  async function renderTransfer(acc) {
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Transfer Funds", "Auditable") +
      '<div class="body" id="xb"><div class="loading" style="min-height:40vh"><div class="spinner"></div></div></div></div></div>';
    const { data: recips } = await sb.rpc("list_recipients", { p_card: CARD });
    const list = recips || [];
    let selected = null;

    function thumb(r) {
      const p = PHOTOS[r.card_id];
      if (p) return '<img class="rr-av" src="headshots/' + p + '" alt="">';
      const i = r.character_name.split(" ").slice(-2).map((s) => s[0]).join("");
      return '<div class="rr-av mini-av">' + esc(i) + "</div>";
    }

    document.getElementById("xb").innerHTML =
      '<button class="back" id="back">‹ Account</button>' +
      '<div class="th">Send Krangle Capital</div>' +
      '<div class="amtbox"><div class="lbl">Amount</div>' +
      '<div class="inp"><span>$</span><input id="amt" class="fr" inputmode="numeric" placeholder="0"></div>' +
      '<div class="avail">Available: ' + fmt(acc.balance) + "</div></div>" +
      '<div class="fieldlbl">Pay to</div>' +
      '<div id="picker">' +
      '<input id="rsearch" class="recip-search" placeholder="Type a name to search…" autocomplete="off">' +
      '<div id="rlist" class="recip-list"></div>' +
      '<div id="rchosen"></div></div>' +
      '<div class="fieldlbl">Memo (optional)</div>' +
      '<input class="amtfield" id="memo" style="font-size:15px;font-family:Archivo;text-align:left" placeholder="e.g. consulting fee" maxlength="60">' +
      '<div class="fieldlbl">Your 3-digit access code</div>' +
      '<input id="pin" class="pinfield" inputmode="numeric" maxlength="3" placeholder="•••">' +
      '<div id="xmsg" class="msg" style="text-align:center"></div>' +
      '<button class="btn btn-gold" id="send" style="margin-top:12px">Send</button>' +
      '<div class="taptip">Tip: you can also pay someone by tapping <b>their</b> card to your phone.</div>';

    const search = document.getElementById("rsearch");
    const listEl = document.getElementById("rlist");
    const chosenEl = document.getElementById("rchosen");

    function updateList() {
      const f = (search.value || "").trim().toLowerCase();
      const matches = list.filter((r) => (r.character_name + " " + r.role).toLowerCase().includes(f)).slice(0, 8);
      listEl.innerHTML = matches.length
        ? matches.map((r) => '<button type="button" class="recip-row" data-id="' + r.card_id + '">' + thumb(r) +
            '<div class="rr-txt"><b>' + esc(r.character_name) + "</b><span>" + esc(r.role) + "</span></div></button>").join("")
        : '<div class="recip-empty">No match — try another name.</div>';
      listEl.querySelectorAll(".recip-row").forEach((b) => (b.onclick = () => choose(b.dataset.id)));
    }
    function choose(id) {
      selected = list.find((r) => r.card_id === id);
      search.style.display = "none"; listEl.style.display = "none";
      chosenEl.innerHTML = '<div class="recip-chosen">' + thumb(selected) +
        '<div class="rr-txt"><b>' + esc(selected.character_name) + "</b><span>" + esc(selected.role) + "</span></div>" +
        '<button type="button" id="chg">Change</button></div>';
      document.getElementById("chg").onclick = () => {
        selected = null; chosenEl.innerHTML = "";
        search.style.display = ""; listEl.style.display = ""; search.value = ""; updateList(); search.focus();
      };
    }
    search.oninput = updateList;
    updateList();

    document.getElementById("back").onclick = () => renderDashboard();
    document.getElementById("send").onclick = () => {
      if (!selected) { const m = document.getElementById("xmsg"); m.className = "msg err"; m.textContent = "Choose who to pay (type a name above)."; return; }
      doTransfer(CARD, selected.card_id, document.getElementById("xmsg"), document.getElementById("send"));
    };
  }

  // ---------- AWARDS BALLOT ----------
  async function renderBallot() {
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Awards Ballot", "Confidential") +
      '<div class="body"><div class="loading" style="min-height:40vh"><div class="spinner"></div></div></div></div></div>';
    const voter = me() || CARD;
    const { data } = await sb.rpc("get_ballot", { p_voter: voter });
    const cats = data || [];
    const expanded = {};

    function thumbById(card_id, name) {
      const p = PHOTOS[card_id];
      if (p) return '<img class="rr-av" src="headshots/' + p + '" alt="">';
      const i = (name || "?").split(" ").slice(-2).map((s) => s[0]).join("");
      return '<div class="rr-av mini-av">' + esc(i) + "</div>";
    }
    function shuffle(arr) {
      const a = (arr || []).slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }

    const body = document.querySelector("#root .body");
    body.innerHTML =
      '<button class="back" id="back">‹ Account</button>' +
      '<div class="th">Krangle &amp; Co. Awards Ballot</div>' +
      '<p class="ballot-intro">Award picks save the moment you tap a name. For the theme, set your order and tap <b>Save my ranking</b>. When everything looks good, hit <b>Submit my votes</b> below — that locks your ballot.</p>' +
      '<div id="cats"></div>' +
      '<div id="photovote"></div>' +
      '<button class="btn btn-vote" id="submit" style="margin-top:18px">Submit my votes</button>' +
      '<p class="taptip">Not ready? Use ‹ Account to come back later — nothing is final until you submit.</p>';
    document.getElementById("back").onclick = () => renderDashboard();
    document.getElementById("submit").onclick = async () => {
      if (!confirm("Submit your votes? You won’t be able to change them after this.")) return;
      const r = await sb.rpc("submit_votes", { p_voter: voter });
      if (r.data && r.data.ok) { toast("Votes submitted — thank you!"); renderDashboard(); }
      else toast(r.data && r.data.error === "CLOSED" ? "Voting has closed." : "Couldn’t submit. Try again.", true);
    };

    function renderCat(c) {
      const el = document.getElementById("cat_" + c.id);
      if (!el) return;
      if (c.kind === "theme") {
        const opts = c.options || [];
        if (!opts.length) {
          el.innerHTML = '<div class="vcat-h">' + esc(c.label) + '</div><div class="vcat-empty">The host hasn’t added theme options yet.</div>';
          return;
        }
        const byId = {}; opts.forEach((o) => (byId[o.theme_id] = o));
        let order = (c.ranking && c.ranking.length) ? c.ranking.filter((id) => byId[id]) : [];
        opts.forEach((o) => { if (order.indexOf(o.theme_id) < 0) order.push(o.theme_id); });
        c._order = order;
        function draw() {
          el.innerHTML = '<div class="vcat-h">' + esc(c.label) + "</div>" +
            '<p class="rank-help">Rank these in your order of preference — #1 is your top pick — then Save.</p>' +
            '<div class="rank-list">' + c._order.map((id, i) => {
              const o = byId[id];
              return '<div class="rank-item"><div class="rank-badge">' + (i + 1) + "</div>" +
                '<img class="rank-ic" src="themes/' + esc(o.icon) + '" alt="">' +
                '<div class="rank-tx"><b>' + esc(o.label) + "</b><span>" + esc(o.blurb || "") + "</span></div>" +
                '<div class="rank-btns"><button type="button" class="rank-up" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ">▲</button>" +
                '<button type="button" class="rank-dn" data-i="' + i + '"' + (i === c._order.length - 1 ? " disabled" : "") + ">▼</button></div></div>";
            }).join("") + "</div>" +
            '<button type="button" class="btn btn-gold rank-save" style="margin-top:10px">Save my ranking</button>';
          el.querySelectorAll(".rank-up").forEach((b) => (b.onclick = () => mv(parseInt(b.dataset.i, 10), -1)));
          el.querySelectorAll(".rank-dn").forEach((b) => (b.onclick = () => mv(parseInt(b.dataset.i, 10), 1)));
          el.querySelector(".rank-save").onclick = save;
        }
        function mv(i, d) {
          const j = i + d; if (j < 0 || j >= c._order.length) return;
          const t = c._order[i]; c._order[i] = c._order[j]; c._order[j] = t; draw();
        }
        async function save() {
          const r = await sb.rpc("set_theme_ranking", { p_voter: voter, p_theme_ids: c._order });
          toast(r.data && r.data.ok ? "Ranking saved." : (r.data && r.data.error === "CLOSED" ? "Voting has closed." : "Couldn’t save."), !(r.data && r.data.ok));
        }
        draw();
        return;
      }
      const opts = c._opts || (c._opts = shuffle(c.options || []));
      const chosen = c.choice_card ? opts.find((o) => o.card_id === c.choice_card) : null;
      if (!expanded[c.id] && chosen) {
        el.innerHTML = '<div class="vcat-h">' + esc(c.label) + "</div>" +
          '<div class="vpick">' + thumbById(chosen.card_id, chosen.name) +
          '<div class="rr-txt"><b>' + esc(chosen.name) + "</b><span>" + esc(chosen.role) + "</span></div>" +
          '<button type="button" class="vchange">Change</button></div>';
        el.querySelector(".vchange").onclick = () => { expanded[c.id] = true; renderCat(c); };
        return;
      }
      el.innerHTML = '<div class="vcat-h">' + esc(c.label) + "</div>" +
        '<input class="recip-search" placeholder="Type a name…" autocomplete="off">' +
        '<div class="recip-list"></div>';
      const s = el.querySelector(".recip-search");
      const listEl = el.querySelector(".recip-list");
      function upd() {
        const f = (s.value || "").trim().toLowerCase();
        const m = opts.filter((o) => (o.name + " " + o.role).toLowerCase().includes(f));
        listEl.innerHTML = m.length
          ? m.map((o) => '<button type="button" class="recip-row" data-id="' + o.card_id + '">' +
              thumbById(o.card_id, o.name) + '<div class="rr-txt"><b>' + esc(o.name) + "</b><span>" +
              esc(o.role) + "</span></div></button>").join("")
          : '<div class="recip-empty">No match — try another name.</div>';
        listEl.querySelectorAll(".recip-row").forEach((b) => (b.onclick = async () => {
          const r = await sb.rpc("cast_vote", { p_voter: voter, p_category: c.id, p_choice_card: b.dataset.id });
          if (r.data && r.data.ok) { c.choice_card = b.dataset.id; expanded[c.id] = false; toast("Vote saved."); renderCat(c); }
          else toast(r.data && r.data.error === "CLOSED" ? "Voting has closed." : "Couldn’t save that vote.", true);
        }));
      }
      s.oninput = upd; upd();
    }

    document.getElementById("cats").innerHTML = cats.map((c) => '<div class="vcat" id="cat_' + c.id + '"></div>').join("");
    cats.forEach(renderCat);

    // photo vote section (pick up to 3, never your own)
    const pv = await sb.rpc("get_photo_ballot", { p_voter: voter });
    const pdata = (pv && pv.data) || { photos: [], selected: [] };
    const allPhotos = pdata.photos || [];
    let picks = (pdata.selected || []).slice();
    const holder = document.getElementById("photovote");
    if (!allPhotos.length) {
      holder.innerHTML = '<div class="vcat"><div class="vcat-h">Best Photo of the Evening</div>' +
        '<div class="vcat-empty">No photos were submitted, so there’s nothing to vote on here.</div></div>';
    } else {
      function drawPhotos() {
        holder.innerHTML = '<div class="vcat"><div class="vcat-h">Best Photo of the Evening</div>' +
          '<p class="rank-help">Tap up to <b>3</b> favorites. You can’t vote for your own. (' + picks.length + '/3 selected)</p>' +
          '<div class="pv-grid">' + allPhotos.map((p) => {
            const on = picks.indexOf(p.id) >= 0;
            return '<div class="pv-ph' + (on ? " on" : "") + (p.mine ? " own" : "") + '" data-id="' + p.id + '">' +
              '<img src="' + photoURL(p.thumb_path) + '" alt="">' +
              (p.mine ? '<span class="pv-tag">Yours</span>' : (on ? '<span class="pv-tick">✓</span>' : "")) +
              '<span class="pv-owner">' + esc(p.owner_name) + "</span></div>";
          }).join("") + "</div></div>";
        holder.querySelectorAll(".pv-ph").forEach((el) => (el.onclick = () => togglePick(el.dataset.id)));
      }
      async function togglePick(id) {
        const ph = allPhotos.find((x) => x.id === id);
        if (ph && ph.mine) { toast("You can’t vote for your own photo.", true); return; }
        const at = picks.indexOf(id);
        if (at >= 0) picks.splice(at, 1);
        else { if (picks.length >= 3) { toast("You’ve already picked 3.", true); return; } picks.push(id); }
        const r = await sb.rpc("set_photo_votes", { p_voter: voter, p_ids: picks });
        if (!r.data || !r.data.ok) { toast(r.data && r.data.error === "CLOSED" ? "Voting has closed." : "Couldn’t save that pick.", true); if (at >= 0) picks.push(id); else picks = picks.filter((x) => x !== id); }
        drawPhotos();
      }
      drawPhotos();
    }
  }

  // ---------- PHOTO HELPERS ----------
  function photoURL(path) {
    try { return sb.storage.from("photos").getPublicUrl(path).data.publicUrl; }
    catch (e) { return ""; }
  }
  // resize + re-encode to JPEG; returns a Blob. maxEdge caps the long side.
  function processImage(file, maxEdge, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cv.toBlob((b) => b ? resolve(b) : reject(new Error("encode failed")), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This file could not be read as an image.")); };
      img.src = url;
    });
  }

  // ---------- PHOTO CONTEST: upload & manage ----------
  async function renderPhotos() {
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Photo Contest", "Submissions") +
      '<div class="body" id="pb"><div class="loading" style="min-height:40vh"><div class="spinner"></div></div></div></div></div>';
    const owner = me() || CARD;
    const { data: mine } = await sb.rpc("get_my_photos", { p_owner: owner });
    let list = mine || [];

    function draw() {
      const remaining = 4 - list.length;
      const grid = list.length ? list.map((p) =>
        '<div class="mine-ph"><img src="' + photoURL(p.thumb_path) + '" alt="">' +
        '<button class="ph-x" data-id="' + p.id + '">✕</button></div>').join("") : "";
      document.getElementById("pb").innerHTML =
        '<button class="back" id="back">‹ Account</button>' +
        '<div class="th">Best Photo of the Evening</div>' +
        '<p class="ballot-intro">Submit up to <b>4</b> photos for the contest. Every photo must include <b>3 or more people</b>. Later, everyone votes for their favorites.</p>' +
        (list.length ? '<div class="mine-grid">' + grid + "</div>" : '<div class="photo-empty">No photos yet. Add your first below.</div>') +
        '<div class="ph-count">' + list.length + " of 4 submitted</div>" +
        (remaining > 0
          ? '<label class="ph-check"><input type="checkbox" id="cert"> Every photo I add includes <b>3 or more people</b>.</label>' +
            '<label class="btn btn-photo ph-add" id="addBtn" aria-disabled="true">📸&nbsp;&nbsp;Choose photos to add' +
            '<input type="file" id="file" accept="image/*" multiple hidden></label>' +
            '<div id="upmsg" class="msg" style="text-align:center"></div>'
          : '<div class="photo-closed">You’ve submitted the maximum of 4. Remove one to swap it out.</div>') +
        (list.length
          ? '<p class="ph-review">Happy with these? Lock them in below. You can still come back and change them until voting starts.</p>' +
            '<button class="btn btn-vote" id="submitPhotos">✓&nbsp;&nbsp;Submit my ' + list.length + (list.length === 1 ? ' photo' : ' photos') + '</button>'
          : "") +
        '<button class="btn btn-ghost" id="toGallery2" style="margin-top:8px">🖼&nbsp;&nbsp;View the gallery</button>';

      document.getElementById("back").onclick = () => renderDashboard();
      document.getElementById("toGallery2").onclick = () => renderGallery();
      const sp = document.getElementById("submitPhotos");
      if (sp) sp.onclick = () => renderPhotosDone(list.length);
      document.querySelectorAll(".ph-x").forEach((b) => (b.onclick = () => removeOne(b.dataset.id)));
      if (remaining > 0) {
        const cert = document.getElementById("cert");
        const addBtn = document.getElementById("addBtn");
        const file = document.getElementById("file");
        const sync = () => addBtn.setAttribute("aria-disabled", cert.checked ? "false" : "true");
        cert.onchange = sync; sync();
        addBtn.onclick = (e) => { if (!cert.checked) { e.preventDefault(); toast("Please confirm the 3-or-more-people rule first.", true); } };
        file.onchange = () => uploadFiles(file.files);
      }
    }

    async function removeOne(id) {
      const r = await sb.rpc("remove_my_photo", { p_owner: owner, p_id: id });
      if (r.data && r.data.ok) { list = list.filter((p) => p.id !== id); toast("Removed."); draw(); }
      else toast(r.data && r.data.error === "CLOSED" ? "Submissions are closed." : "Couldn’t remove.", true);
    }

    async function uploadFiles(files) {
      const msg = document.getElementById("upmsg");
      const slots = 4 - list.length;
      const chosen = Array.prototype.slice.call(files, 0, slots);
      if (files.length > slots) toast("Only " + slots + " slot(s) left — using the first " + slots + ".");
      for (let i = 0; i < chosen.length; i++) {
        const f = chosen[i];
        msg.className = "msg"; msg.textContent = "Uploading photo " + (i + 1) + " of " + chosen.length + "…";
        try {
          if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)) throw new Error("Not an image.");
          const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
          const fullBlob = await processImage(f, 4096, 0.92);
          const thumbBlob = await processImage(f, 480, 0.8);
          const fullPath = owner + "/" + id + "_full.jpg";
          const thumbPath = owner + "/" + id + "_thumb.jpg";
          const up1 = await sb.storage.from("photos").upload(fullPath, fullBlob, { contentType: "image/jpeg", upsert: false });
          if (up1.error) throw up1.error;
          const up2 = await sb.storage.from("photos").upload(thumbPath, thumbBlob, { contentType: "image/jpeg", upsert: false });
          if (up2.error) throw up2.error;
          const r = await sb.rpc("submit_photo", { p_owner: owner, p_full: fullPath, p_thumb: thumbPath });
          if (!r.data || !r.data.ok) throw new Error(r.data && r.data.error === "LIMIT" ? "You’ve reached 4 photos." : (r.data && r.data.error === "CLOSED" ? "Submissions are closed." : "Save failed."));
          list.push({ id: r.data.id, full_path: fullPath, thumb_path: thumbPath });
        } catch (err) {
          msg.className = "msg err"; msg.textContent = (err && err.message) ? err.message : "Upload failed.";
          draw(); return;
        }
      }
      toast("Photos added — thank you!"); draw();
    }

    draw();
  }

  // ---------- PHOTO CONTEST: submitted confirmation ----------
  function renderPhotosDone(n) {
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Photo Contest", "Submitted") +
      '<div class="body"><div class="receipt">' +
      '<div class="check">✓</div><h2>You’re in the running</h2>' +
      '<div class="sub">You submitted <b>' + n + (n === 1 ? "</b> photo" : "</b> photos") + ' for <b>Best Photo of the Evening</b>.</div>' +
      '<div class="stamp">✦ Received by Holiday Finance ✦</div>' +
      '<div class="taptip">You can still add or swap photos until voting begins.</div>' +
      '<div style="max-width:280px;margin:14px auto 0">' +
      '<button class="btn btn-gold" id="home">Back to my account</button>' +
      '<button class="btn btn-ghost" id="gal" style="margin-top:8px">🖼&nbsp;&nbsp;See the gallery</button>' +
      '<button class="switch-link" id="edit">Add or change my photos</button>' +
      "</div></div></div></div></div>";
    document.getElementById("home").onclick = () => renderDashboard();
    document.getElementById("gal").onclick = () => renderGallery();
    document.getElementById("edit").onclick = () => renderPhotos();
  }

  // ---------- PHOTO CONTEST: gallery ----------
  async function renderGallery() {
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Photo Gallery", "The Evening") +
      '<div class="body" id="gb"><div class="loading" style="min-height:40vh"><div class="spinner"></div></div></div></div></div>';
    const { data } = await sb.rpc("list_gallery");
    const photos = data || [];
    const gb = document.getElementById("gb");
    gb.innerHTML =
      '<button class="back" id="back">‹ Account</button>' +
      '<div class="th">The Gallery</div>' +
      (photos.length
        ? '<div class="gal-grid">' + photos.map((p, i) =>
            '<div class="gal-ph" data-i="' + i + '"><img src="' + photoURL(p.thumb_path) + '" alt="">' +
            '<span>' + esc(p.owner_name) + "</span></div>").join("") + "</div>"
        : '<div class="photo-empty">No photos have been submitted yet. Check back soon.</div>');
    document.getElementById("back").onclick = () => renderDashboard();
    gb.querySelectorAll(".gal-ph").forEach((el) => (el.onclick = () => lightbox(photos, parseInt(el.dataset.i, 10))));
  }
  function lightbox(photos, i) {
    const p = photos[i];
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<button class="lb-close">✕</button>' +
      (i > 0 ? '<button class="lb-nav lb-prev">‹</button>' : "") +
      (i < photos.length - 1 ? '<button class="lb-nav lb-next">›</button>' : "") +
      '<div class="lb-inner"><img src="' + photoURL(p.full_path) + '" alt="">' +
      '<div class="lb-cap">Submitted by ' + esc(p.owner_name) + "</div></div>";
    document.body.appendChild(lb);
    const close = () => lb.remove();
    lb.querySelector(".lb-close").onclick = close;
    lb.onclick = (e) => { if (e.target === lb) close(); };
    const prev = lb.querySelector(".lb-prev"), next = lb.querySelector(".lb-next");
    if (prev) prev.onclick = () => { close(); lightbox(photos, i - 1); };
    if (next) next.onclick = () => { close(); lightbox(photos, i + 1); };
  }

  // ---------- QUICK-PAY (you tapped someone else's card) ----------
  async function renderQuickPay(target) {
    const vs = await sb.rpc("get_my_voting", { p_voter: me() || CARD });
    if (vs && vs.data && vs.data.money_locked) {
      root.innerHTML = '<div class="center"><div class="phone">' + bar("Quick Pay", "Closed") +
        '<div class="body"><button class="back" id="back">‹ My account</button>' +
        '<div class="money-locked" style="margin-top:16px">💰 Transfers are closed for the awards. Tap below to head back.</div>' +
        '<button class="btn btn-gold" id="home" style="margin-top:14px">Back to my account</button></div></div></div>';
      document.getElementById("back").onclick = () => (location.href = "card.html?id=" + encodeURIComponent(me() || CARD));
      document.getElementById("home").onclick = () => (location.href = "card.html?id=" + encodeURIComponent(me() || CARD));
      return;
    }
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Quick Pay", "Auditable") +
      '<div class="body">' +
      '<button class="back" id="back">‹ My account</button>' +
      '<div class="qp-target">' + photoTag(target, "") +
      "<h2>Pay " + esc(target.character_name) + "</h2>" +
      '<div class="role">' + esc(target.role) + " · " + esc(target.card_id) + "</div></div>" +
      '<div class="amtbox"><div class="lbl">Amount</div>' +
      '<div class="inp"><span>$</span><input id="amt" class="fr" inputmode="numeric" placeholder="0"></div></div>' +
      '<div class="fieldlbl">Memo (optional)</div>' +
      '<input class="amtfield" id="memo" style="font-size:15px;font-family:Archivo;text-align:left" placeholder="e.g. you didn’t see anything" maxlength="60">' +
      '<div class="fieldlbl">Your 3-digit access code</div>' +
      '<input id="pin" class="pinfield" inputmode="numeric" maxlength="3" placeholder="•••">' +
      '<div id="xmsg" class="msg" style="text-align:center"></div>' +
      '<button class="btn btn-gold" id="send" style="margin-top:12px">Send to ' + esc(target.character_name.split(" ")[0]) + "</button>" +
      '<button class="switch-link" id="mine">This is actually my card →</button>' +
      "</div></div></div>";
    document.getElementById("back").onclick = () => (location.href = "card.html?id=" + encodeURIComponent(me()));
    document.getElementById("mine").onclick = () => { setMe(CARD); state.acc = null; renderDashboard(); };
    document.getElementById("send").onclick = () =>
      doTransfer(me(), CARD, document.getElementById("xmsg"), document.getElementById("send"));
  }

  async function doTransfer(from, to, msgEl, btnEl) {
    const amt = parseInt((document.getElementById("amt").value || "").replace(/[^0-9]/g, ""), 10);
    const pin = (document.getElementById("pin").value || "").trim();
    const memo = (document.getElementById("memo") ? document.getElementById("memo").value : "").trim();
    if (!amt || amt <= 0) { msgEl.className = "msg err"; msgEl.textContent = ERR.BAD_AMOUNT; return; }
    if (!/^[0-9]{3}$/.test(pin)) { msgEl.className = "msg err"; msgEl.textContent = ERR.BAD_PIN_FORMAT; return; }
    btnEl.disabled = true; btnEl.textContent = "Sending…";
    const { data, error } = await sb.rpc("transfer_funds", {
      p_from: from, p_to: to, p_amount: amt, p_pin: pin, p_note: memo || null
    });
    if (error || !data || !data.ok) {
      btnEl.disabled = false; btnEl.textContent = "Send";
      msgEl.className = "msg err"; msgEl.textContent = errText(data && data.error); return;
    }
    renderReceipt(data.recipient, amt, data.new_balance);
  }

  function renderReceipt(recipName, amt, newbal) {
    root.innerHTML = '<div class="center"><div class="phone">' + bar("Transfer Complete", "Approved") +
      '<div class="body"><div class="receipt">' +
      '<div class="check">✓</div><h2>Transfer complete</h2>' +
      '<div class="sub">You sent <b>' + fmt(amt) + "</b> to <b>" + esc(recipName) + "</b>.</div>" +
      '<div class="newbal"><div class="k">New balance</div><div class="v">' + fmt(newbal) + "</div></div>" +
      '<div class="stamp">✦ Approved by Holiday Finance ✦</div>' +
      '<div style="max-width:280px;margin:0 auto">' +
      '<button class="btn btn-gold" id="home">Return to account</button>' +
      '<a class="btn btn-ghost" href="leaderboard.html" style="margin-top:8px;text-decoration:none;text-align:center">See the leaderboard</a>' +
      "</div></div></div></div></div>";
    document.getElementById("home").onclick = () => (location.href = "card.html?id=" + encodeURIComponent(me() || CARD));
  }

  function renderNotFound(title, body) {
    root.innerHTML = '<div class="notfound"><div class="seal">K</div><h1>' + esc(title) + "</h1><p>" + esc(body) + "</p></div>";
  }

  // ---------- ROUTER ----------
  async function init() {
    if (!CARD) { renderNotFound("No card detected", "Tap your Krangle Capital card to your phone to begin."); return; }
    const acc = await fetchAccount(CARD);
    if (!acc) { renderNotFound("Card not recognized", "This card isn’t in the system. Check with the host."); return; }
    state.acc = acc;
    if (!acc.pin_set) { renderActivation(acc); return; }
    const m = me();
    if (m && m !== CARD) { renderQuickPay(acc); return; }
    if (!m) setMe(CARD);
    renderDashboard();
  }
  init();
})();
