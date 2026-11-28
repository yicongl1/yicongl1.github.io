/* 站点交互细节:阅读进度、回到顶部、滚动入场。
   纯原生实现,不引第三方;系统开了「减少动态效果」时只保留按钮,不做动画。
   只在元素还在视口下方时才挂 .reveal,避免首屏内容闪一下。 */
(function () {
  var reduce = false;
  try {
    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var bar = document.querySelector(".read-progress > span");
  var toTop = document.querySelector(".to-top");
  var docEl = document.documentElement;
  var queued = false;

  function update() {
    queued = false;
    var y = window.pageYOffset || docEl.scrollTop || 0;

    if (bar) {
      var max = docEl.scrollHeight - docEl.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }

    if (toTop) {
      toTop.classList.toggle("is-visible", y > 520);
    }
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  if (reduce || !("IntersectionObserver" in window)) return;

  var items = [];

  function belowFold(el) {
    var rect = el.getBoundingClientRect();
    return rect.top > window.innerHeight * 0.88;
  }

  function add(el, delay) {
    if (!el || el.classList.contains("reveal")) return;
    if (!belowFold(el)) return;
    el.classList.add("reveal");
    el.style.setProperty("--reveal-delay", delay + "ms");
    items.push(el);
  }

  // 1. 详情页 / 文章正文的每个块
  Array.prototype.forEach.call(
    document.querySelectorAll(".comp-body, .project-body, .post-content"),
    function (root) {
      Array.prototype.forEach.call(root.children, function (el, i) {
        var tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "HR") return;
        if (el.classList.contains("cert-lightbox")) return;
        add(el, Math.min(i % 5, 4) * 50);
      });
    }
  );

  // 2. 首页的每个栏目(整块淡入,内部的筛选和动画不受影响)
  Array.prototype.forEach.call(document.querySelectorAll(".container-fluid.anchor"), function (el) {
    add(el, 0);
  });

  // 3. 列表页的卡片,同一行错开一点
  Array.prototype.forEach.call(document.querySelectorAll(".comp-grid"), function (grid) {
    Array.prototype.forEach.call(grid.children, function (el, i) {
      add(el, Math.min(i, 5) * 70);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".detail-surface .row"), function (row) {
    Array.prototype.forEach.call(row.children, function (el, i) {
      add(el, Math.min(i, 5) * 70);
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".post-list, .post-card-holder"), function (holder) {
    if (holder.closest(".container-fluid.anchor")) return;
    Array.prototype.forEach.call(holder.children, function (el, i) {
      if (!el.classList.contains("post-row") && !el.classList.contains("post-card")) return;
      add(el, Math.min(i, 5) * 60);
    });
  });

  if (!items.length) return;

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
  );

  items.forEach(function (el) {
    io.observe(el);
  });
})();
