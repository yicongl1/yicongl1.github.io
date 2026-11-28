/*
 * CV 生成器 —— /cv/ 页面专用。
 * 数据由 layouts/cv/list.html 以 JSON 嵌入（#cv-data），包含 zh-cn / en / fr 三份主页数据。
 * 预览按 A4 实际高度分页；导出时逐页截图写入 jsPDF，保证每页正好一页、不在行中间截断。
 * 支持字号 / 字体 / 单栏与边栏排版，选择状态存 localStorage（cv-generator-v1）。
 */
(function () {
  'use strict';

  var PAGE_W = 794;   // A4 @96dpi
  var PAGE_H = 1123;
  var PAGE_PAD_TOP = 54;     // 与 assets/css/cv.css 的 .cv-sheet padding 保持一致
  var PAGE_PAD_BOTTOM = 46;
  var SAFETY = 8;            // 预留几像素：字体度量误差不会把最后一行顶到页脚

  var PAGE_LANG = (document.querySelector('.cv-page') || {}).dataset?.interfaceLang || 'zh-cn';
  if (['zh-cn', 'en', 'fr'].indexOf(PAGE_LANG) < 0) PAGE_LANG = 'zh-cn';
  var STORAGE_KEY = 'cv-generator-v2-' + PAGE_LANG;
  var UI = {
    'zh-cn': { groups:{about:'个人简介',education:'教育经历',experiences:'实习与工作经历',projects:'项目经历',competitions:'竞赛经历',skills:'技能',languages:'语言能力',links:'链接'}, aboutItem:'简介段落',toggle:'整组启用 / 停用',upGroup:'上移该板块',downGroup:'下移该板块',upItem:'上移该条目',downItem:'下移该条目',untitled:'（无标题）',page:'第 {page} 页 · 共 {total} 页',missing:'PDF 组件还没加载完，稍等一秒再点。',empty:'当前没有可导出的内容。',rendering:'正在渲染 PDF…',generated:'已生成 {filename}（{pages} 页 A4）',failed:'生成失败：{error}',reset:'已恢复默认选择。',printStart:'正在打开打印预览…',jdNeedText:'先粘贴一段岗位描述。',jdFound:'识别到 {n} 个关键词，点击标签可排除。',jdNoKeywords:'没有识别到明确关键词，可以补充具体工具或技能名。',jdApplied:'已按 {k} 个关键词重排，选中 {n} 条。',jdUndone:'已撤销岗位匹配。'},
    en: {groups:{about:'Profile',education:'Education',experiences:'Experience',projects:'Projects',competitions:'Competitions',skills:'Skills',languages:'Languages',links:'Links'},aboutItem:'Summary',toggle:'Toggle section',upGroup:'Move section up',downGroup:'Move section down',upItem:'Move item up',downItem:'Move item down',untitled:'(Untitled)',page:'Page {page} of {total}',missing:'PDF tools are still loading. Please try again in a moment.',empty:'There is no content to export.',rendering:'Rendering PDF…',generated:'Created {filename} ({pages} A4 pages)',failed:'Export failed: {error}',reset:'Default selections restored.',printStart:'Opening print preview…',jdNeedText:'Paste a job description first.',jdFound:'{n} keywords found. Click a chip to exclude it.',jdNoKeywords:'No clear keywords found. Try adding tool or skill names.',jdApplied:'Reordered by {k} keywords; {n} entries selected.',jdUndone:'Job targeting undone.'},
    fr: {groups:{about:'Profil',education:'Formation',experiences:'Expérience',projects:'Projets',competitions:'Concours',skills:'Compétences',languages:'Langues',links:'Liens'},aboutItem:'Résumé',toggle:'Activer / désactiver la section',upGroup:'Monter la section',downGroup:'Descendre la section',upItem:'Monter cet élément',downItem:'Descendre cet élément',untitled:'(Sans titre)',page:'Page {page} sur {total}',missing:'Les outils PDF se chargent encore. Réessayez dans un instant.',empty:'Aucun contenu à exporter.',rendering:'Génération du PDF…',generated:'PDF créé : {filename} ({pages} pages A4)',failed:'Échec de l’export : {error}',reset:'Sélection par défaut rétablie.',printStart:'Ouverture de l’aperçu d’impression…',jdNeedText:'Collez d’abord une offre d’emploi.',jdFound:'{n} mots-clés trouvés. Cliquez sur un mot pour l’exclure.',jdNoKeywords:'Aucun mot-clé clair. Ajoutez des outils ou des compétences.',jdApplied:'CV réorganisé selon {k} mots-clés ; {n} éléments sélectionnés.',jdUndone:'Ciblage annulé.'}
  };
  function ui(key, values) { var value = UI[PAGE_LANG][key] || UI['zh-cn'][key] || key; return value.replace(/\{(\w+)\}/g, function (_, k) { return values && values[k] !== undefined ? values[k] : ''; }); }

  // 简历里的板块标题随语言切换
  var CV_HEADINGS = {
    'zh-cn': { about: '个人简介', education: '教育经历', experiences: '实习与工作经历', projects: '项目经历', competitions: '竞赛经历', skills: '技能', languages: '语言能力', links: '链接' },
    en: { about: 'Profile', education: 'Education', experiences: 'Experience', projects: 'Projects', competitions: 'Competitions', skills: 'Skills', languages: 'Languages', links: 'Links' },
    fr: { about: 'Profil', education: 'Formation', experiences: 'Expériences', projects: 'Projets', competitions: 'Compétitions', skills: 'Compétences', languages: 'Langues', links: 'Liens' }
  };

  var UI_LABELS = UI[PAGE_LANG].groups;

  var GROUPS = ['about', 'education', 'experiences', 'projects', 'competitions', 'skills', 'languages', 'links'];

  // 边栏模式放进左窄栏的板块
  var SIDEBAR_GROUPS = ['about', 'skills', 'languages', 'links'];

  var STYLE_DEFAULTS = { size: 'md', font: 'sans', layout: 'single' };

  function defaultState() {
    return {
      lang: PAGE_LANG, contact: true, avatar: true,
      style: { size: STYLE_DEFAULTS.size, font: STYLE_DEFAULTS.font, layout: STYLE_DEFAULTS.layout },
      groups: {}, groupOrder: {}
    };
  }

  var data = {};
  var state = defaultState();

  /* ---------- 岗位定制 ---------- */

  // 常见技能 / 工具词：命中的词权重高于 JD 里的普通英文单词
  var JD_BUILTIN = [
    'python','sql','matlab','simulink','autocad','revit','arcgis','qgis','ros','opencv','linux','git','docker',
    'kubernetes','java','c++','c#','javascript','typescript','node.js','react','vue','hugo','unity','arduino',
    'excel','vba','r','spss','stata','power bi','tableau','bim','ifc','pmp','agile','scrum','lean','six sigma',
    'kanban','jira','confluence','machine learning','deep learning','data analysis','data visualization',
    'statistics','regression','classification','optimization','simulation','modelling','modeling','gis',
    'data analytics','data analyst','data visualisation','dashboard','kpi','etl','reporting',
    'remote sensing','hvac','energy','photovoltaic','solar','battery','electric vehicle','supply chain',
    'quality control','project management','risk management','cost control','construction','site supervision',
    'structural','mechanical','electrical','embedded','iot','sensors','computer vision','image processing','nlp',
    'web development','api','rest','database','postgresql','mysql','mongodb','pandas','numpy','matplotlib',
    'seaborn','jupyter','latex','figma','photoshop','illustrator','indesign',
    '项目管理','数据分析','数据可视化','机器学习','深度学习','人工智能','计算机视觉','图像处理','优化','仿真','建模',
    '地理信息系统','遥感','建筑信息模型','质量控制','供应链','能源','光伏','电池','电动汽车','暖通','施工','现场管理',
    '造价','结构','机械','电气','嵌入式','物联网','传感器','数据库','前端','后端','全栈','统计学','回归','分类',
    '风险评估','成本控制','敏捷','精益','六西格玛','法语','英语','中文'
  ];

  var JD_STOP = {};
  ('the a an and or of to in for with on at from by as is are be will can our your you we they this that ' +
   'job role position team work working experience skills requirements responsibilities company please apply ' +
   'le la les un une des du de et ou pour avec dans sur au aux en est sont être vous nous notre vos ' +
   'poste mission profil candidat candidature entreprise travail équipe ' +
   'data building control looking analyst seeking join candidate candidates offer contract salary remote ' +
   'hybrid plus required preferred strong knowledge ability years environment international business client ' +
   'clients support develop development management team teams').split(/\s+/).forEach(function (w) {
    JD_STOP[w] = true;
  });
  ['的','了','和','与','在','是','有','负责','工作','要求','岗位','职责','我们','公司','优先','熟悉','掌握','具备',
   '能力','经验','相关','进行','以及','或者','能够','良好','以上','专业','团队'].forEach(function (w) {
    JD_STOP[w] = true;
  });

  var jdKeywords = [];
  var jdSnapshot = null;
  var jdVocab = null;


  /* ---------- 基础工具 ---------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function setStatus(msg) {
    var box = document.getElementById('cv-status');
    if (box) box.textContent = msg || '';
  }

  function swap(arr, i, j) {
    if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 隐私模式下忽略 */ }
  }

  function loadState() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { saved = null; }
    if (saved && typeof saved === 'object') {
      if (saved.lang && CV_HEADINGS[saved.lang]) state.lang = saved.lang;
      if (typeof saved.contact === 'boolean') state.contact = saved.contact;
      if (typeof saved.avatar === 'boolean') state.avatar = saved.avatar;
      if (saved.style && typeof saved.style === 'object') {
        if (['sm', 'md', 'lg'].indexOf(saved.style.size) >= 0) state.style.size = saved.style.size;
        if (['sans', 'serif'].indexOf(saved.style.font) >= 0) state.style.font = saved.style.font;
        if (['single', 'side'].indexOf(saved.style.layout) >= 0) state.style.layout = saved.style.layout;
      }
      if (saved.groups && typeof saved.groups === 'object') state.groups = saved.groups;
      if (saved.groupOrder && typeof saved.groupOrder === 'object') state.groupOrder = saved.groupOrder;
    }
  }

  function styleClasses() {
    return 'cv-size-' + state.style.size + ' cv-font-' + state.style.font +
      ' cv-layout-' + state.style.layout;
  }

  /* ---------- 数据条目提取 ---------- */

  function groupItems(lang, gid) {
    var d = data[lang] || {};
    switch (gid) {
      case 'about':
        return (d.about && d.about.summary) ? [{ title: ui('aboutItem'), sub: '' }] : [];
      case 'education':
        return (((d.education || {}).degrees) || []).map(function (deg) {
          return { title: deg.name || '', sub: (deg.institution && deg.institution.name) || '', time: deg.timeframe || '', raw: deg };
        });
      case 'experiences':
        return (((d.experiences || {}).experiences) || []).map(function (exp) {
          var pos = (exp.positions && exp.positions[0]) || {};
          var time = pos.start && pos.end ? pos.start + ' – ' + pos.end : (pos.start || pos.end || '');
          return { title: (exp.company && exp.company.name) || '', sub: pos.designation || '', time: time, raw: exp };
        });
      case 'projects':
        return (((d.projects || {}).projects) || []).map(function (p) {
          return { title: p.name || '', sub: p.role || '', time: p.timeline || '', raw: p };
        });
      case 'competitions':
        return (((d.competitions || {}).competitions) || []).map(function (c) {
          return { title: c.title || '', sub: c.subtitle || '', time: c.result || '', raw: c };
        });
      case 'skills':
        return (((d.skills || {}).skills) || []).map(function (s) {
          return { title: s.name || '', sub: '', time: '', raw: s };
        });
      case 'languages':
        return (((d.about || {}).badges) || []).map(function (b) {
          return { title: b.name || '', sub: '', time: '', raw: b };
        });
      case 'links':
        return (((d.connect || {}).links) || []).map(function (l) {
          return { title: l.name || '', sub: prettyUrl(l.url), time: '', raw: l };
        });
    }
    return [];
  }

  /* ---------- 链接辅助 ---------- */

  // 站内链接按 CV 语言补前缀，和首页模板里的 relLangURL 是同一套规则；
  // 外部链接（以 http 开头）原样返回。
  function localizeUrl(url, lang) {
    if (!url) return '';
    if (url.charAt(0) !== '/') return url;
    if (lang === 'zh-cn' || url.indexOf('/' + lang + '/') === 0) return url;
    return '/' + lang + url;
  }

  function absoluteUrl(href) {
    try {
      if (typeof window !== 'undefined' && window.location) {
        // Use the public site origin when the generator is opened from localhost,
        // so printed URLs in the resume never expose the local preview address.
        var canonical = document.querySelector('link[rel="canonical"]');
        var base = canonical && canonical.href ? new URL(canonical.href).origin : window.location.origin;
        return new URL(href, base).href;
      }
    } catch (e) { /* 忽略：测试环境没有 location */ }
    return href;
  }

  // 打印到纸上后超链接会失效，所以条目链接直接把完整网址显示出来。
  // 去掉协议、mailto: 与 www.，让简历里的地址更短、更整齐。
  function prettyUrl(href) {
    if (!href) return '';
    return absoluteUrl(href)
      .replace(/^mailto:/i, '')
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/$/, '');
  }

  function makeEntryLink(url, lang) {
    if (!url) return null;
    var href = localizeUrl(url, lang);
    var a = document.createElement('a');
    a.className = 'cv-entry-link';
    a.href = href;
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    a.textContent = prettyUrl(href);
    return a;
  }

  // 说明行 + 右对齐链接，所有条目的网址落在同一条右边线上
  function makeSubRow(text, url, lang) {
    var a = makeEntryLink(url, lang);
    if (!text && !a) return null;
    if (!a) return el('div', 'cv-entry-sub', text);
    var row = el('div', 'cv-sub-row');
    row.appendChild(el('span', 'cv-entry-sub', text || ''));
    a.classList.add('cv-entry-link-end');
    row.appendChild(a);
    return row;
  }

  // 胶囊标签：上下留白交给 padding + line-height:1，浏览器与 html2canvas 表现一致
  function makeChip(text) {
    var chip = el('span', 'cv-chip');
    chip.appendChild(el('span', 'cv-chip-label', text));
    return chip;
  }

  // 中文平台（界面与内容都是中文），英语/法语简历里标注 (Chinese)/(Chinois)
  var CHINESE_PLATFORM_HOSTS = ['gitee.com', 'blog.csdn.net', 'leetcode.cn', 'luogu.com.cn'];

  function isChinesePlatform(url) {
    if (!url) return false;
    var host = '';
    try { host = new URL(url).hostname.toLowerCase(); } catch (e) { return false; }
    return CHINESE_PLATFORM_HOSTS.some(function (h) {
      return host === h || host.slice(-(h.length + 1)) === '.' + h;
    });
  }

  /* ---------- 每组的选择状态 ---------- */

  function defaultGroupState(n) {
    var selected = [], order = [];
    for (var i = 0; i < n; i++) { selected.push(true); order.push(i); }
    return { enabled: n > 0, selected: selected, order: order };
  }

  function getGroupState(lang, gid) {
    var n = groupItems(lang, gid).length;
    var st = defaultGroupState(n);
    var store = state.groups[lang] && state.groups[lang][gid];
    if (store) {
      if (typeof store.enabled === 'boolean') st.enabled = store.enabled && n > 0;
      if (Array.isArray(store.selected) && store.selected.length === n) {
        st.selected = store.selected.map(Boolean);
      }
      if (Array.isArray(store.order) && store.order.length === n) {
        var ok = store.order.every(function (v) { return Number.isInteger(v) && v >= 0 && v < n; });
        if (ok && new Set(store.order).size === n) st.order = store.order.slice();
      }
    }
    return st;
  }

  function saveGroupState(lang, gid, st) {
    if (!state.groups[lang]) state.groups[lang] = {};
    state.groups[lang][gid] = st;
    persist();
  }

  function getGroupOrder(lang) {
    var saved = state.groupOrder[lang];
    if (Array.isArray(saved) && saved.length === GROUPS.length &&
        saved.every(function (id) { return GROUPS.indexOf(id) >= 0; }) &&
        new Set(saved).size === GROUPS.length) {
      return saved;
    }
    return GROUPS.slice();
  }

  function saveGroupOrder(lang, order) {
    state.groupOrder[lang] = order;
    persist();
  }

  /* ---------- 岗位定制：本地关键词匹配 ---------- */

  function collectText(value, out) {
    if (value === null || value === undefined) return out;
    if (typeof value === 'string') {
      var s = value.trim();
      if (!s) return out;
      if (/^(https?:|\/|#)/i.test(s)) return out;
      if (/\.(png|jpe?g|svg|webp|gif|pdf)$/i.test(s)) return out;
      out.push(s);
      return out;
    }
    if (Array.isArray(value)) {
      value.forEach(function (v) { collectText(v, out); });
      return out;
    }
    if (typeof value === 'object') {
      Object.keys(value).forEach(function (k) {
        if (['url', 'repo', 'image', 'logo', 'darkLogo', 'links', 'href', 'target', 'icon'].indexOf(k) >= 0) return;
        collectText(value[k], out);
      });
    }
    return out;
  }

  function jdVoca() {
    if (jdVocab) return jdVocab;
    var terms = {};
    JD_BUILTIN.forEach(function (t) { terms[t] = 1; });
    ['zh-cn', 'en', 'fr'].forEach(function (lang) {
      var d = data[lang] || {};
      (((d.skills || {}).skills) || []).forEach(function (s) {
        if (s && s.name && String(s.name).length >= 2) terms[String(s.name).toLowerCase()] = 2;
      });
      (((d.projects || {}).projects) || []).forEach(function (p) {
        (p.tags || []).forEach(function (t) {
          var tag = String(t).toLowerCase();
          if (tag && ['all', 'code', 'academic', 'outreach'].indexOf(tag) < 0) terms[tag] = 2;
        });
      });
    });
    jdVocab = terms;
    return terms;
  }

  function jdCount(haystack, term) {
    var n = 0;
    var pos = 0;
    while (n < 5) {
      pos = haystack.indexOf(term, pos);
      if (pos < 0) break;
      n++;
      pos += term.length;
    }
    return n;
  }

  function renderJDKeywords() {
    var box = document.getElementById('cv-jd-keywords');
    if (!box) return;
    box.innerHTML = '';
    jdKeywords.forEach(function (k) {
      var chip = el('button', 'cv-jd-chip' + (k.off ? ' is-off' : ''), k.term + ' ×' + k.count);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        k.off = !k.off;
        chip.classList.toggle('is-off', k.off);
      });
      box.appendChild(chip);
    });
  }

  function analyzeJD() {
    var field = document.getElementById('cv-jd-text');
    var status = document.getElementById('cv-jd-status');
    var apply = document.getElementById('cv-jd-apply');
    if (!field || !status || !apply) return;
    var text = (field.value || '').trim();
    if (text.length < 20) {
      jdKeywords = [];
      renderJDKeywords();
      apply.disabled = true;
      status.textContent = ui('jdNeedText');
      return;
    }

    var lower = text.toLowerCase();
    var vocab = jdVoca();
    var found = [];
    Object.keys(vocab).forEach(function (term) {
      if (term.length < 2) return;
      if (JD_STOP[term] && term.indexOf(' ') < 0) return;
      var count = jdCount(lower, term);
      if (!count) return;
      found.push({ term: term, count: count, weight: vocab[term] * (1 + Math.min(2, count - 1) * 0.5), off: false });
    });

    var known = found.map(function (f) { return f.term; });
    var tokens = lower.match(/[a-z][a-z0-9+#.\-]{2,}/g) || [];
    var freq = {};
    tokens.forEach(function (t) {
      if (JD_STOP[t] || t.length < 3) return;
      var covered = known.some(function (k) { return k.indexOf(t) >= 0 || t.indexOf(k) >= 0; });
      if (!covered) freq[t] = (freq[t] || 0) + 1;
    });
    Object.keys(freq).filter(function (t) { return freq[t] >= 2; }).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 4).forEach(function (t) {
      found.push({ term: t, count: freq[t], weight: 0.5 * (1 + Math.min(2, freq[t] - 1) * 0.5), off: false });
    });

    found.sort(function (a, b) { return b.weight - a.weight; });
    jdKeywords = found.slice(0, 14);
    renderJDKeywords();
    apply.disabled = !jdKeywords.length;
    status.textContent = jdKeywords.length
      ? ui('jdFound', { n: jdKeywords.length })
      : ui('jdNoKeywords');
  }

  function jdItemText(item) {
    var parts = [item.title || '', item.sub || '', item.time || ''];
    collectText(item.raw, parts);
    return parts.join(' ').toLowerCase();
  }

  function jdScore(item) {
    var text = jdItemText(item);
    var score = 0;
    jdKeywords.forEach(function (k) {
      if (k.off) return;
      if (text.indexOf(k.term) >= 0) score += k.weight;
    });
    return score;
  }

  function applyJD() {
    var active = jdKeywords.filter(function (k) { return !k.off; });
    if (!active.length) return;
    jdSnapshot = {
      groups: JSON.parse(JSON.stringify(state.groups)),
      groupOrder: JSON.parse(JSON.stringify(state.groupOrder))
    };

    var selected = 0;
    ['education', 'experiences', 'projects', 'competitions', 'skills'].forEach(function (gid) {
      var items = groupItems(state.lang, gid);
      if (!items.length) return;
      var st = getGroupState(state.lang, gid);
      var scores = items.map(jdScore);
      var order = items.map(function (_, i) { return i; });
      order.sort(function (a, b) { return (scores[b] - scores[a]) || (a - b); });
      st.order = order;
      if (gid !== 'education') {
        st.selected = scores.map(function (s) { return s > 0; });
        selected += st.selected.filter(Boolean).length;
      }
      saveGroupState(state.lang, gid, st);
    });

    persist();
    renderControls();
    renderPreview();
    var undo = document.getElementById('cv-jd-undo');
    if (undo) undo.disabled = false;
    var status = document.getElementById('cv-jd-status');
    if (status) status.textContent = ui('jdApplied', { k: active.length, n: selected });
  }

  function undoJD() {
    if (!jdSnapshot) return;
    state.groups = jdSnapshot.groups;
    state.groupOrder = jdSnapshot.groupOrder;
    jdSnapshot = null;
    persist();
    renderControls();
    renderPreview();
    var undo = document.getElementById('cv-jd-undo');
    if (undo) undo.disabled = true;
    var status = document.getElementById('cv-jd-status');
    if (status) status.textContent = ui('jdUndone');
  }

  function bindJD() {
    var analyze = document.getElementById('cv-jd-analyze');
    if (!analyze) return;
    analyze.addEventListener('click', analyzeJD);
    document.getElementById('cv-jd-apply').addEventListener('click', applyJD);
    document.getElementById('cv-jd-undo').addEventListener('click', undoJD);
  }


  /* ---------- 左侧控制面板 ---------- */

  function makeMover(symbol, tip) {
    var b = el('button', 'cv-mover', symbol);
    b.type = 'button';
    b.title = tip;
    b.setAttribute('aria-label', tip);
    return b;
  }

  function renderControls() {
    var box = document.getElementById('cv-groups');
    if (!box) return;
    box.innerHTML = '';
    var lang = state.lang;

    getGroupOrder(lang).forEach(function (gid) {
      var items = groupItems(lang, gid);
      if (!items.length) return; // 该语言没有这个板块的数据
      var st = getGroupState(lang, gid);

      var card = el('div', 'cv-group');
      var head = el('div', 'cv-group-head');

      var enable = document.createElement('input');
      enable.type = 'checkbox';
      enable.checked = st.enabled;
      enable.title = ui('toggle');
      enable.addEventListener('change', function () {
        st.enabled = enable.checked;
        saveGroupState(lang, gid, st);
        renderPreview();
      });

      head.appendChild(enable);
      head.appendChild(el('span', 'cv-group-title', UI_LABELS[gid]));

      var gOrder = getGroupOrder(lang);
      var gi = gOrder.indexOf(gid);
      var gUp = makeMover('↑', ui('upGroup'));
      var gDown = makeMover('↓', ui('downGroup'));
      gUp.disabled = gi <= 0;
      gDown.disabled = gi >= gOrder.length - 1;
      gUp.addEventListener('click', function () {
        swap(gOrder, gi, gi - 1);
        saveGroupOrder(lang, gOrder);
        renderControls(); renderPreview();
      });
      gDown.addEventListener('click', function () {
        swap(gOrder, gi, gi + 1);
        saveGroupOrder(lang, gOrder);
        renderControls(); renderPreview();
      });
      head.appendChild(gUp);
      head.appendChild(gDown);
      card.appendChild(head);

      st.order.forEach(function (itemIdx, pos) {
        var it = items[itemIdx];
        if (!it) return;
        var row = el('div', 'cv-item');

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = st.selected[itemIdx];
        cb.addEventListener('change', function () {
          st.selected[itemIdx] = cb.checked;
          saveGroupState(lang, gid, st);
          renderPreview();
        });

        var lab = el('label', null, null);
        lab.appendChild(el('span', null, it.title || ui('untitled')));
        if (it.sub) {
          var sub = el('div', 'cv-item-sub', it.sub);
          lab.appendChild(sub);
        }

        var up = makeMover('↑', ui('upItem'));
        var down = makeMover('↓', ui('downItem'));
        up.disabled = pos === 0;
        down.disabled = pos === st.order.length - 1;
        up.addEventListener('click', function () {
          swap(st.order, pos, pos - 1);
          saveGroupState(lang, gid, st);
          renderControls(); renderPreview();
        });
        down.addEventListener('click', function () {
          swap(st.order, pos, pos + 1);
          saveGroupState(lang, gid, st);
          renderControls(); renderPreview();
        });

        row.appendChild(cb);
        row.appendChild(lab);
        row.appendChild(up);
        row.appendChild(down);
        card.appendChild(row);
      });

      box.appendChild(card);
    });
  }

  /* ---------- 右侧 A4 简历：按块分页 ---------- */

  function blockWrap(node, gapTop) {
    var wrap = el('div', 'cv-block');
    wrap.style.paddingTop = (gapTop || 0) + 'px';
    if (node) wrap.appendChild(node);
    return wrap;
  }

  function buildHeadBlock(lang) {
    var d = data[lang] || {};
    var author = d.author || {};

    var head = el('header', 'cv-head');
    var main = el('div', 'cv-head-main');
    main.appendChild(el('h1', 'cv-name', author.name || ''));

    var designation = [];
    if (d.about && d.about.designation) designation.push(d.about.designation);
    if (d.about && d.about.company && d.about.company.name) designation.push(d.about.company.name);
    if (designation.length) main.appendChild(el('p', 'cv-designation', designation.join(' · ')));

    if (state.contact && author.contactInfo) {
      var bits = [];
      if (author.contactInfo.email) bits.push(author.contactInfo.email);
      if (author.contactInfo.phone) bits.push(author.contactInfo.phone);
      if (bits.length) main.appendChild(el('p', 'cv-contact', bits.join(' · ')));
    }
    head.appendChild(main);

    if (state.avatar && d.avatar) {
      var img = document.createElement('img');
      img.className = 'cv-avatar';
      img.src = d.avatar;
      img.alt = author.nickname || '';
      head.appendChild(img);
    }

    return blockWrap(head, 0);
  }

  function buildSectionBlocks(lang, gid, st) {
    var headingText = (CV_HEADINGS[lang] || CV_HEADINGS['zh-cn'])[gid];
    var items = groupItems(lang, gid);
    var chosen = st.order.filter(function (idx) { return st.selected[idx] && items[idx]; });
    if (!chosen.length) return null;

    var heading = el('div', 'cv-sec-head');
    heading.appendChild(el('h2', null, headingText));
    var result = { heading: blockWrap(heading, 20), items: [] };

    switch (gid) {
      case 'about': {
        var text = (data[lang].about || {}).summary;
        if (!text) return null;
        result.items.push(blockWrap(el('p', 'cv-summary-text', text), 10));
        break;
      }
      case 'education': {
        chosen.forEach(function (idx) {
          var deg = items[idx].raw;
          var entry = el('div', 'cv-entry');
          var row = el('div', 'cv-entry-row');
          row.appendChild(el('span', 'cv-entry-title', deg.name || ''));
          row.appendChild(el('span', 'cv-entry-time', deg.timeframe || ''));
          entry.appendChild(row);
          var sub = makeSubRow(
            deg.institution && deg.institution.name,
            deg.archive || (deg.institution && deg.institution.url),
            lang
          );
          if (sub) entry.appendChild(sub);
          result.items.push(blockWrap(entry, 9));
        });
        break;
      }
      case 'experiences': {
        chosen.forEach(function (idx) {
          var exp = items[idx].raw;
          var entry = el('div', 'cv-entry');
          var row = el('div', 'cv-entry-row');
          var positions = exp.positions || [];
          var firstPos = positions[0] || {};
          var expTime = firstPos.start && firstPos.end
            ? firstPos.start + ' – ' + firstPos.end
            : (firstPos.start || firstPos.end || '');
          var row = el('div', 'cv-entry-row');
          row.appendChild(el('span', 'cv-entry-title', (exp.company && exp.company.name) || ''));
          row.appendChild(el('span', 'cv-entry-time', expTime));
          entry.appendChild(row);

          positions.forEach(function (pos) {
            var pr = el('div', 'cv-entry-row');
            pr.style.marginTop = '2px';
            var desig = el('span', 'cv-entry-sub');
            if (pos.designation) desig.appendChild(document.createTextNode(pos.designation));
            var location = (exp.company && exp.company.location) || '';
            if (location) {
              if (pos.designation) desig.appendChild(document.createTextNode(' · '));
              desig.appendChild(document.createTextNode(location));
            }
            var posLink = (pos.links && pos.links[0] && pos.links[0].url) || '';
            var posLinkEl = makeEntryLink(posLink, lang);
            if (posLinkEl) posLinkEl.classList.add('cv-entry-link-end');
            pr.appendChild(desig);
            if (posLinkEl) pr.appendChild(posLinkEl);
            entry.appendChild(pr);
            var summary = pos.cvSummary || (pos.responsibilities && pos.responsibilities[0]) || '';
            if (summary) entry.appendChild(el('p', 'cv-detail', summary));
          });

          result.items.push(blockWrap(entry, 10));
        });
        break;
      }
      case 'projects': {
        chosen.forEach(function (idx) {
          var p = items[idx].raw;
          var entry = el('div', 'cv-entry');
          var row = el('div', 'cv-entry-row');
          row.appendChild(el('span', 'cv-entry-title', p.name || ''));
          row.appendChild(el('span', 'cv-entry-time', p.timeline || ''));
          entry.appendChild(row);
          var sub = makeSubRow(p.role, p.url, lang);
          if (sub) entry.appendChild(sub);
          if (p.summary) entry.appendChild(el('p', 'cv-detail', p.summary));
          result.items.push(blockWrap(entry, 10));
        });
        break;
      }
      case 'competitions': {
        chosen.forEach(function (idx) {
          var c = items[idx].raw;
          var entry = el('div', 'cv-entry');
          var row = el('div', 'cv-entry-row');
          row.appendChild(el('span', 'cv-entry-title', c.title || ''));
          row.appendChild(el('span', 'cv-entry-time', c.result || ''));
          entry.appendChild(row);
          var sub = makeSubRow(c.subtitle, c.url, lang);
          if (sub) entry.appendChild(sub);
          if (c.summary) entry.appendChild(el('p', 'cv-detail', c.summary));
          result.items.push(blockWrap(entry, 10));
        });
        break;
      }
      case 'skills':
      case 'languages': {
        var chips = el('div', 'cv-chips');
        chosen.forEach(function (idx) {
          chips.appendChild(makeChip(items[idx].title));
        });
        result.items.push(blockWrap(chips, 10));
        break;
      }
      case 'links': {
        chosen.forEach(function (idx) {
          var l = items[idx].raw;
          var href = l.url || '';
          var line = document.createElement('a');
          line.className = 'cv-link-line';
          line.href = href;
          line.setAttribute('target', '_blank');
          line.setAttribute('rel', 'noopener');
          var name = l.name || '';
          if (lang !== 'zh-cn' && isChinesePlatform(href)) {
            name += lang === 'fr' ? ' (Chinois)' : ' (Chinese)';
          }
          line.appendChild(el('span', 'cv-link-name', name));
          line.appendChild(el('span', 'cv-link-url', items[idx].sub));
          result.items.push(blockWrap(line, 6));
        });
        break;
      }
      default:
        return null;
    }

    return result;
  }

  // 把块按高度装进一页页；标题块不留在页脚
  function paginate(blocks, availFirst, availRest) {
    var pages = [[]];
    var used = 0;
    var capacity = availFirst;

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (used > 0 && used + b.h > capacity) {
        pages.push([]); used = 0; capacity = availRest;
      }
      if (b.kind === 'heading' && used > 0) {
        var next = blocks[i + 1];
        if (next && next.kind === 'item' && used + b.h + next.h > capacity) {
          pages.push([]); used = 0; capacity = availRest;
        }
      }
      pages[pages.length - 1].push(b);
      used += b.h;
    }
    return pages;
  }

  function renderPreview() {
    var scaleEl = document.getElementById('cv-scale');
    if (!scaleEl) return;
    var lang = state.lang;
    var sideMode = state.style.layout === 'side';
    scaleEl.dataset.lang = lang;

    // 1. 先构建块（不打进 DOM）
    var headBlock = buildHeadBlock(lang);
    var mainBlocks = [];
    var sideBlocks = [];

    getGroupOrder(lang).forEach(function (gid) {
      var st = getGroupState(lang, gid);
      if (!st.enabled) return;
      var sec = buildSectionBlocks(lang, gid, st);
      if (!sec) return;
      var target = (sideMode && SIDEBAR_GROUPS.indexOf(gid) >= 0) ? sideBlocks : mainBlocks;
      target.push({ node: sec.heading, kind: 'heading' });
      sec.items.forEach(function (n) { target.push({ node: n, kind: 'item' }); });
    });

    // 2. 隐藏的量纸容器：与真实页面同宽同样式，保证换行一致
    var measure = el('div', 'cv-sheet cv-measure ' + styleClasses());
    measure.style.position = 'absolute';
    measure.style.left = '-99999px';
    measure.style.top = '0';
    measure.style.height = 'auto';
    measure.style.visibility = 'hidden';
    measure.style.zIndex = '-1';

    measure.appendChild(headBlock);
    var measureCols = el('div', 'cv-columns' + (sideMode ? '' : ' cv-single'));
    var measureAside = null;
    if (sideMode) {
      measureAside = el('aside', 'cv-col-side');
      measureCols.appendChild(measureAside);
    }
    var measureMain = el('main', 'cv-col-main');
    measureCols.appendChild(measureMain);
    measure.appendChild(measureCols);
    document.body.appendChild(measure);

    var headH = Math.ceil(headBlock.getBoundingClientRect().height);

    function measureInto(list, container) {
      list.forEach(function (b) {
        container.appendChild(b.node);
        b.h = Math.ceil(b.node.getBoundingClientRect().height);
      });
    }
    measureInto(mainBlocks, measureMain);
    if (sideMode) measureInto(sideBlocks, measureAside);

    // 3. 分页：主栏与边栏各自排，页数取多的那个
    var avail = PAGE_H - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - SAFETY;
    var availFirst = avail - headH - 6;
    var mainPages = paginate(mainBlocks, availFirst, avail);
    var sidePages = sideMode ? paginate(sideBlocks, availFirst, avail) : [[]];

    // 4. 输出分页
    scaleEl.innerHTML = '';
    var holder = el('div', 'cv-pages');
    var total = Math.max(mainPages.length, sidePages.length);
    var styleCls = styleClasses();

    for (var p = 0; p < total; p++) {
      var page = el('div', 'cv-sheet cv-a4 ' + styleCls);
      page.dataset.page = String(p + 1);
      if (p === 0) page.appendChild(headBlock);

      // Sidebar groups often fit entirely on page 1. Once they are exhausted,
      // let the remaining main-column content use the full page width.
      var pageSideBlocks = sidePages[p] || [];
      var pageHasSide = sideMode && pageSideBlocks.length > 0;
      var cols = el('div', 'cv-columns' + (pageHasSide ? '' : ' cv-single'));
      if (pageHasSide) {
        var sideCol = el('aside', 'cv-col-side');
        pageSideBlocks.forEach(function (b) { sideCol.appendChild(b.node); });
        cols.appendChild(sideCol);
      }
      var mainCol = el('main', 'cv-col-main');
      (mainPages[p] || []).forEach(function (b) { mainCol.appendChild(b.node); });
      cols.appendChild(mainCol);
      page.appendChild(cols);

      holder.appendChild(page);
      holder.appendChild(el('div', 'cv-page-label', ui('page', {page: p + 1, total: total})));
    }

    scaleEl.appendChild(holder);
    document.body.removeChild(measure);
    applyScale();
  }

  /* ---------- 预览缩放 ---------- */

  function applyScale() {
    var preview = document.getElementById('cv-preview');
    var scaleEl = document.getElementById('cv-scale');
    if (!preview || !scaleEl) return;
    var holder = scaleEl.firstElementChild;
    var avail = Math.max(0, preview.clientWidth - 32);
    var s = avail > 0 ? Math.min(1, avail / PAGE_W) : 1;
    scaleEl.style.transform = 'scale(' + s + ')';
    scaleEl.style.height = holder ? (holder.offsetHeight * s) + 'px' : '';
  }

  /* ---------- PDF 导出：逐页截图，一页对一页 ---------- */

  // 页面是图片，但把 <a> 的位置换算成 PDF 坐标，挂上可点击的链接注释
  function addPageLinks(pdf, pageEl, pw, ph) {
    var pr = pageEl.getBoundingClientRect();
    if (!pr.width || !pr.height) return;
    var sx = pw / pr.width;
    var sy = ph / pr.height;
    Array.prototype.forEach.call(pageEl.querySelectorAll('a[href]'), function (a) {
      var r = a.getBoundingClientRect();
      if (!r.width || !r.height) return;
      pdf.link((r.left - pr.left) * sx, (r.top - pr.top) * sy, r.width * sx, r.height * sy, { url: a.href });
    });
  }

  // 离屏抓图台：把页面克隆到不受预览区缩放、滚动影响的位置。
  // 直接抓预览里的节点时，祖先的 scale 和滚动容器会让 html2canvas 画偏（PDF 里出现灰块）。
  function makeCaptureStage(pages) {
    var stage = el('div', 'cv-capture-stage');
    stage.style.cssText = 'position:fixed;left:0;top:0;width:' + PAGE_W +
      'px;background:#fff;z-index:-1;pointer-events:none;';
    var clones = pages.map(function (page) {
      var copy = page.cloneNode(true);
      copy.classList.add('cv-pdf-capture');
      copy.style.boxShadow = 'none';
      // Every page is captured against the same viewport origin. Leaving the
      // clones in normal flow puts page 2+ below the html2canvas viewport.
      copy.style.position = 'absolute';
      copy.style.left = '0';
      copy.style.top = '0';
      stage.appendChild(copy);
      return copy;
    });
    document.body.appendChild(stage);
    return { node: stage, pages: clones };
  }

  function downloadPDF() {
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
      setStatus(ui('missing'));
      return;
    }
    var pages = Array.prototype.slice.call(document.querySelectorAll('#cv-scale .cv-a4'));
    if (!pages.length) {
      setStatus(ui('empty'));
      return;
    }

    setStatus(ui('rendering'));

    // 抓干净的复制件：预览节点带 scale 和滚动容器，直接抓会偏移
    var stage = makeCaptureStage(pages);

    // 中文字体没加载完时字宽不同，会把分页和换行撑坏，必须等字体就绪
    var fontReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready.catch(function () {})
      : Promise.resolve();

    // 等复制件里的头像等图片加载完，避免导出空白图
    var waits = [];
    stage.pages.forEach(function (page) {
      Array.prototype.forEach.call(page.querySelectorAll('img'), function (img) {
        if (!img.complete || !img.naturalWidth) {
          waits.push(new Promise(function (resolve) {
            img.onload = resolve;
            img.onerror = resolve;
          }));
        }
      });
    });

    Promise.all([fontReady, Promise.all(waits)])
      .then(function () {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () { requestAnimationFrame(resolve); });
        });
      })
      .then(function () {
        var pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', compress: true });
        var pw = pdf.internal.pageSize.getWidth();
        var ph = pdf.internal.pageSize.getHeight();
        var chain = Promise.resolve();

        stage.pages.forEach(function (pageEl, idx) {
          chain = chain.then(function () {
            return window.html2canvas(pageEl, {
              scale: 3, backgroundColor: '#ffffff', logging: false,
              width: PAGE_W, height: PAGE_H,
              windowWidth: PAGE_W, windowHeight: PAGE_H,
              scrollX: 0, scrollY: 0
            })
              .then(function (canvas) {
                if (idx > 0) pdf.addPage();
                // PNG 比 JPEG 锐利得多；3 倍像素密度保证打印和缩放都清楚
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
                addPageLinks(pdf, pageEl, pw, ph);
              });
          });
        });

        return chain.then(function () {
          var author = (data[state.lang] || {}).author || {};
          var enAuthor = (data.en || {}).author || {};
          var raw = author.nickname || author.name || 'CV';
          // 中文昵称（如「毅聪」）不适合做文件名，退回英文名
          if (/[^\u0020-\u007E]/.test(raw)) raw = enAuthor.nickname || enAuthor.name || 'CV';
          var base = raw
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, '-');
          var filename = 'CV-' + base + '-' + state.lang + '.pdf';
          pdf.save(filename);
          setStatus(ui('generated', {filename: filename, pages: pages.length}));
        });
      })
      .catch(function (err) {
        console.error('[cv-generator] PDF export failed:', err);
        setStatus(ui('failed', {error: err && err.message ? err.message : err}));
      })
      .finally(function () {
        if (stage) document.body.removeChild(stage.node);
      });
  }

  /* ---------- 初始化 ---------- */

  function syncSegs() {
    document.querySelectorAll('#cv-size-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.size === state.style.size);
    });
    document.querySelectorAll('#cv-font-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.font === state.style.font);
    });
    document.querySelectorAll('#cv-layout-tabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.layout === state.style.layout);
    });
  }

  function syncTabs() {
    document.querySelectorAll('#cv-lang-tabs .cv-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === state.lang);
    });
  }

  function bindStyleTabs() {
    document.querySelectorAll('#cv-size-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.style.size = b.dataset.size;
        persist(); syncSegs(); renderPreview();
      });
    });
    document.querySelectorAll('#cv-font-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.style.font = b.dataset.font;
        persist(); syncSegs(); renderPreview();
      });
    });
    document.querySelectorAll('#cv-layout-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.style.layout = b.dataset.layout;
        persist(); syncSegs(); renderPreview();
      });
    });
  }

  function init() {
    var tag = document.getElementById('cv-data');
    if (!tag) return;
    try { data = JSON.parse(tag.textContent || '{}'); } catch (e) {
      console.error('[cv-generator] bad JSON payload', e);
      return;
    }

    loadState();

    document.querySelectorAll('#cv-lang-tabs .cv-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.lang = btn.dataset.lang;
        persist(); syncTabs(); renderControls(); renderPreview();
      });
    });

    var contact = document.getElementById('cv-contact-toggle');
    contact.checked = state.contact !== false;
    contact.addEventListener('change', function () {
      state.contact = contact.checked;
      persist(); renderPreview();
    });

    var avatar = document.getElementById('cv-avatar-toggle');
    avatar.checked = state.avatar !== false;
    avatar.addEventListener('change', function () {
      state.avatar = avatar.checked;
      persist(); renderPreview();
    });

    bindStyleTabs();
    bindJD();

    document.getElementById('cv-download').addEventListener('click', downloadPDF);
    var printBtn = document.getElementById('cv-print');
    if (printBtn) {
      printBtn.addEventListener('click', function () {
        setStatus(ui('printStart'));
        window.print();
      });
    }
    document.getElementById('cv-reset').addEventListener('click', function () {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      contact.checked = true;
      avatar.checked = true;
      syncTabs(); syncSegs(); renderControls(); renderPreview();
      setStatus(ui('reset'));
    });

    window.addEventListener('resize', applyScale);

    // 字体加载完成后度量会变，重排一次，避免最后一行贴到页脚
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(function () { renderPreview(); }).catch(function () {});
    }

    syncTabs(); syncSegs(); renderControls(); renderPreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
