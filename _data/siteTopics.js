// Canonical topic list: pill order, slugs and display labels.
// Essays reference these slugs in their `topics` front matter; the
// `topicList` filter in eleventy.config.js fails the build on unknown slugs.
// Named siteTopics (not topics) so the data cascade never deep-merges this
// array into an essay's front-matter `topics`.
module.exports = [
  { slug: "probability", label: "Probability & statistics" },
  { slug: "climate", label: "Climate & energy" },
  { slug: "society", label: "Society" },
  { slug: "genetics", label: "Genetics" },
  { slug: "maths-physics", label: "Maths & physics" },
];
