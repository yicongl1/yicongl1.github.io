/* Home page "Connect" section: populate the GitHub fallbacks when the
   pre-generated data in data/activity.yaml is unavailable. */
(function () {
  "use strict";

  var config = {};
  var configNode = document.getElementById("connect-i18n");
  if (configNode) {
    try {
      config = JSON.parse(configNode.textContent);
    } catch (err) {
      config = {};
    }
  }

  function label(key, fallback) {
    return config[key] || fallback;
  }

  function githubLink(user) {
    var link = document.createElement("a");
    link.href = "https://github.com/" + user;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "github.com/" + user;
    return link;
  }

  function initGithubEvents() {
    var list = document.getElementById("recent-repos");
    var user = list && list.getAttribute("data-github-events");
    if (!list || !user) return;

    var loading = document.createElement("li");
    loading.className = "text-muted small";
    loading.textContent = label("loading", "…");
    list.innerHTML = "";
    list.appendChild(loading);

    fetch("https://api.github.com/users/" + encodeURIComponent(user) + "/events/public?per_page=20")
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (events) {
        if (!Array.isArray(events) || !events.length) throw new Error("empty");
        var labels = config.events || {};
        var locale = list.getAttribute("data-locale") || "zh-CN";

        list.innerHTML = "";
        events.slice(0, 8).forEach(function (event) {
          var item = document.createElement("li");

          var time = document.createElement("span");
          time.className = "time";
          time.textContent = new Date(event.created_at).toLocaleDateString(locale, {
            month: "2-digit",
            day: "2-digit"
          });

          var kind = document.createElement("span");
          kind.className = "kind";
          kind.textContent = labels[event.type] || event.type.replace("Event", "");

          var link = document.createElement("a");
          link.href = "https://github.com/" + event.repo.name;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = event.repo.name.split("/")[1];

          item.appendChild(time);
          item.appendChild(kind);
          item.appendChild(link);
          list.appendChild(item);
        });
      })
      .catch(function () {
        var item = document.createElement("li");
        item.className = "muted";
        item.appendChild(githubLink(user));
        list.innerHTML = "";
        list.appendChild(item);
      });
  }

  function initGithubHeatmap() {
    var heatmap = document.getElementById("github-heatmap");
    if (!heatmap) return;

    var user = heatmap.getAttribute("data-user");
    if (!user) return;

    fetch("https://github-contributions-api.jogruber.de/v4/" + encodeURIComponent(user) + "?y=last")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        var days = (data.contributions || []).slice(-182);
        var cells = [];

        if (days.length) {
          var first = new Date(days[0].date + "T00:00:00");
          for (var pad = 0; pad < first.getDay(); pad++) cells.push(null);
        }
        days.forEach(function (day) {
          cells.push(day);
        });
        while (cells.length % 7 !== 0) cells.push(null);

        heatmap.innerHTML = "";
        cells.forEach(function (day) {
          var cell = document.createElement("span");
          cell.className = "heat-cell" + (day ? " level-" + (day.level || 0) : " level-empty");
          if (day) cell.title = day.date + " · " + day.count;
          heatmap.appendChild(cell);
        });

        var total = days.reduce(function (sum, day) {
          return sum + (day.count || 0);
        }, 0);
        var previous = heatmap.parentElement.querySelector(".heatmap-note");
        if (previous) previous.remove();

        var note = document.createElement("p");
        note.className = "heatmap-note";
        note.textContent = total
          ? total + " " + label("contributions", "contributions")
          : label("empty", "No public contributions");
        heatmap.parentElement.appendChild(note);
      })
      .catch(function () {
        heatmap.innerHTML = "";
        heatmap.appendChild(githubLink(user));
      });
  }

  function init() {
    initGithubEvents();
    initGithubHeatmap();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
