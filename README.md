# static/

原样复制到 `public/` 的静态文件，不经过 Hugo Pipes 处理。

```
static/
├── audio/      页面里的音频
├── css/        site.css（全站样式）
├── downloads/  PDF 附件
├── images/     favicon 与校内 logo
├── js/         自定义脚本与第三方库
└── .nojekyll   告诉 GitHub Pages 不要跑 Jekyll
```

| 路径 / 文件 | 用途 |
|---|---|
| `.nojekyll` | GitHub Pages 部署必需，避免以 `_` 开头的目录被忽略。 |
| `css/site.css` | 公开站的主样式：布局、卡片、详情页、深浅色、动效。 |
| `js/code-copy.js` | 代码块右上角的复制按钮。 |
| `js/cv-generator.js` | 简历生成器：数据注入、勾选、A4 分页、html2canvas + jsPDF 导出。 |
| `js/detail-motion.js` | 详情页动效：阅读进度、回到顶部、进入视口动画（尊重减少动态效果）。 |
| `js/vendor/html2canvas.min.js` | 把 DOM 抓成图片，PDF 导出用。 |
| `js/vendor/jspdf.umd.min.js` | 生成并保存 PDF。 |
| `audio/bach-air.ogg` | 巴赫《G 弦上的咏叹调》。 |
| `audio/bach-organ-bwv526.mp3` | 巴赫管风琴 BWV 526。 |
| `audio/clair-de-lune.ogg` | 德彪西《月光》。 |
| `audio/pachelbel-canon.mp3` | 帕赫贝尔《卡农》。 |
| `audio/veni-sancte-spiritus.ogg` | 《Veni Sancte Spiritus》。 |
| `downloads/cv-fr-doctorat.pdf` | 法语博士申请简历。 |
| `downloads/cv-zh-gis-data-engineer.pdf` | 中文 GIS / 数据工程简历。 |
| `downloads/sound-proposal.pdf` | SOUND 博士项目提案。 |
| `downloads/tn09-oral.pdf` | TN09 答辩讲稿。 |
| `downloads/tn09-poster.pdf` | TN09 海报。 |
| `downloads/tn09-report.pdf` | TN09 报告。 |
| `downloads/tn10-public-poster.pdf` | TN10 公开海报。 |
| `downloads/tn10-public-slides.pdf` | TN10 公开汇报幻灯片。 |
| `downloads/tz-report.pdf` | 科普项目报告。 |
| `images/schools/shu.svg` | 上海大学标识。 |
| `images/schools/utc.svg` | UTC 标识。 |
| `images/site/favicon.svg` | 公开站 favicon。 |
| `images/site/favicon-book.svg` | 书架页 favicon。 |
| `images/site/favicon-books.svg` | 藏书页 favicon。 |
| `images/site/favicon-faith.svg` | 信仰页 favicon。 |
| `images/site/favicon-matrix.svg` | 矩阵 / 代码页 favicon。 |
| `images/site/favicon-vault.svg` | 私人空间入口 favicon。 |

需要哈希、压缩或缩放的文件放 `assets/`；只有本来就该原样发布的文件才放这里。
