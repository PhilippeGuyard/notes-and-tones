/* ============================================================
   To Switch, or Not to Switch? — interactive logic
   Three widgets:
     1) "Play it yourself" — a real Monty Hall round with a
        running scoreboard split by strategy
     2) "Run it a thousand times" — accumulating simulator +
        convergence chart toward 2/3 and 1/3
     3) "Where the extra odds come from" — N-doors slider
   No innerHTML anywhere; nodes are built with createElement.
   ============================================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const rand = (n) => Math.floor(Math.random() * n);
  const pct = (w, t) => (t ? (w / t) * 100 : 0);

  /* ---------------------------------------------------------
     WIDGET 1 — play a real round
     A round: car placed at random, you pick, host reveals a
     goat from the doors you did not pick, you stay or switch.
     Wins are tallied separately for the two strategies so the
     2/3 vs 1/3 split emerges from your own play.
     --------------------------------------------------------- */
  const CAR = "🚗";
  const GOAT = "🐐";
  const doorsBox = $("doors");
  const promptEl = $("game-prompt");
  const actionsBox = $("game-actions");

  const tally = { swWins: 0, swTot: 0, stWins: 0, stTot: 0 };
  let car = 0;        // door hiding the car
  let picked = -1;    // door the player chose
  let hostDoor = -1;  // door the host opened (a goat)
  let phase = "pick"; // pick | choose | done
  const doorEls = [];

  function buildDoors() {
    doorsBox.replaceChildren();
    doorEls.length = 0;
    for (let i = 0; i < 3; i++) {
      const btn = el("button", "door");
      btn.type = "button";
      btn.dataset.door = String(i);
      btn.setAttribute("aria-label", `Door ${i + 1}`);
      const num = el("span", "door-num", String(i + 1));
      const prize = el("span", "door-prize");
      btn.append(num, prize);
      btn.addEventListener("click", () => onDoorClick(i));
      doorsBox.append(btn);
      doorEls.push(btn);
    }
  }

  function openDoor(i, prizeChar) {
    const btn = doorEls[i];
    btn.classList.add("is-open", prizeChar === CAR ? "has-car" : "has-goat");
    btn.querySelector(".door-prize").textContent = prizeChar;
  }

  function setActions(buttons) {
    actionsBox.replaceChildren();
    buttons.forEach((b) => actionsBox.append(b));
  }

  function actionBtn(label, cls, fn) {
    const b = el("button", "act " + cls, label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }

  function newRound() {
    car = rand(3);
    picked = -1;
    hostDoor = -1;
    phase = "pick";
    buildDoors();
    promptEl.textContent = "Pick a door.";
    actionsBox.replaceChildren();
  }

  function onDoorClick(i) {
    if (phase !== "pick") return;
    picked = i;
    doorEls[i].classList.add("is-picked");
    // host opens a goat door that is neither the pick nor the car
    const options = [0, 1, 2].filter((d) => d !== picked && d !== car);
    hostDoor = options[rand(options.length)];
    openDoor(hostDoor, GOAT);
    doorEls.forEach((d, idx) => {
      if (idx !== picked && idx !== hostDoor) d.classList.add("is-switch-target");
    });
    phase = "choose";
    promptEl.textContent =
      `You chose Door ${picked + 1}. The host opens Door ${hostDoor + 1} to show a goat. Stay, or switch?`;
    setActions([
      actionBtn("Stay with Door " + (picked + 1), "act-stay", () => resolve(false)),
      actionBtn("Switch", "act-switch", () => resolve(true)),
    ]);
  }

  function resolve(didSwitch) {
    if (phase !== "choose") return;
    const other = [0, 1, 2].find((d) => d !== picked && d !== hostDoor);
    const finalDoor = didSwitch ? other : picked;
    const won = finalDoor === car;

    // reveal everything
    doorEls.forEach((d, idx) => {
      if (!d.classList.contains("is-open")) openDoor(idx, idx === car ? CAR : GOAT);
    });
    doorEls[finalDoor].classList.add("is-final");

    if (didSwitch) { tally.swTot++; if (won) tally.swWins++; }
    else { tally.stTot++; if (won) tally.stWins++; }
    updateScore();

    phase = "done";
    promptEl.textContent = won
      ? `You ${didSwitch ? "switched" : "stayed"} and won the car! 🎉`
      : `You ${didSwitch ? "switched" : "stayed"} and got a goat.`;
    setActions([actionBtn("Play again ↺", "act-again", newRound)]);
  }

  function updateScore() {
    $("sw-frac").textContent = `${tally.swWins} / ${tally.swTot}`;
    $("st-frac").textContent = `${tally.stWins} / ${tally.stTot}`;
    $("sw-pct").textContent = tally.swTot ? pct(tally.swWins, tally.swTot).toFixed(0) + "%" : "–";
    $("st-pct").textContent = tally.stTot ? pct(tally.stWins, tally.stTot).toFixed(0) + "%" : "–";
  }

  if (doorsBox) newRound();

  /* ---------------------------------------------------------
     WIDGET 2 — simulator + convergence chart
     For each game: guess and car are independent uniforms.
     Switching wins exactly when the first guess was wrong;
     staying wins when it was right. Games accumulate across
     presses so the running rates visibly tighten.
     --------------------------------------------------------- */
  const sim = { swWins: 0, stWins: 0, total: 0, hist: [], running: false };
  const chart = $("sim-chart");
  const C = { W: 680, H: 260, l: 40, r: 12, t: 14, b: 26 };
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const cx = (g, maxG) => C.l + (g / Math.max(maxG, 1)) * (C.W - C.l - C.r);
  const cy = (p) => C.t + (1 - p / 100) * (C.H - C.t - C.b);

  function refLine(p, label, cls) {
    const y = cy(p);
    const ln = svgEl("line", { x1: C.l, y1: y, x2: C.W - C.r, y2: y, class: "sim-ref " + cls });
    const tx = svgEl("text", { x: C.l - 6, y: y + 3, class: "sim-ref-lab", "text-anchor": "end" });
    tx.textContent = label;
    return [ln, tx];
  }

  function drawChart() {
    chart.replaceChildren();
    // axis baseline
    chart.append(svgEl("line", { x1: C.l, y1: cy(0), x2: C.W - C.r, y2: cy(0), class: "sim-axis" }));
    refLine(66.7, "66.7", "ref-switch").forEach((n) => chart.append(n));
    refLine(33.3, "33.3", "ref-stay").forEach((n) => chart.append(n));

    if (sim.hist.length > 1) {
      const maxG = sim.hist[sim.hist.length - 1].g;
      const path = (key, cls) => {
        const pts = sim.hist.map((h) => `${cx(h.g, maxG).toFixed(1)},${cy(h[key]).toFixed(1)}`).join(" ");
        chart.append(svgEl("polyline", { points: pts, class: "sim-line " + cls }));
      };
      path("sw", "line-switch");
      path("st", "line-stay");
    }
  }

  function updateSimReadouts() {
    const swp = pct(sim.swWins, sim.total);
    const stp = pct(sim.stWins, sim.total);
    $("sim-sw-pct").textContent = swp.toFixed(1);
    $("sim-st-pct").textContent = stp.toFixed(1);
    $("sim-sw-sub").textContent = `${sim.swWins.toLocaleString("en-GB")} wins / ${sim.total.toLocaleString("en-GB")}`;
    $("sim-st-sub").textContent = `${sim.stWins.toLocaleString("en-GB")} wins / ${sim.total.toLocaleString("en-GB")}`;
  }

  function runBatch(remaining) {
    const perFrame = 25;
    const n = Math.min(perFrame, remaining);
    for (let i = 0; i < n; i++) {
      const carPos = rand(3);
      const guess = rand(3);
      if (guess === carPos) sim.stWins++;  // staying wins
      else sim.swWins++;                    // switching wins
      sim.total++;
    }
    sim.hist.push({ g: sim.total, sw: pct(sim.swWins, sim.total), st: pct(sim.stWins, sim.total) });
    // keep the history light
    if (sim.hist.length > 400) sim.hist = sim.hist.filter((_, i) => i % 2 === 0 || i === sim.hist.length - 1);
    updateSimReadouts();
    drawChart();
    remaining -= n;
    if (remaining > 0) requestAnimationFrame(() => runBatch(remaining));
    else sim.running = false;
  }

  function resetSim() {
    sim.swWins = sim.stWins = sim.total = 0;
    sim.hist = [];
    updateSimReadouts();
    drawChart();
  }

  if (chart) {
    resetSim();
    $("sim-run").addEventListener("click", () => {
      if (sim.running) return;
      sim.running = true;
      runBatch(1000);
    });
    $("sim-reset").addEventListener("click", () => {
      if (sim.running) return;
      resetSim();
    });
  }

  /* ---------------------------------------------------------
     WIDGET 3 — N doors
     Stay wins 1/N; switch wins (N-1)/N; host opens N-2 goats.
     --------------------------------------------------------- */
  const nd = $("ndoors");

  function renderDoors() {
    const n = parseInt(nd.value, 10);
    const stay = 100 / n;
    const sw = 100 * (n - 1) / n;
    $("nd-count").textContent = n;
    $("nd-open").textContent = (n - 2).toLocaleString("en-GB");
    $("nd-stay").textContent = stay.toFixed(stay < 1 ? 1 : stay < 10 ? 1 : 1) + "%";
    $("nd-switch").textContent = sw.toFixed(1) + "%";

    const cap = $("nd-cap");
    if (n === 3) {
      cap.textContent =
        "The classic game. Your door keeps its one-in-three chance; the other closed door carries the rest.";
    } else {
      cap.textContent =
        `Pick 1 door out of ${n} (a ${stay.toFixed(1)}% shot). The host, who knows, opens ${n - 2} goats and leaves one other door shut. It hides the car ${sw.toFixed(1)}% of the time.`;
    }
  }

  if (nd) {
    nd.addEventListener("input", renderDoors);
    renderDoors();
  }

  /* ---------------------------------------------------------
     Scroll reveal (shared behaviour with the sibling essays)
     --------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting || e.boundingClientRect.top < window.innerHeight) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll(".prose > *, .widget, .worlds").forEach((n, i) => {
      n.classList.add("reveal");
      n.style.setProperty("--d", `${(i % 6) * 40}ms`);
      io.observe(n);
    });
    const sweep = () => {
      const vh = window.innerHeight;
      document.querySelectorAll(".reveal:not(.in)").forEach((n) => {
        if (n.getBoundingClientRect().top < vh * 0.94) n.classList.add("in");
      });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("load", () => setTimeout(sweep, 300));
    sweep();
  }
})();
