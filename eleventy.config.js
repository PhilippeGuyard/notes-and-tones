module.exports = function (eleventyConfig) {
  // Essay HTML must never be run through a template engine (inline JS, braces).
  // Only .njk files and layouts are templated.
  eleventyConfig.setTemplateFormats(["html", "njk"]);

  for (const p of [
    "styles.css",
    "robots.txt",
    "assets",
    "essays/!(*.11tydata).js",
    "essays/carbon-snapshot.json",
    "essays/rudolph/assets",
    "essays/rudolph/build_assets.py",
    "essays/futures/css",
    "essays/futures/js",
    "essays/futures/data",
    "essays/summer/css",
    "essays/summer/js",
    "essays/summer/data",
    "essays/footprint/css",
    "essays/footprint/js",
    "essays/footprint/data",
    "essays/climate/css",
    "essays/climate/js",
    "essays/climate/data",
    "essays/immigration/css",
    "essays/immigration/js",
    "essays/immigration/data",
    "essays/income/css",
    "essays/income/js",
    "essays/income/data",
    "essays/tax/css",
    "essays/tax/js",
    "essays/tax/data",
  ]) {
    eleventyConfig.addPassthroughCopy(p);
  }

  // "6 August 2026" — matches the hand-written dates exactly
  eleventyConfig.addFilter("essayDate", (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    })
  );

  return {
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
  };
};
