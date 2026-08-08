/* "Your tax letter" — the reader enters a salary, we compute income tax and
   employee NI for 2025-26 and split the bill across spending categories the
   way HMRC's Annual Tax Summary does, with a toggle to see the same letter
   as the public imagines the budget to be. */
import { C, fmt } from "../lib.js";
import { incomeTax, nationalInsurance, apportion } from "../tax.js";

export function calculator(el, spending, perceptions, onYou) {
  const state = { salary: 35000, period: "year", view: "reality" };

  const wrap = d3.select(el);
  const controls = wrap.append("div").attr("class", "calc-controls");

  // salary
  const f1 = controls.append("div").attr("class", "calc-field");
  f1.append("label").text("Your salary, before tax");
  const inc = f1.append("input").attr("type", "number").attr("min", 0).attr("step", 500)
    .property("value", state.salary);
  inc.on("input", function () { state.salary = +this.value || 0; render(); });

  // per year / per month
  const f2 = controls.append("div").attr("class", "calc-field");
  f2.append("label").text("Shown per");
  const segP = f2.append("div").attr("class", "seg");
  for (const k of ["year", "month"]) {
    segP.append("button").attr("data-k", k).text(k)
      .on("click", () => { state.period = k; render(); });
  }

  // reality / perception view — only if a survey-based letter is available
  const hasGuess = Array.isArray(perceptions.letter_guess) && perceptions.letter_guess.length > 0;
  let segV = null;
  if (hasGuess) {
    const f3 = controls.append("div").attr("class", "calc-field");
    f3.append("label").text("Split by");
    segV = f3.append("div").attr("class", "seg");
    for (const [k, lab] of [["reality", "the real budget"], ["guess", "the public's guess"]]) {
      segV.append("button").attr("data-k", k).text(lab)
        .on("click", () => { state.view = k; render(); });
    }
  }

  wrap.append("p").attr("class", "calc-help").text(
    "Gross annual salary, employment income only. Uses 2025-26 rates for England, " +
    "Wales and Northern Ireland, employee National Insurance included.");

  const result = wrap.append("div").attr("class", "calc-result");
  const rank = result.append("p").attr("class", "calc-rank").node();
  const sub = result.append("p").attr("class", "calc-people").node();
  const rows = result.append("div").attr("class", "letter-rows");
  const total = result.append("div").attr("class", "letter-total");

  // Guess shares: survey categories where we have a public estimate, the rest
  // of the pound scaled down proportionally so the imagined letter still sums.
  function guessShares() {
    const guessed = new Map(perceptions.letter_guess.map(g => [g.key, g.perceived]));
    const cats = spending.categories;
    const guessedTotal = cats.reduce((a, c) => a + (guessed.get(c.key) ?? 0), 0);
    const restActual = cats.reduce((a, c) => a + (guessed.has(c.key) ? 0 : c.share), 0);
    const scale = Math.max(0, 100 - guessedTotal) / restActual;
    return cats.map(c => ({
      ...c,
      share: guessed.has(c.key) ? guessed.get(c.key) : c.share * scale,
    }));
  }

  function render() {
    segP.selectAll("button").classed("on", function () { return this.dataset.k === state.period; });
    segV?.selectAll("button").classed("on", function () { return this.dataset.k === state.view; });

    const it = incomeTax(state.salary);
    const ni = nationalInsurance(state.salary);
    const bill = it + ni;
    const div = state.period === "month" ? 12 : 1;
    const per = state.period === "month" ? " a month" : " a year";

    const headline = (lead, value, tail) => {
      const a = document.createElement("span"); a.textContent = lead;
      const num = document.createElement("span"); num.className = "num"; num.textContent = value;
      const t = document.createElement("span"); t.textContent = tail;
      rank.replaceChildren(a, num, t);
    };

    if (bill < 0.005) {
      headline("On this salary you pay ", "no", " income tax or National Insurance.");
      sub.textContent = "Everything below the £12,570 personal allowance goes untaxed. " +
        "You still pay VAT and duties every time you spend, but they are outside this letter.";
      rows.selectAll("*").remove();
      total.selectAll("*").remove();
      onYou?.(null);
      return;
    }

    headline("You pay ", fmt.gbp(bill / div), per + " in income tax and NI.");
    sub.textContent =
      `Income tax ${fmt.gbp(it / div)}, National Insurance ${fmt.gbp(ni / div)}. ` +
      (state.view === "reality"
        ? "Split the way HMRC's own Annual Tax Summary letter splits it:"
        : "Now split the way the average survey respondent imagines the budget:");

    const cats = state.view === "reality" ? spending.categories : guessShares();
    const split = apportion(bill / div, cats)
      .sort((a, b) => b.amount - a.amount);
    const maxAmt = split[0].amount;

    const money = v => fmt.gbp2(v);

    rows.selectAll("div.letter-row").data(split, d => d.key)
      .join(
        enter => {
          const r = enter.append("div").attr("class", "letter-row");
          r.append("span").attr("class", "cat");
          r.append("div").attr("class", "bar").append("span").style("width", "0%");
          r.append("span").attr("class", "amt");
          return r;
        })
      .classed("guessed", state.view === "guess")
      .order()
      .call(r => {
        r.select(".cat").text(d => d.label);
        r.select(".bar > span").transition().duration(500)
          .style("width", d => (100 * d.amount / maxAmt) + "%");
        r.select(".amt").text(d => money(d.amount));
      });

    total.selectAll("*").remove();
    total.append("span").text("Total" + per);
    total.append("span").text(money(split.reduce((a, d) => a + d.amount, 0)));

    onYou?.({ salary: state.salary, it, ni, bill });
  }

  render();
  return {};
}
