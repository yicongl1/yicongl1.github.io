/* ---------- 阅读设置：字体 + 字号 ---------- */
(function () {
  var root = document.documentElement;
  var MIN = 0.85;
  var MAX = 1.35;
  var STEP = 0.05;

  function currentScale() {
    var v = parseFloat(getComputedStyle(root).getPropertyValue("--reading-scale"));
    return isNaN(v) ? 1 : v;
  }

  function setScale(value) {
    var v = Math.round(Math.min(MAX, Math.max(MIN, value)) * 100) / 100;
    root.style.setProperty("--reading-scale", String(v));
    try { localStorage.setItem("reading-scale", String(v)); } catch (e) {}
    return v;
  }

  function currentFont() {
    return root.getAttribute("data-font") || "default";
  }

  function setFont(font) {
    if (font === "default") root.removeAttribute("data-font");
    else root.setAttribute("data-font", font);
    try { localStorage.setItem("reading-font", font); } catch (e) {}
  }

  function sync(box) {
    var font = currentFont();
    box.querySelectorAll("[data-reading-font]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-reading-font") === font ? "true" : "false");
    });
    var out = box.querySelector("[data-reading-size-value]");
    if (out) out.textContent = Math.round(currentScale() * 100) + "%";
  }

  document.querySelectorAll("[data-reading-tools]").forEach(function (box) {
    var toggle = box.querySelector(".reading-tools-toggle");
    var panel = box.querySelector(".reading-panel");

    function open(on) {
      panel.hidden = !on;
      toggle.setAttribute("aria-expanded", on ? "true" : "false");
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      open(panel.hidden);
    });

    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) open(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") open(false);
    });

    box.querySelectorAll("[data-reading-font]").forEach(function (b) {
      b.addEventListener("click", function () {
        setFont(b.getAttribute("data-reading-font"));
        sync(box);
      });
    });

    box.querySelector('[data-reading-size="down"]').addEventListener("click", function () {
      setScale(currentScale() - STEP);
      sync(box);
    });

    box.querySelector('[data-reading-size="up"]').addEventListener("click", function () {
      setScale(currentScale() + STEP);
      sync(box);
    });

    box.querySelector('[data-reading-size="reset"]').addEventListener("click", function () {
      setScale(1);
      setFont("default");
      sync(box);
    });

    sync(box);
  });
})();
