// 站内搜索：一次性拉取当前语言的索引，在本地做加权匹配。
// 索引由 layouts/_default/search.json 生成，只包含公开分区。
(function () {
  var page = document.getElementById("site-search-page");
  if (!page) return;

  var input = document.getElementById("site-search-input");
  var results = document.getElementById("site-search-results");
  var meta = document.getElementById("site-search-meta");
  var emptyText = page.dataset.empty || "No results";
  var countText = page.dataset.count || "{n} results";
  var countOneText = page.dataset.countOne || countText;
  var hintText = page.dataset.hint || "";
  var items = [];
  var timer = 0;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function terms(query) {
    return query.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function score(item, queryTerms) {
    var title = item.title.toLowerCase();
    var tags = (item.tags || "").toLowerCase();
    var skills = (item.skills || "").toLowerCase();
    var summary = (item.summary || "").toLowerCase();
    var type = (item.type || "").toLowerCase();
    var total = 0;

    for (var i = 0; i < queryTerms.length; i++) {
      var term = queryTerms[i];
      if ([title, tags, skills, summary, type].join(" ").indexOf(term) === -1) return -1;
      if (title.indexOf(term) !== -1) total += 8;
      if (tags.indexOf(term) !== -1) total += 4;
      if (skills.indexOf(term) !== -1) total += 3;
      if (summary.indexOf(term) !== -1) total += 2;
    }
    return total;
  }

  function highlight(text, queryTerms) {
    var html = escapeHtml(text);
    queryTerms.forEach(function (term) {
      var safe = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!safe) return;
      html = html.replace(new RegExp("(" + safe + ")", "gi"), "<mark>$1</mark>");
    });
    return html;
  }

  function render() {
    var queryTerms = terms(input.value.trim());
    if (!queryTerms.length) {
      results.innerHTML = "";
      meta.textContent = hintText;
      return;
    }

    var found = items
      .map(function (item) {
        return { item: item, score: score(item, queryTerms) };
      })
      .filter(function (entry) {
        return entry.score >= 0;
      })
      .sort(function (a, b) {
        return b.score - a.score || (a.item.date < b.item.date ? 1 : -1);
      })
      .slice(0, 40);

    meta.textContent = (found.length === 1 ? countOneText : countText).replace("{n}", found.length);
    if (!found.length) {
      results.innerHTML = '<p class="search-empty">' + escapeHtml(emptyText) + "</p>";
      return;
    }

    results.innerHTML = found
      .map(function (entry) {
        var item = entry.item;
        var metaBits = [item.date, item.type].filter(Boolean);
        return (
          '<a class="search-result" href="' + escapeHtml(item.url) + '">' +
          '<span class="search-result-title">' + highlight(item.title, queryTerms) + "</span>" +
          '<span class="search-result-meta">' + escapeHtml(metaBits.join(" · ")) + "</span>" +
          (item.summary
            ? '<span class="search-result-summary">' + highlight(item.summary, queryTerms) + "</span>"
            : "") +
          "</a>"
        );
      })
      .join("");
  }

  function syncUrl() {
    var url = new URL(window.location.href);
    var value = input.value.trim();
    if (value) {
      url.searchParams.set("q", value);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(null, "", url);
  }

  function update() {
    render();
    syncUrl();
  }

  var dataNode = document.getElementById("site-search-data");
  try {
    items = dataNode ? JSON.parse(dataNode.textContent || "[]") : [];
  } catch (error) {
    items = [];
  }
  if (!Array.isArray(items)) items = [];

  var initial = new URLSearchParams(window.location.search).get("q") || "";
  input.value = initial;
  render();
  if (window.matchMedia("(min-width: 768px)").matches) input.focus();

  input.addEventListener("input", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(update, 120);
  });

  document.addEventListener("keydown", function (event) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      input.focus();
    } else if (event.key === "/" && !typing) {
      event.preventDefault();
      input.focus();
    }
  });
})();
