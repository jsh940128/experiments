/* Theme + language toggles for the hub pages. Neither is persisted: these are landing
   pages people pass through once, and a stored preference here would disagree with the
   main site, which keeps its own. Korean is the default and is what the HTML carries;
   the inline script in <head> sets the theme before first paint. */
(function () {
  var root = document.documentElement;

  document.getElementById("theme").addEventListener("click", function () {
    root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // Like the main site: one button that names the other language.
  var nodes = document.querySelectorAll("[data-en]");
  var langBtn = document.getElementById("lang");
  function setLang(lang) {
    nodes.forEach(function (n) {
      var v = n.getAttribute("data-" + lang);
      if (v !== null) n.textContent = v;
    });
    root.setAttribute("lang", lang);
    langBtn.textContent = lang === "ko" ? "EN" : "KO";
    langBtn.setAttribute("aria-label", lang === "ko" ? "Switch to English" : "한국어로 보기");
  }
  langBtn.addEventListener("click", function () {
    setLang(root.getAttribute("lang") === "ko" ? "en" : "ko");
  });
})();
