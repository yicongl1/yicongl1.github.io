(function () {
  function copyText(text, done, fallback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
      return;
    }
    fallback();
  }

  function addToolbars() {
    var blocks = document.querySelectorAll("pre > code");
    for (var i = 0; i < blocks.length; i++) {
      var code = blocks[i];
      var pre = code.parentElement;
      if (!pre) continue;

      var wrap = pre.closest(".highlight") || pre;
      if (wrap.querySelector(".code-toolbar")) continue;

      var lang =
        code.getAttribute("data-lang") ||
        (code.className.match(/language-([\w+-]+)/) || [])[1] ||
        "";

      var toolbar = document.createElement("div");
      toolbar.className = "code-toolbar";

      var label = document.createElement("span");
      label.className = "code-lang";
      label.textContent = lang || "code";
      toolbar.appendChild(label);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-code-btn";
      btn.textContent = "复制";
      btn.setAttribute("aria-label", "复制代码");
      btn.addEventListener("click", function () {
        var text = code.innerText;
        var reset = function () {
          btn.textContent = "已复制";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = "复制";
            btn.classList.remove("copied");
          }, 1600);
        };
        copyText(text, reset, function () {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.top = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            reset();
          } catch (e) {}
          document.body.removeChild(ta);
        });
      });
      toolbar.appendChild(btn);

      if (wrap === pre) {
        var box = document.createElement("div");
        box.className = "highlight";
        pre.parentNode.insertBefore(box, pre);
        box.appendChild(pre);
        wrap = box;
      }
      wrap.insertBefore(toolbar, pre);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addToolbars);
  } else {
    addToolbars();
  }
})();
