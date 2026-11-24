// Shared header + footer. Edit the CALCULATORS list to change the nav everywhere.
(function () {
  var CALCULATORS = [
    ["/calorie-calculator-tdee/", "Calorie (TDEE) Calculator"],
    ["/protein-calculator-1/", "Protein Calculator"],
    ["/vo2-max-calculator/", "VO2 Max Calculator"],
    ["/1-rep-max-calculator/", "One-Rep Max Calculator"],
    ["/strength-standards-calculator/", "Strength Standards"],
    ["/muscle-gain-potential-calculator/", "Muscle Gain Calculator"],
    ["/creatine-calculator/", "Creatine Calculator"],
    ["/how-long-should-i-diet-calculator/", "How Long to Diet"],
    ["/workout-tracker/", "Workout Tracker"]
  ];

  var here = location.pathname.replace(/index\.html$/, "");
  if (here.slice(-1) !== "/") here += "/";

  var items = CALCULATORS.map(function (c) {
    var cur = c[0] === here ? ' aria-current="page"' : "";
    return '<li><a href="' + c[0] + '"' + cur + ">" + c[1] + "</a></li>";
  }).join("");

  var header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML =
    '<div class="bar">' +
    '<a class="logo" href="/" aria-label="Trainbloom home">BLOOM</a>' +
    '<nav class="nav" aria-label="Calculators">' +
    '<button class="nav-toggle" aria-expanded="false" aria-controls="nav-menu">Calculators</button>' +
    '<ul class="nav-menu" id="nav-menu">' + items + "</ul>" +
    "</nav></div>";
  document.body.insertBefore(header, document.body.firstChild);

  var nav = header.querySelector(".nav");
  var toggle = header.querySelector(".nav-toggle");
  function setOpen(open) {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!nav.classList.contains("open"));
  });
  document.addEventListener("click", function (e) {
    if (!nav.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setOpen(false); toggle.focus(); }
  });

  var year = new Date().getFullYear();
  var footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML =
    '<div class="contact">' +
    '<a href="mailto:anthony@trainbloom.com">Email me</a>' +
    "</div>" +
    '<div class="social">' +
    '<a href="https://www.instagram.com/trainbloom" target="_blank" rel="noopener" aria-label="Instagram">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>' +
    '<a href="https://www.tiktok.com/@trainbloom" target="_blank" rel="noopener" aria-label="TikTok">' +
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.36-2.49V9.66a5.73 5.73 0 0 0-.76-.05 5.69 5.69 0 0 0-5.69 5.69A5.69 5.69 0 0 0 9.86 21a5.69 5.69 0 0 0 5.68-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48z"/></svg></a>' +
    "</div>" +
    "<p>&copy; " + year + " Bodymath.io</p>" +
    '<p><a href="mailto:anthony@trainbloom.com">anthony@trainbloom.com</a></p>';
  document.body.appendChild(footer);

  // Calculator headers: split the title into letters so each one floats on its own, a beat
  // after the one before (a slow wave). Screen readers get the plain title via aria-label.
  var title = document.querySelector(".hero.sm h1");
  if (title && !title.querySelector(".fl")) {
    title.setAttribute("aria-label", title.textContent.replace(/\s+/g, " ").trim());
    var n = 0;
    Array.prototype.slice.call(title.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;                       // keep the <br> line breaks
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/( +)/).forEach(function (word) {
        if (!word) return;
        if (/^ +$/.test(word)) { frag.appendChild(document.createTextNode(" ")); return; }
        var w = document.createElement("span");
        w.className = "fl-word";                               // keeps a word's letters on one line
        word.split("").forEach(function (ch) {
          var span = document.createElement("span");
          span.className = "fl";
          span.setAttribute("aria-hidden", "true");
          span.style.animationDelay = (-n * 0.16).toFixed(2) + "s";
          span.textContent = ch;
          w.appendChild(span); n++;
        });
        frag.appendChild(w);
      });
      title.replaceChild(frag, node);
    });
  }
})();
