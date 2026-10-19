# xuanji-core

中国传统术数**计算内核**：节气、农历、四柱八字、六爻纳甲、梅花易数、紫微斗数契约、大六壬、奇门遁甲。纯 JavaScript，无依赖，浏览器与 Node 通用。

> 只做**历法与排盘计算**，不含任何界面、网络请求、用户数据收集或埋点。全部代码本地运行。

## 能力

| 模块 | 内容 |
|---|---|
| 历法 | 1900–2100 二十四节气（秒级）、农历（冬至定十一月 + 无中气置闰）、闰月、干支纪元 |
| 八字 | 四柱、十神、藏干、纳音、长生十二宫、胎元、命宫身宫、大运（周岁/虚岁双口径）、流年流月 |
| 时区修正 | 真太阳时（经度时差 + 均时差）、1986–1991 中国夏令时、1929 年前北京地方时（UTC+7:45:40） |
| 六爻 | 八宫纳甲、六亲、六神、伏神、旬空、世应、变卦、旺衰、用神定吉凶 |
| 梅花 | 数字起卦、时间起卦、体用生克 |
| 紫微 | 命盘数据契约（本库只出结构，实际安星可由上层实现或接服务） |
| 大六壬 | 月将加时天地盘、四课、三传（九宗门）、十二天将、旬空、驿马 |
| 奇门 | 时家转盘、拆补法定局、三奇六仪、九星八门八神、值符值使 |

## 安装

```bash
npm install xuanji-core     # 或直接拷贝 core.js / sanshi.js / terms-data.js
```

## 用法

```js
const C = require('./core.js');
const S = require('./sanshi.js');

// 四柱
const b = C.bazi({ y: 1990, m: 6, d: 15, hour: 10, minute: 30, gender: '男' });
console.log(b.pillars.map(p => p.gz.gan + p.gz.zhi).join(' '));  // 庚午 壬午 辛亥 癸巳
console.log(b.pillars[0].ganShiShen, b.pillars[0].zhiShiShen);   // 劫财 七杀

// 节气
const jie = C.jieList(2026).find(x => x.name === '立春');
console.log(jie.date);                                     // 2026-02-04 …

// 农历
console.log(C.solarToLunar(2026, 10, 19));                 // { month: 9, day: 10, isLeap: false, text: '九月初十' }

// 六爻（六次摇卦，取值 6/7/8/9）
const chart = C.buildChart([7, 8, 9, 7, 6, 8], { gan: '甲', zhi: '子' }, 0);
const an = C.analyzeLiuyao(chart, C.YONG_SHEN_MAP['财运']);
console.log(an.guaVerdict.level, an.guaVerdict.score);     // '凶' -4.5

// 大六壬
const lr = S.liuren(new Date(2026, 9, 19, 18, 0));
console.log(lr.sanChuan.method, lr.sanChuan.list.map(x => x.zhi).join(''));

// 奇门
const qm = S.qimen(new Date(2026, 9, 19, 18, 0));
console.log(qm.ju, qm.zhiFu, qm.zhiShi);
```

浏览器直接用 `<script src="core.js">`，挂到 `window.XuanCore`；`sanshi.js` 挂到 `window.XJSanShi`（需先加载 `core.js`）。

## 精度

| 项 | 方法 | 结果 |
|---|---|---|
| 节气 | 内置 1900–2100 表（秒级），超范围回退 Meeus | 2,412 项对拍，最大差 **0.01 分钟** |
| 农历 | 冬至定十一月 + 无中气置闰，1929 年前用北京地方时 | 闰月 0/201、春节 0/201、月初往返 0/1212 |
| 六爻装卦 | 纳甲、世应、旬空、六神 | 0/384、0/64、0/60、0/10 |
| 卦例回归 | 《增删卜易》五例按用神层判定 | 5/5 一致 |
| 六壬三传 | 九宗门，涉害按受克深浅 | 1,464 样本分布合理（贼克 42%、涉害 18%、遥克 10%、伏吟/返吟各 8%） |

运行自检：

```bash
npm test                 # 172 项
node verify-classics.js  # 古书卦例 5 例
```

## 目录

```
core.js            历法 + 八字 + 六爻 + 梅花 + 紫微契约（约 69 KB）
sanshi.js          大六壬 + 奇门（约 18 KB）
terms-data.js      1900–2100 节气表（约 42 KB）
scripture.js       周易 64 卦 + 384 爻辞（约 52 KB）
test.js            172 项自检
verify-classics.js 古书卦例回归
```

## 已知限制

- 六壬**涉害法**用「上神在十二支中受克次数」判定，与逐盘核对二十一等涉害的严格做法可能有个别出入
- 六壬神煞只实现旬空、驿马，未实现贵人起例之外的丁马、天马等
- 奇门只做**时家转盘**，未实现飞盘与年家/月家/日家
- 奇门中五宫的天禽按寄坤二处理（与常见软件一致，但各派不统一）
- 紫微只给数据契约，安星规则未内联

## 免责

本库输出的是**传统术数的规则计算结果**，属于文化研究与娱乐性质，不构成任何医疗、法律、投资或其他专业建议。使用者自行承担据此做出决策的全部后果。

## 许可

MIT
