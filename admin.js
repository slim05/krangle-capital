/* ===== Krangle Capital — admin (host) ===== */
(function () {
  const cfg = window.KC_CONFIG || {};
  const root = document.getElementById("admin");
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("PASTE_") === 0) {
    root.innerHTML = '<div class="notfound"><div class="seal">K</div><h1>Not connected yet</h1><p>Paste your Supabase URL and key into config.js.</p></div>';
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const PW_KEY = "kc_admin_pw";
  let PW = localStorage.getItem(PW_KEY) || "";
  let players = [], txs = [], tab = "players", search = "";

  const fmt = (n) => "$" + Number(n).toLocaleString();
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let tt;
  function toast(m, e) { const t = document.getElementById("toast"); t.textContent = m; t.className = "toast show" + (e ? " err" : ""); clearTimeout(tt); tt = setTimeout(() => (t.className = "toast"), 2600); }

  async function rpc(fn, args) { return await sb.rpc(fn, args || {}); }

  // ---------- auth ----------
  async function start() {
    const setRes = await rpc("admin_password_is_set");
    const isSet = setRes.data === true;
    if (!isSet) return renderSetPassword();
    if (PW) {
      const test = await rpc("admin_list_players", { p_pw: PW });
      if (!test.error) { players = test.data; return renderDash(); }
      PW = ""; localStorage.removeItem(PW_KEY);
    }
    renderLogin();
  }

  function renderSetPassword() {
    root.innerHTML = '<div class="auth"><img class="actlogo" src="logo.png" style="width:180px" alt="">' +
      "<h1>Set your admin password</h1><p>This protects the host controls. Pick something you’ll remember — at least 4 characters.</p>" +
      '<input id="pw1" type="password" placeholder="New password">' +
      '<input id="pw2" type="password" placeholder="Confirm password">' +
      '<button class="btn btn-gold" id="go">Set password</button></div>';
    document.getElementById("go").onclick = async () => {
      const a = document.getElementById("pw1").value, b = document.getElementById("pw2").value;
      if (a.length < 4) return toast("At least 4 characters.", true);
      if (a !== b) return toast("Passwords don’t match.", true);
      const r = await rpc("set_admin_password", { p_pw: a });
      if (r.data && r.data.ok) { PW = a; localStorage.setItem(PW_KEY, a); toast("Password set."); start(); }
      else toast("Couldn’t set password.", true);
    };
  }

  function renderLogin() {
    root.innerHTML = '<div class="auth"><img class="actlogo" src="logo.png" style="width:180px" alt="">' +
      "<h1>Finance — Admin Access</h1><p>Enter your admin password.</p>" +
      '<input id="pw" type="password" placeholder="Admin password">' +
      '<button class="btn btn-gold" id="go">Enter</button></div>';
    const submit = async () => {
      const pw = document.getElementById("pw").value;
      const test = await rpc("admin_list_players", { p_pw: pw });
      if (test.error) return toast("Wrong password.", true);
      PW = pw; localStorage.setItem(PW_KEY, pw); players = test.data; renderDash();
    };
    document.getElementById("go").onclick = submit;
    document.getElementById("pw").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  }

  // ---------- data refresh ----------
  async function refreshPlayers() { const r = await rpc("admin_list_players", { p_pw: PW }); if (!r.error) players = r.data; }
  async function refreshTx() { const r = await rpc("admin_list_transactions", { p_pw: PW, p_limit: 1000 }); if (!r.error) txs = r.data; }

  // ---------- dashboard ----------
  function renderDash() {
    root.innerHTML =
      '<div class="admin"><div class="ah"><b>Krangle Capital — Admin</b><span>Host control</span></div>' +
      '<div class="abody">' +
      '<div class="tabbar">' +
      '<button data-t="players" class="' + (tab === "players" ? "on" : "") + '">Employees</button>' +
      '<button data-t="tx" class="' + (tab === "tx" ? "on" : "") + '">Transactions</button>' +
      '<button data-t="settings" class="' + (tab === "settings" ? "on" : "") + '">Game controls</button>' +
      '<button data-t="vote" class="' + (tab === "vote" ? "on" : "") + '">Voting</button>' +
      '<button data-t="logout" style="margin-left:auto">Lock</button>' +
      '</div><div id="tabbody"></div></div></div>';
    root.querySelectorAll(".tabbar button").forEach((b) => b.onclick = () => {
      const t = b.dataset.t;
      if (t === "logout") { PW = ""; localStorage.removeItem(PW_KEY); return start(); }
      tab = t; renderTab();
    });
    renderTab();
  }

  async function renderTab() {
    const body = document.getElementById("tabbody");
    if (tab === "players") { await refreshPlayers(); renderPlayers(body); }
    else if (tab === "tx") { await refreshTx(); renderTx(body); }
    else if (tab === "vote") { renderVoting(body); }
    else renderSettings(body);
  }

  function statusChips(p) {
    let s = "";
    s += p.active ? "" : '<span style="color:#b3122b;font-weight:700">·inactive</span> ';
    s += p.pin_set ? "" : '<span style="color:#8a7c60">·not activated</span> ';
    s += p.locked ? '<span style="color:#b3122b;font-weight:700">·LOCKED</span>' : "";
    return s;
  }

  function renderPlayers(body) {
    body.innerHTML =
      '<div class="tools"><input id="search" placeholder="Search employees…" value="' + esc(search) + '"></div>' +
      '<div id="ptable"></div>';
    const s = document.getElementById("search");
    s.oninput = () => { search = s.value; drawRows(); };
    drawRows();

    function drawRows() {
      const list = players.filter((p) => (p.character_name + " " + p.card_id + " " + p.role).toLowerCase().includes(search.toLowerCase()));
      const host = document.getElementById("ptable");
      host.innerHTML =
        '<table><thead><tr><th>Employee</th><th>Balance</th><th style="text-align:right">Adjust & controls</th></tr></thead><tbody>' +
        list.map((p) =>
          "<tr><td><div class=\"nm\">" + esc(p.character_name) + "</div>" +
          '<div class="id">' + esc(p.card_id) + " · " + esc(p.role) + " " + statusChips(p) + "</div></td>" +
          '<td class="bal">' + fmt(p.balance) + "</td>" +
          '<td style="text-align:right"><div class="adminadj" style="justify-content:flex-end">' +
          '<input type="number" id="amt_' + p.card_id + '" placeholder="amt" inputmode="numeric">' +
          '<input class="note" id="note_' + p.card_id + '" placeholder="note (optional)">' +
          '<button class="mini up" data-give="' + p.card_id + '">Give</button>' +
          '<button class="mini dn" data-take="' + p.card_id + '">Fine</button>' +
          '<button class="pill" data-pin="' + p.card_id + '" style="padding:5px 9px;font-size:11px">Reset PIN</button>' +
          (p.locked ? '<button class="pill" data-unlock="' + p.card_id + '" style="padding:5px 9px;font-size:11px">Unlock</button>' : "") +
          '<button class="pill" data-active="' + p.card_id + '" data-to="' + (!p.active) + '" style="padding:5px 9px;font-size:11px">' + (p.active ? "Deactivate" : "Activate") + "</button>" +
          "</div></td></tr>"
        ).join("") + "</tbody></table>";

      host.querySelectorAll("[data-give]").forEach((b) => b.onclick = () => adjust(b.dataset.give, 1));
      host.querySelectorAll("[data-take]").forEach((b) => b.onclick = () => adjust(b.dataset.take, -1));
      host.querySelectorAll("[data-pin]").forEach((b) => b.onclick = () => action("admin_reset_pin", { p_pw: PW, p_card: b.dataset.pin }, "PIN reset — they’ll re-activate on next tap."));
      host.querySelectorAll("[data-unlock]").forEach((b) => b.onclick = () => action("admin_unlock", { p_pw: PW, p_card: b.dataset.unlock }, "Account unlocked."));
      host.querySelectorAll("[data-active]").forEach((b) => b.onclick = () => action("admin_set_active", { p_pw: PW, p_card: b.dataset.active, p_active: b.dataset.to === "true" }, "Updated."));
    }
  }

  async function adjust(card, sign) {
    const amt = parseInt((document.getElementById("amt_" + card).value || "").replace(/[^0-9]/g, ""), 10);
    const note = document.getElementById("note_" + card).value.trim();
    if (!amt || amt <= 0) return toast("Enter an amount.", true);
    const r = await rpc("admin_adjust", { p_pw: PW, p_card: card, p_amount: sign * amt, p_note: note || (sign > 0 ? "Holiday bonus" : "Adjustment") });
    if (r.data && r.data.ok) { toast((sign > 0 ? "Gave " : "Fined ") + fmt(amt) + "."); await refreshPlayers(); renderPlayers(document.getElementById("tabbody")); }
    else toast("Couldn’t apply.", true);
  }
  async function action(fn, args, ok) {
    const r = await rpc(fn, args);
    if (r.data && r.data.ok) { toast(ok); await refreshPlayers(); renderPlayers(document.getElementById("tabbody")); }
    else toast("Action failed.", true);
  }

  function renderTx(body) {
    body.innerHTML =
      '<div class="tools"><button class="pill" id="csv">Export CSV</button>' +
      '<span class="note" style="margin:0">' + txs.length + ' transactions logged.</span></div>' +
      '<table><thead><tr><th>Time</th><th>From → To</th><th>Amount</th><th>Type</th></tr></thead><tbody>' +
      txs.slice(0, 200).map((t) => {
        const time = new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return "<tr><td class=\"id\">" + time + "</td><td>" + esc(t.from_name || "Krangle & Co.") + " → " + esc(t.to_name || "Krangle & Co.") +
          (t.note ? '<div class="id">' + esc(t.note) + "</div>" : "") + "</td>" +
          '<td class="bal">' + fmt(t.amount) + "</td><td class=\"id\">" + esc(t.type) + "</td></tr>";
      }).join("") + "</tbody></table>";
    document.getElementById("csv").onclick = exportCsv;
  }
  function exportCsv() {
    const head = ["time", "from", "to", "amount", "type", "note", "by"];
    const rows = txs.map((t) => [t.created_at, t.from_name || "", t.to_name || "", t.amount, t.type, (t.note || "").replace(/"/g, '""'), t.created_by]);
    const csv = [head.join(",")].concat(rows.map((r) => r.map((v) => '"' + String(v) + '"').join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "krangle_capital_transactions.csv"; a.click();
  }

  async function renderVoting(body) {
    body.innerHTML = '<div class="loading" style="min-height:30vh"><div class="spinner"></div></div>';
    const [st, themes, tally] = await Promise.all([
      rpc("get_voting_status"),
      rpc("admin_list_theme_options", { p_pw: PW }),
      rpc("admin_voting_tally", { p_pw: PW })
    ]);
    const open = !!(st.data && st.data.open);
    const themeList = (themes.error ? [] : themes.data) || [];
    const cats = (tally.data && tally.data.categories) || [];

    const tallyHtml = cats.map((c) => {
      const top = (c.standings || []).slice(0, 3);
      return '<div class="vtally"><b>' + esc(c.label) + "</b>" +
        (top.length
          ? top.map((r, i) => '<div class="vtally-row"><span>' + ["🥇", "🥈", "🥉"][i] + " " + esc(r.label) +
              '</span><span>' + (c.kind === "theme" ? r.votes + " pts" : r.votes) + "</span></div>").join("")
          : '<div class="note" style="margin:4px 0 0">No votes yet.</div>') + "</div>";
    }).join("");

    body.innerHTML =
      '<div class="vadmin-status' + (open ? " on" : "") + '">Voting is currently <b>' + (open ? "OPEN" : "CLOSED") + "</b></div>" +
      '<button class="btn ' + (open ? "btn-ghost" : "btn-gold") + '" id="vtoggle" style="margin-top:10px">' +
      (open ? "Close voting & reveal results" : "Open voting for guests") + "</button>" +
      '<p class="note">When open, guests get a “Cast your votes” button on their dashboard. Closing it unlocks the results screen: ' +
      '<b>' + location.origin + '/results.html</b></p>' +

      '<h4 class="vsec">Next Year’s Theme — options</h4>' +
      '<p class="note" style="margin-top:0">The choices guests pick from in the theme category.</p>' +
      '<div id="themeList"></div>' +
      '<div class="adminadj" style="margin-top:8px"><input id="newTheme" class="note" placeholder="Add a theme option…" style="width:210px">' +
      '<button class="pill up" id="addTheme">Add</button></div>' +

      '<h4 class="vsec">Live tally <span class="note" style="font-weight:400">(only you can see this)</span></h4>' +
      '<div class="vtally-grid">' + tallyHtml + "</div>" +

      '<div class="danger" style="margin-top:14px"><h4>Reset all votes</h4>' +
      '<p class="note" style="margin-top:0">Clears every ballot. Use before the party once testing is done.</p>' +
      '<button class="pill red" id="resetVotes">Reset votes</button></div>';

    function renderThemes(list) {
      document.getElementById("themeList").innerHTML = list.length
        ? list.map((t) => '<div class="theme-admin-row"><span>' + esc(t.label) +
            '</span><button class="pill" data-rm="' + t.id + '" style="padding:4px 9px;font-size:11px">Remove</button></div>').join("")
        : '<div class="note">No options yet — add some below.</div>';
      document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => {
        await rpc("admin_remove_theme_option", { p_pw: PW, p_id: parseInt(b.dataset.rm, 10) });
        const r = await rpc("admin_list_theme_options", { p_pw: PW });
        renderThemes(r.error ? [] : r.data); toast("Removed.");
      }));
    }
    renderThemes(themeList);

    document.getElementById("vtoggle").onclick = async () => {
      const r = await rpc("admin_set_voting_open", { p_pw: PW, p_open: !open });
      if (r.data && r.data.ok) { toast(!open ? "Voting opened." : "Voting closed."); renderVoting(body); }
      else toast("Couldn’t update.", true);
    };
    document.getElementById("addTheme").onclick = async () => {
      const v = document.getElementById("newTheme").value.trim();
      if (!v) return toast("Type an option first.", true);
      const r = await rpc("admin_add_theme_option", { p_pw: PW, p_label: v });
      if (r.data && r.data.ok) {
        const l = await rpc("admin_list_theme_options", { p_pw: PW });
        renderThemes(l.error ? [] : l.data); document.getElementById("newTheme").value = ""; toast("Added.");
      } else toast("Couldn’t add.", true);
    };
    document.getElementById("resetVotes").onclick = async () => {
      if (!confirm("Clear ALL votes? This can’t be undone.")) return;
      const r = await rpc("admin_reset_votes", { p_pw: PW });
      if (r.data && r.data.ok) { toast("Votes cleared."); renderVoting(body); }
      else toast("Failed.", true);
    };
  }

  function renderSettings(body) {
    body.innerHTML =
      '<p class="note" style="margin-top:0">Use these before the party (after testing) and for clean-up.</p>' +
      '<div class="danger"><h4>Reset balances to $1,000</h4>' +
      '<p class="note" style="margin-top:0">Sets everyone back to $1,000 and clears the transaction log. Keeps people activated (PINs stay).</p>' +
      '<button class="pill" id="rb">Reset balances</button></div>' +
      '<div class="danger"><h4>Full reset (before the party)</h4>' +
      '<p class="note" style="margin-top:0">Balances back to $1,000, transaction log cleared, AND everyone de-activated so they set a fresh PIN on party night. This is the one to run once testing is done.</p>' +
      '<button class="pill red" id="fr">Full reset</button></div>' +
      '<div class="danger" style="border-color:var(--line);background:transparent"><h4>Change admin password</h4>' +
      '<input id="np" type="password" placeholder="New password" style="width:100%;padding:10px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:8px">' +
      '<button class="pill" id="cp">Change password</button></div>';
    document.getElementById("rb").onclick = async () => {
      if (!confirm("Reset ALL balances to $1,000 and clear the transaction log?")) return;
      const r = await rpc("admin_reset_balances", { p_pw: PW, p_clear_tx: true });
      toast(r.data && r.data.ok ? "Balances reset." : "Failed.", !(r.data && r.data.ok));
    };
    document.getElementById("fr").onclick = async () => {
      if (!confirm("FULL RESET: balances to $1,000, clear all transactions, and de-activate everyone (they’ll re-set PINs). Continue?")) return;
      const r = await rpc("admin_full_reset", { p_pw: PW });
      toast(r.data && r.data.ok ? "Full reset complete." : "Failed.", !(r.data && r.data.ok));
    };
    document.getElementById("cp").onclick = async () => {
      const np = document.getElementById("np").value;
      if (np.length < 4) return toast("At least 4 characters.", true);
      const r = await rpc("admin_change_password", { p_pw: PW, p_new: np });
      if (r.data && r.data.ok) { PW = np; localStorage.setItem(PW_KEY, np); toast("Password changed."); }
      else toast("Couldn’t change password.", true);
    };
  }

  start();
})();
