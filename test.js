/* test.js —— 核心算法自检（node test.js） */
const C = require('./core.js');
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (extra ? '  →  ' + extra : '')); }
}
function eq(name, a, b) { ok(name, JSON.stringify(a) === JSON.stringify(b), `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); }
function near(name, a, b, tol) { ok(name, Math.abs(a - b) <= tol, `got ${a} want ${b}±${tol}`); }

/* ---------- 1. 六十四卦表 ---------- */
eq('64卦数量', Object.keys(C.HEX).length, 64);
const names = new Set(Object.values(C.HEX).map(h => h.name));
eq('64卦名称唯一', names.size, 64);
const spot = [
  ['111111', '乾为天', '乾', 6], ['000000', '坤为地', '坤', 6],
  ['011111', '天风姤', '乾', 1], ['001111', '天山遁', '乾', 2],
  ['000111', '天地否', '乾', 3], ['000011', '风地观', '乾', 4],
  ['000001', '山地剥', '乾', 5], ['000101', '火地晋', '乾', 4],
  ['111101', '火天大有', '乾', 3], ['110110', '兑为泽', '兑', 6],
  ['010010', '坎为水', '坎', 6], ['101101', '离为火', '离', 6],
  ['100100', '震为雷', '震', 6], ['011011', '巽为风', '巽', 6],
  ['001001', '艮为山', '艮', 6], ['100010', '水雷屯', '坎', 2],
  ['010001', '山水蒙', '离', 4], ['111010', '水天需', '坤', 4],
  ['010111', '天水讼', '离', 4], ['010000', '地水师', '坎', 3],
  ['010101', '火水未济', '离', 3], ['101010', '水火既济', '坎', 3],
  ['011101', '火风鼎', '离', 2], ['000010', '水地比', '坤', 3]
];
spot.forEach(([code, name, palace, shi]) => {
  const h = C.HEX[code];
  ok(`卦 ${code} 名`, h && h.name === name, h ? h.name : 'missing');
  ok(`卦 ${name} 宫`, h && h.palace === palace, h ? h.palace : '');
  ok(`卦 ${name} 世`, h && h.shi === shi, h ? h.shi : '');
  ok(`卦 ${name} 应`, h && h.ying === (shi > 3 ? shi - 3 : shi + 3), h ? h.ying : '');
});

/* ---------- 2. 纳甲 ---------- */
const yaoQian = C.buildYao(C.HEX['111111'], { ganIdx: 0, zhiIdx: 0, index: 0 });
eq('乾初爻纳甲', [yaoQian[0].gan, yaoQian[0].zhi], ['甲', '子']);
eq('乾四爻纳甲', [yaoQian[3].gan, yaoQian[3].zhi], ['壬', '午']);
eq('乾上爻纳甲', [yaoQian[5].gan, yaoQian[5].zhi], ['壬', '戌']);
const yaoKun = C.buildYao(C.HEX['000000'], { ganIdx: 0, zhiIdx: 0, index: 0 });
eq('坤初爻纳甲', [yaoKun[0].gan, yaoKun[0].zhi], ['乙', '未']);
eq('坤上爻纳甲', [yaoKun[5].gan, yaoKun[5].zhi], ['癸', '酉']);
eq('乾初爻六亲(金宫子水)', yaoQian[0].qin, '子孙');
eq('坤初爻六亲(土宫未土)', yaoKun[0].qin, '兄弟');
const yaoLi = C.buildYao(C.HEX['101101'], { ganIdx: 0, zhiIdx: 0, index: 0 });
eq('离初爻纳甲', [yaoLi[0].gan, yaoLi[0].zhi], ['己', '卯']);

/* ---------- 3. 日柱锚点 ---------- */
eq('1949-10-01 日柱', C.ganzhi((C.jdn(1949, 10, 1) + 49) % 60).gan + C.ganzhi((C.jdn(1949, 10, 1) + 49) % 60).zhi, '甲子');
eq('2024-01-01 日柱', C.ganzhi((C.jdn(2024, 1, 1) + 49) % 60).gan + C.ganzhi((C.jdn(2024, 1, 1) + 49) % 60).zhi, '甲子');
eq('2000-01-01 日柱', C.ganzhi((C.jdn(2000, 1, 1) + 49) % 60).gan + C.ganzhi((C.jdn(2000, 1, 1) + 49) % 60).zhi, '戊午');

/* ---------- 4. 节气 ---------- */
function dateOf(y, lon, m, d) { const t = C.termTime(y, lon, m, d); return t; }
const termCases = [
  ['立春2024', 2024, 315, 2, 4, [2024, 2, 4], 16],
  ['立春2023', 2023, 315, 2, 4, [2023, 2, 4], 10],
  ['立春2025', 2025, 315, 2, 3, [2025, 2, 3], 22],
  ['冬至2024', 2024, 270, 12, 22, [2024, 12, 21], 17],
  ['夏至2024', 2024, 90, 6, 21, [2024, 6, 21], 4],
  ['清明2024', 2024, 15, 4, 5, [2024, 4, 4], 15]
];
termCases.forEach(([n, y, lon, m, d, want, wantHour]) => {
  const t = dateOf(y, lon, m, d);
  eq(n + ' 日期', [t.year, t.month, t.day], want);
  near(n + ' 小时', t.hour, wantHour, 2);
  if (t.hour !== wantHour) console.log('   ' + n + ' 实际: ' + t.year + '-' + t.month + '-' + t.day + ' ' + t.hour + ':' + C.pad(t.minute));
});

/* ---------- 5. 农历 ---------- */
const spring = [
  [2024, 2, 10], [2025, 1, 29], [2023, 1, 22], [2022, 2, 1], [2021, 2, 12],
  [2020, 1, 25], [2019, 2, 5], [2018, 2, 16], [2017, 1, 28], [2016, 2, 8], [2010, 2, 14]
];
spring.forEach(([y, m, d]) => {
  const l = C.solarToLunar(y, m, d);
  eq(`春节 ${y}-${m}-${d}`, [l.year, l.month, l.day, l.isLeap], [y, 1, 1, false]);
});
// 闰月
const leaps = [
  [2023, 3, 22, 2023, 2], [2020, 5, 23, 2020, 4], [2017, 7, 23, 2017, 6], [2025, 7, 25, 2025, 6]
];
leaps.forEach(([y, m, d, ly, lm]) => {
  const l = C.solarToLunar(y, m, d);
  eq(`闰月 ${y}-${m}-${d}`, [l.year, l.month, l.day, l.isLeap], [ly, lm, 1, true]);
});
// 除夕前一天仍在上一农历年
eq('2024-02-09 为癸卯年腊月三十', (() => { const l = C.solarToLunar(2024, 2, 9); return [l.year, l.month, l.day]; })(), [2023, 12, 30]);
eq('2024-01-01 为癸卯年冬月二十', (() => { const l = C.solarToLunar(2024, 1, 1); return [l.year, l.month, l.day]; })(), [2023, 11, 20]);

/* ---------- 6. 八字 ---------- */
const b1 = C.bazi({ y: 2024, m: 2, d: 10, hour: 12, minute: 0, gender: '男' });
eq('八字 2024-02-10 12:00', b1.pillars.map(p => p.gz.gan + p.gz.zhi), ['甲辰', '丙寅', '甲辰', '庚午']);
eq('八字 空亡', b1.pillars[2].kongWang, '寅卯');
eq('八字 纳音年柱', b1.pillars[0].nayin, '覆灯火');
eq('八字 生肖', b1.shengxiao, '龙');
eq('八字 十神年干', b1.pillars[0].ganShiShen, '比肩');
eq('八字 十神月干', b1.pillars[1].ganShiShen, '食神');
const b2 = C.bazi({ y: 2024, m: 2, d: 1, hour: 0, minute: 0, gender: '男' });
eq('立春前年柱仍癸卯', b2.pillars[0].gz.gan + b2.pillars[0].gz.zhi, '癸卯');
eq('立春前月柱为乙丑', b2.pillars[1].gz.gan + b2.pillars[1].gz.zhi, '乙丑');
const b3 = C.bazi({ y: 1990, m: 7, d: 15, hour: 8, minute: 30, gender: '女' });
eq('八字 1990-07-15 08:30', b3.pillars.map(p => p.gz.gan + p.gz.zhi), ['庚午', '癸未', '辛巳', '壬辰']);
ok('大运数量', b3.dayun.list.length === 10);
ok('大运逆排(阳年女)', b3.dayun.forward === false, 'forward=' + b3.dayun.forward);
ok('逆排起运约2岁7个月', b3.dayun.startAge > 2.3 && b3.dayun.startAge < 3.2, 'startAge=' + b3.dayun.startAge.toFixed(2));
ok('逆排首运壬午', b3.dayun.list[0].gz === '壬午', b3.dayun.list[0].gz);
const b3m = C.bazi({ y: 1990, m: 7, d: 15, hour: 8, minute: 30, gender: '男' });
ok('大运顺排(阳年男)', b3m.dayun.forward === true);
ok('顺排起运约8岁', b3m.dayun.startAge > 7.4 && b3m.dayun.startAge < 8.6, 'startAge=' + b3m.dayun.startAge.toFixed(2));
ok('顺排首运甲申', b3m.dayun.list[0].gz === '甲申', b3m.dayun.list[0].gz);

/* ---------- 7. 梅花 ---------- */
const m1 = C.meihuaFromNumbers(1, 1);
eq('梅花 1,1 上卦', m1.ben.upper, '乾');
eq('梅花 1,1 下卦', m1.ben.lower, '乾');
eq('梅花 1,1 卦名', m1.ben.name, '乾为天');
eq('梅花 1,1 动爻', m1.dong, 2);
const m2 = C.meihuaFromNumbers(8, 8);
eq('梅花 8,8 上下卦', [m2.ben.upper, m2.ben.lower], ['坤', '坤']);
const m3 = C.meihuaFromNumbers(7, 3);
eq('梅花 7,3 上下卦', [m3.ben.upper, m3.ben.lower], ['艮', '离']);
eq('梅花 7,3 卦名', m3.ben.name, '山火贲');

/* ---------- 8. 六爻整盘 ---------- */
const dz = { ganIdx: 0, zhiIdx: 0, index: 0 }; // 甲子日
const chart = C.buildChart([7, 7, 7, 7, 7, 7].map(v => ({ value: v })), dz, 2);
eq('乾卦世应标记', chart.yao.map(y => y.shiYing), ['', '', '应', '', '', '世']);
eq('初爻六神(甲日)', chart.yao[0].shen, '青龙');
eq('上爻六神', chart.yao[5].shen, '玄武');
const chart2 = C.buildChart([9, 8, 7, 6, 7, 8].map(v => ({ value: v })), dz, 2);
ok('动爻数量', chart2.dongYao.length === 2, 'got ' + chart2.dongYao.length);
ok('变卦名', !!chart2.bian.name, chart2.bian.name);
ok('伏神解析不报错', Array.isArray(C.analyzeLiuyao(chart2, '财运').points));

/* ---------- 9. 摇卦概率 ---------- */
let cnt = { 6: 0, 7: 0, 8: 0, 9: 0 };
for (let i = 0; i < 40000; i++) cnt[C.castLine().value]++;
ok('摇卦只出 6/7/8/9', Object.keys(cnt).every(k => cnt[k] > 0));
near('老阳概率', cnt[9] / 40000, 1 / 8, 0.012);
near('少阳概率', cnt[7] / 40000, 3 / 8, 0.015);
near('少阴概率', cnt[8] / 40000, 3 / 8, 0.015);
near('老阴概率', cnt[6] / 40000, 1 / 8, 0.012);

/* ---------- 汇总 ---------- */
console.log(`\n通过 ${pass} / 失败 ${fail}`);
if (fails.length) { console.log('失败项：'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('全部通过 ✓');
