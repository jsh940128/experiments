/* Theme + language toggles for the hub pages. Neither is persisted: these are landing
   pages people pass through once, and a stored preference here would disagree with the
   main site, which keeps its own. Korean is the default, matching seunghwanlabs.com. */
(function () {
  var root = document.documentElement;
  try {
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } catch (e) { root.setAttribute("data-theme", "light"); }

  document.getElementById("theme").addEventListener("click", function () {
    root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  var nodes = document.querySelectorAll("[data-en]");
  var buttons = document.querySelectorAll(".seg button");
  function setLang(lang) {
    nodes.forEach(function (n) {
      var v = n.getAttribute("data-" + lang);
      if (v !== null) n.textContent = v;
    });
    root.setAttribute("lang", lang);
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
  }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });
  setLang("ko");
})();
