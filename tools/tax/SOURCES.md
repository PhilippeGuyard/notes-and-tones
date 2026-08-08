# Tax essay — data provenance

The four JSON files in `essays/tax/data/` were hand-curated from published
sources (no fetch pipeline; the source tables are one-off downloads). This
file records where every number came from so the data can be refreshed.

## spending.json
- Percentages: HMRC Annual Tax Summary methodology, 2024-25 shares.
  https://www.gov.uk/government/publications/how-public-spending-was-calculated-in-your-tax-summary/how-public-spending-was-calculated-in-your-tax-summary
- £bn: HM Treasury Public Spending Statistics July 2026, Table 4.2
  (2024-25 nominal outturn). The HMRC shares apportion "public sector
  expenditure on services" (£1,166.5bn), not TME (£1,290bn); the shares
  reconcile against Table 4.2 to within rounding (e.g. Welfare 21.3% x
  1,166.5 = £248.5bn = social protection £386.3bn minus state pensions
  £139bn, approximately).
- Shares sum to 100.1 through rounding; `apportion()` in js/tax.js
  normalises by the actual total.

## data/static/perceptions.json
- letter_guess: YouGov, "Perceptions of how tax is spent differ widely from
  reality" (9 Nov 2014). Mean guessed division of the respondent's own
  income tax + NI across the Treasury's 15 tax-statement categories,
  digitised from the article's charts (labels explicit on each slice).
  Sample size unpublished in the article.
  https://yougov.co.uk/politics/articles/10913-public-attitudes-tax-distribution
- Benefit fraud guess (24% vs 0.7%), aid-as-top-item factoid, JSA-vs-pensions:
  Ipsos MORI / RSS / KCL, "Perceptions are not reality" (2013).
  https://www.ipsos.com/en-uk/perceptions-are-not-reality
- Welfare-to-unemployed guess (41% vs 3%) and fraud (27%): TUC-commissioned
  YouGov poll (fieldwork 2012, published Jan 2013).
  https://www.tuc.org.uk/news/support-benefit-cuts-dependent-ignorance-tuc-commissioned-poll-finds
- Direction check: YouGov "Government spending areas: perception vs reality"
  (Nov 2025, pairwise ranking, no % guesses): public now over-rank debt
  interest, public order and aid; under-rank pensions, education, transport.
  https://yougov.co.uk/politics/articles/53415-government-spending-areas-perception-vs-reality

## welfare.json
- DWP benefit expenditure and caseload tables, Spring 2026 edition
  (2024-25 outturn, GB, nominal); child benefit is UK-wide, paid by HMRC.
  https://www.gov.uk/government/publications/benefit-expenditure-and-caseload-tables-2026
- UK welfare total £314.9bn includes Northern Ireland (~£9.7bn).
- UC (£66.7bn) bundles housing/children/incapacity/job-search elements;
  the tables do not split it. Winter fuel was £0.3bn in 2024-25 only
  because of that year's means-testing change (previously ~£2bn).

## debt_interest.json
- OBR public finances databank, July 2026: central government debt interest
  net of Asset Purchase Facility flows (NMFX+MU74) and TME (KX5Q).
  https://obr.uk/data/
- ONS/PESA gross public sector debt interest 2024-25 was £126.5bn, which is
  what the HMRC letter's 10.8% reflects; the chart states the net measure.
- The 2020-21 dip (£25.2bn) is a real RPI/gilt effect during COVID.
- Comparators (education £123.0bn, defence £63.7bn): HMT PSS July 2026
  Table 4.2, 2024-25 outturn.

## Calculator parameters (js/tax.js)
- gov.uk "Rates and thresholds for employers 2025 to 2026": PA £12,570
  (tapered £1 per £2 over £100,000), 20% to £37,700 taxable, 40% to
  £125,140 taxable, 45% above; employee Class 1 NI 8% between £12,570 and
  £50,270, 2% above. Bands unchanged for 2026-27 (thresholds frozen).
- Reference case: £50,000 salary -> £7,486.00 income tax, £2,994.40 NI.
