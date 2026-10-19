/* =====================================================================
 * core.js —— 玄机 · 命理核心算法
 * 纯函数模块，浏览器（window.XuanCore）与 Node（require）通用。
 * 内容：历法/节气/农历、干支、四柱八字、纳音、六爻装卦、梅花易数
 * ===================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.XuanCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- 基础常量 */
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var GAN_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  var ZHI_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };   // 我生
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };      // 我克
  var WX_LIST = ['木', '火', '土', '金', '水'];
  var SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var HOUR_NAME = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
  var HOUR_RANGE = ['23:00-00:59', '01:00-02:59', '03:00-04:59', '05:00-06:59', '07:00-08:59', '09:00-10:59',
    '11:00-12:59', '13:00-14:59', '15:00-16:59', '17:00-18:59', '19:00-20:59', '21:00-22:59'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isYangGan(i) { return i % 2 === 0; }
  function isYangZhi(i) { return i % 2 === 0; }
  // 五行关系：返回 '同' | '生'(a生b) | '克'(a克b) 的反向标记，这里给出 a 对 b 的作用
  function wxRelation(a, b) {
    if (a === b) return '同';
    if (SHENG[a] === b) return '生';   // a 生 b
    if (KE[a] === b) return '克';       // a 克 b
    if (SHENG[b] === a) return '被生';  // b 生 a
    if (KE[b] === a) return '被克';     // b 克 a
    return '?';
  }

  /* ---------------------------------------------------------------- 儒略日 */
  function jdFromDate(y, m, d) { // 公历 0h UT 的儒略日
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  // 整数儒略日（用于干支日：中午标定）
  function jdn(y, m, d) { return Math.floor(jdFromDate(y, m, d) + 0.5); }

  function jdToDate(jd) { // 儒略日 -> 公历（含时分）
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    var a = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var b = a + 1524, c = Math.floor((b - 122.1) / 365.25);
    var d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
    var day = b - d - Math.floor(30.6001 * e) + f;
    var month = e < 14 ? e - 1 : e - 13;
    var year = month > 2 ? c - 4716 : c - 4715;
    var dd = Math.floor(day);
    var frac = day - dd;
    var hours = frac * 24;
    var hh = Math.floor(hours), mm = Math.floor((hours - hh) * 60);
    return { year: year, month: month, day: dd, hour: hh, minute: mm, second: Math.round(((hours - hh) * 60 - mm) * 60) };
  }

  /* ---------------------------------------------------------------- 太阳黄经 / 节气 */
  var RAD = Math.PI / 180;
  function sunLongitude(jd) { // 视黄经（度），输入 TT 儒略日
    var T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    var Mr = M * RAD;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
      + 0.000289 * Math.sin(3 * Mr);
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    return ((lambda % 360) + 360) % 360;
  }
  function deltaT(year) { // 近似 ΔT（秒），1900-2100 足够用
    var t;
    if (year >= 2005 && year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (year >= 1986 && year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5); }
    if (year >= 1961 && year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (year >= 1941 && year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (year >= 1920 && year < 1941) { t = year - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t; }
    if (year >= 1900 && year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * Math.pow(t, 4); }
    t = (year - 1820) / 100;
    return -20 + 32 * t * t;
  }
  // 24 节气：黄经 + 近似公历月日
  var TERMS = [
    { n: '小寒', lon: 285, m: 1, d: 6 }, { n: '大寒', lon: 300, m: 1, d: 20 },
    { n: '立春', lon: 315, m: 2, d: 4 }, { n: '雨水', lon: 330, m: 2, d: 19 },
    { n: '惊蛰', lon: 345, m: 3, d: 6 }, { n: '春分', lon: 0, m: 3, d: 21 },
    { n: '清明', lon: 15, m: 4, d: 5 }, { n: '谷雨', lon: 30, m: 4, d: 20 },
    { n: '立夏', lon: 45, m: 5, d: 6 }, { n: '小满', lon: 60, m: 5, d: 21 },
    { n: '芒种', lon: 75, m: 6, d: 6 }, { n: '夏至', lon: 90, m: 6, d: 21 },
    { n: '小暑', lon: 105, m: 7, d: 7 }, { n: '大暑', lon: 120, m: 7, d: 23 },
    { n: '立秋', lon: 135, m: 8, d: 8 }, { n: '处暑', lon: 150, m: 8, d: 23 },
    { n: '白露', lon: 165, m: 9, d: 8 }, { n: '秋分', lon: 180, m: 9, d: 23 },
    { n: '寒露', lon: 195, m: 10, d: 8 }, { n: '霜降', lon: 210, m: 10, d: 23 },
    { n: '立冬', lon: 225, m: 11, d: 7 }, { n: '小雪', lon: 240, m: 11, d: 22 },
    { n: '大雪', lon: 255, m: 12, d: 7 }, { n: '冬至', lon: 270, m: 12, d: 22 }
  ];
  // 12 节（月令分界）与其对应月支
  var JIE = [
    { n: '立春', lon: 315, zhi: 2, m: 2, d: 4 }, { n: '惊蛰', lon: 345, zhi: 3, m: 3, d: 6 },
    { n: '清明', lon: 15, zhi: 4, m: 4, d: 5 }, { n: '立夏', lon: 45, zhi: 5, m: 5, d: 6 },
    { n: '芒种', lon: 75, zhi: 6, m: 6, d: 6 }, { n: '小暑', lon: 105, zhi: 7, m: 7, d: 7 },
    { n: '立秋', lon: 135, zhi: 8, m: 8, d: 8 }, { n: '白露', lon: 165, zhi: 9, m: 9, d: 8 },
    { n: '寒露', lon: 195, zhi: 10, m: 10, d: 8 }, { n: '立冬', lon: 225, zhi: 11, m: 11, d: 7 },
    { n: '大雪', lon: 255, zhi: 0, m: 12, d: 7 }, { n: '小寒', lon: 285, zhi: 1, m: 1, d: 6 }
  ];

  // 求某年某节气的「北京时间」儒略日
  function termJDCalc(year, lon, m, d) {
    var jd = jdFromDate(year, m, d) - 8 / 24 + deltaT(year) / 86400; // 北京时->UT->TT
    for (var i = 0; i < 12; i++) {
      var cur = sunLongitude(jd);
      var diff = lon - cur;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      jd += diff * 365.2422 / 360;
      if (Math.abs(diff) < 1e-7) break;
    }
    return jd - deltaT(year) / 86400 + 8 / 24; // 回到北京时（UT+8）
  }
  function termJD(year, lon, m, d) {
    if (__TERMS && year >= __TERMS.y0 && year <= __TERMS.y1) {
      var idx = __TERMS.lon.indexOf(lon);
      if (idx >= 0) {
        var secs = __TERMS.rows[year - __TERMS.y0][idx];
        return jdFromDate(year, 1, 1) + secs / 86400;
      }
    }
    return termJDCalc(year, lon, m, d);
  }
  function termTime(year, lon, m, d) { return jdToDate(termJD(year, lon, m, d)); }

  // 某公历年的 12 节（北京时间）
  /* 节气表（1900-2100，秒精度，来源 lunar-javascript）；无表时回退算法 */
  var __TERMS = (function () {
    try { if (typeof XJ_TERMS !== 'undefined' && XJ_TERMS) return XJ_TERMS; } catch (e) { }
    try { if (typeof window !== 'undefined' && window.XJ_TERMS) return window.XJ_TERMS; } catch (e) { }
    try { return require('./terms-data.js'); } catch (e) { return null; }
  })();

  function jieList(year) {
    return JIE.map(function (j) {
      return { name: j.n, zhi: j.zhi, jd: termJD(year, j.lon, j.m, j.d), date: jdToDate(termJD(year, j.lon, j.m, j.d)) };
    }).sort(function (a, b) { return a.jd - b.jd; });
  }

  /* ---------------------------------------------------------------- 月亮：朔 */
  function newMoonJD(k) { // 第 k 个朔（k=0 为 2000-01-06），返回 TT 儒略日
    var T = k / 1236.85;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T
      - 0.000000150 * T * T * T + 0.00000000073 * T * T * T * T;
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var M = (2.5534 + 29.10535670 * k - 0.0000014 * T * T - 0.00000011 * T * T * T) * RAD;
    var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T * T * T - 0.000000058 * T * T * T * T) * RAD;
    var F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T * T * T + 0.000000011 * T * T * T * T) * RAD;
    var Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T * T * T) * RAD;
    var d = -0.40720 * Math.sin(Mp)
      + 0.17241 * E * Math.sin(M)
      + 0.01608 * Math.sin(2 * Mp)
      + 0.01039 * Math.sin(2 * F)
      + 0.00739 * E * Math.sin(Mp - M)
      - 0.00514 * E * Math.sin(Mp + M)
      + 0.00208 * E * E * Math.sin(2 * M)
      - 0.00111 * Math.sin(Mp - 2 * F)
      - 0.00057 * Math.sin(Mp + 2 * F)
      + 0.00056 * E * Math.sin(2 * Mp + M)
      - 0.00042 * Math.sin(3 * Mp)
      + 0.00042 * E * Math.sin(M + 2 * F)
      + 0.00038 * E * Math.sin(M - 2 * F)
      - 0.00024 * E * Math.sin(2 * Mp - M)
      - 0.00017 * Math.sin(Om)
      - 0.00007 * Math.sin(Mp + 2 * M)
      + 0.00004 * Math.sin(2 * Mp - 2 * F)
      + 0.00004 * Math.sin(3 * M)
      + 0.00003 * Math.sin(Mp + M - 2 * F)
      + 0.00003 * Math.sin(2 * Mp + 2 * F)
      - 0.00003 * Math.sin(Mp + M + 2 * F)
      + 0.00003 * Math.sin(Mp - M + 2 * F)
      - 0.00002 * Math.sin(Mp - M - 2 * F)
      - 0.00002 * Math.sin(3 * Mp + M)
      + 0.00002 * Math.sin(4 * Mp);
    return jde + d;
  }
  function newMoonBeijing(k) {
    var jde = newMoonJD(k);
    var y = jdToDate(jde).year;
    return jde - deltaT(y) / 86400 + 8 / 24;
  }
  // 北京时间儒略日 -> 「北京日」整数（以北京 0 点为界）
  function beijingDayNumber(jd) { return Math.floor(jd + 0.5); }
  /* 1929 年前中国历法用北京地方时（UTC+7:45:40），之后用东八区 */
  function cnOffH(jdBeijing) {
    var y = jdToDate(jdBeijing).year;
    return y < 1929 ? (7 + 45 / 60 + 40 / 3600) : 8;
  }
  /* 按「历史当地日」求日序；1929 后与 beijingDayNumber 完全等价 */
  function dayNumHist(jdBeijing) {
    var off = cnOffH(jdBeijing);
    return Math.floor(jdBeijing - (8 - off) / 24 + 0.5);
  }
  function dayStartJD(dayNum) { return dayNum - 0.5; }

  /* ---------------------------------------------------------------- 农历 */
  var LUNAR_MONTH_NAME = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  var LUNAR_DAY_NAME = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  // 找 <= 给定 jd 的最近朔日的 k
  function newMoonIndexBefore(jd) {
    var k = Math.floor((jd - 2451550.09766) / 29.530588861);
    while (newMoonBeijing(k + 1) <= jd) k++;
    while (newMoonBeijing(k) > jd) k--;
    return k;
  }
  // 含该年冬至日的朔月（11 月）的朔序号
  function k11ForYear(y) {
    var dz = beijingDayNumber(termJD(y, 270, 12, 22));
    var k = newMoonIndexBefore(dz);
    while (beijingDayNumber(newMoonBeijing(k)) > dz) k--;
    while (beijingDayNumber(newMoonBeijing(k + 1)) <= dz) k++;
    return k;
  }
  // 中气（黄经 30 的整数倍）落在 [startDay, endDay) 之间的个数（按「日」计，农历以子夜换日）
  function zhongQiDaysBetween(startDay, endDay) {
    var y = jdToDate(dayStartJD(startDay)).year;
    var hits = 0;
    for (var yy = y - 1; yy <= y + 1; yy++) {
      for (var i = 0; i < 12; i++) {
        var lon = i * 30;
        var approxMonth = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2][i];
        var approxDay = [21, 20, 21, 21, 23, 23, 23, 23, 23, 22, 20, 19][i];
        var d = dayNumHist(termJD(yy, lon, approxMonth, approxDay));
        if (d >= startDay && d < endDay) hits++;
      }
    }
    return hits;
  }

  /**
   * 公历 -> 农历。输入北京时间年/月/日（可选时分）。
   * 返回 { year, month, day, isLeap, monthName, dayName, yearGanZhi }
   */
  function solarToLunar(y, m, d, hh, mm) {
    hh = hh || 12; mm = mm || 0;
    var jd = jdFromDate(y, m, d) + (hh + mm / 60) / 24; // 近似：把北京时当 UT 用（误差<1min 量级，不影响日期判断）
    jd = jd; // 北京时
    var dayNum = dayNumHist(jd);

    // 岁：以「含冬至日」的朔月为 11 月；一个岁从该月一日起，至次年 11 月一日常前
    var y0 = jdToDate(dayStartJD(dayNum)).year;
    var k11 = null, k11Start = -Infinity, anchorYear = null;
    for (var yy0 = y0 - 1; yy0 <= y0 + 1; yy0++) {
      var kk = k11ForYear(yy0);
      var ss = dayNumHist(newMoonBeijing(kk));
      if (ss <= dayNum && ss > k11Start) { k11 = kk; k11Start = ss; anchorYear = yy0; }
    }
    if (k11 === null) { k11 = k11ForYear(y0); k11Start = dayNumHist(newMoonBeijing(k11)); anchorYear = y0; }
    var k11next = k11ForYear(anchorYear + 1);
    if (k11next <= k11) k11next = k11 + 12;

    var months = [];
    for (var k = k11; k < k11next; k++) {
      var s = dayNumHist(newMoonBeijing(k));
      var e = dayNumHist(newMoonBeijing(k + 1));
      months.push({ k: k, start: s, end: e, hasZhongQi: zhongQiDaysBetween(s, e) > 0 });
    }
    // 编号
    var leapIndex = -1;
    if (months.length === 13) {
      for (var i = 1; i < months.length; i++) {
        if (!months[i].hasZhongQi) { leapIndex = i; break; }
      }
      if (leapIndex === -1) leapIndex = months.length - 1;
    }
    var num = 11, out = [];
    for (var i2 = 0; i2 < months.length; i2++) {
      var isLeap = (i2 === leapIndex);
      // 闰月沿用上一月的月序（如 闰二月 紧接 二月之后）
      var showNum = isLeap ? (num === 1 ? 12 : num - 1) : num;
      out.push({ start: months[i2].start, end: months[i2].end, num: showNum, isLeap: isLeap });
      if (!isLeap) num = num === 12 ? 1 : num + 1;
    }
    // 目标日所在月
    var target = null;
    for (var j = 0; j < out.length; j++) {
      if (dayNum >= out[j].start && dayNum < out[j].end) { target = out[j]; break; }
    }
    if (!target) target = out[out.length - 1];
    var day = Math.round(dayNum - target.start) + 1;
    // 农历年：以正月初一为界（本岁内 11、12 月仍属上一农历年）
    var zhengStart = null;
    for (var j2 = 0; j2 < out.length; j2++) {
      if (out[j2].num === 1 && !out[j2].isLeap) { zhengStart = out[j2].start; break; }
    }
    var lunarYear;
    if (zhengStart === null) lunarYear = jdToDate(dayStartJD(target.start)).year;
    else {
      var zhengYear = jdToDate(dayStartJD(zhengStart)).year;
      lunarYear = (dayNum >= zhengStart) ? zhengYear : zhengYear - 1;
    }

    return {
      year: lunarYear, month: target.num, day: day, isLeap: target.isLeap,
      monthName: (target.isLeap ? '闰' : '') + LUNAR_MONTH_NAME[target.num - 1] + '月',
      dayName: LUNAR_DAY_NAME[day - 1] || ('第' + day + '日'),
      text: lunarYear + '年 ' + (target.isLeap ? '闰' : '') + LUNAR_MONTH_NAME[target.num - 1] + '月' + (LUNAR_DAY_NAME[day - 1] || day)
    };
  }

  /* ---------------------------------------------------------------- 干支 */
  function ganzhi(i) { i = ((i % 60) + 60) % 60; return { gan: GAN[i % 10], zhi: ZHI[i % 12], ganIdx: i % 10, zhiIdx: i % 12, index: i }; }
  function gzName(i) { var g = ganzhi(i); return g.gan + g.zhi; }

  // 日柱：以 1949-10-01 甲子日、2024-01-01 甲子日为锚点校验通过
  function dayGanZhi(y, m, d) { return ganzhi((jdn(y, m, d) + 49) % 60); }

  // 年柱（以立春为界）
  function yearGanZhi(year, jdExact) {
    var lichun = termJD(year, 315, 2, 4);
    var yy = (jdExact !== undefined && jdExact < lichun) ? year - 1 : year;
    return { gz: ganzhi((yy - 4) % 60), year: yy, lichun: lichun };
  }
  // 月柱（以节为界）
  function monthGanZhi(jdExact) {
    var y = jdToDate(jdExact).year;
    var all = [];
    for (var yy = y - 1; yy <= y + 1; yy++) all = all.concat(jieList(yy));
    all.sort(function (a, b) { return a.jd - b.jd; });
    var idx = -1;
    for (var i = 0; i < all.length; i++) if (all[i].jd <= jdExact) idx = i; else break;
    var cur = all[idx], next = all[idx + 1] || null, prev = all[idx - 1] || null;
    var yGZ = yearGanZhi(y, jdExact).gz;
    var offset = (cur.zhi - 2 + 12) % 12; // 距寅月
    var ganIdx = ((yGZ.ganIdx % 5) * 2 + 2 + offset) % 10;
    return {
      gan: GAN[ganIdx], zhi: ZHI[cur.zhi], ganIdx: ganIdx, zhiIdx: cur.zhi,
      jieName: cur.name, jieJD: cur.jd, nextJie: next, prevJie: prev
    };
  }
  // 时柱
  function hourGanZhi(dayGanIdx, hour) {
    var zhiIdx = Math.floor((hour + 1) / 2) % 12;
    var ganIdx = ((dayGanIdx % 5) * 2 + zhiIdx) % 10;
    return { gan: GAN[ganIdx], zhi: ZHI[zhiIdx], ganIdx: ganIdx, zhiIdx: zhiIdx, index: indexOfGZ(ganIdx, zhiIdx) };
  }

  /* ---------------------------------------------------------------- 十神 / 藏干 / 纳音 */
  var HIDDEN = [ // 地支藏干（本气、中气、余气）
    ['癸'], ['己', '癸', '辛'], ['甲', '丙', '戊'], ['乙'],
    ['戊', '乙', '癸'], ['丙', '庚', '戊'], ['丁', '己'], ['己', '丁', '乙'],
    ['庚', '壬', '戊'], ['辛'], ['戊', '辛', '丁'], ['壬', '甲']
  ];
  var SHISHEN = {
    '同同': '比肩', '同异': '劫财', '生我同': '偏印', '生我异': '正印',
    '我生同': '食神', '我生异': '伤官', '我克同': '偏财', '我克异': '正财',
    '克我同': '七杀', '克我异': '正官'
  };
  // 十神：以日干为「我」，target 为另一个天干索引
  function tenGod(dayGanIdx, targetGanIdx) {
    if (targetGanIdx === undefined || targetGanIdx === null) return '';
    var me = GAN_WX[dayGanIdx], other = GAN_WX[targetGanIdx];
    var sameYinYang = (dayGanIdx % 2) === (targetGanIdx % 2);
    var rel = wxRelation(me, other); // 我 对 对方
    var key;
    if (rel === '同') key = sameYinYang ? '同同' : '同异';
    else if (rel === '生') key = sameYinYang ? '我生同' : '我生异';
    else if (rel === '克') key = sameYinYang ? '我克同' : '我克异';
    else if (rel === '被生') key = sameYinYang ? '生我同' : '生我异';
    else key = sameYinYang ? '克我同' : '克我异';
    return SHISHEN[key];
  }
  // 纳音（30 组，每 2 个干支一组）
  var NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金',
    '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木',
    '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土',
    '天上火', '石榴木', '大海水'];
  function nayin(gzIndex) { return NAYIN[Math.floor(((gzIndex % 60) + 60) % 60 / 2)]; }
  // 旬空
  function kongWang(dayGzIndex) {
    var xunShou = Math.floor(dayGzIndex / 10) * 10;
    var z = xunShou % 12;
    return [ZHI[(z + 10) % 12], ZHI[(z + 11) % 12]];
  }

  /* ---------------------------------------------------------------- 四柱排盘 */
  /**
   * input: { y, m, d, hour (0-23), minute, gender:'男'|'女', ziNext:true }
   * 返回完整八字结构
   */
  function bazi(input) {
    var y = input.y, m = input.m, d = input.d;
    var hour = input.hour == null ? 12 : input.hour;
    var minute = input.minute || 0;
    var jdExact = jdFromDate(y, m, d) + (hour + minute / 60) / 24; // 北京时间坐标（与节气同一坐标系）
    // 真太阳时此处不做修正（未提供经度），仅按北京时间

    // 年柱
    var yP = yearGanZhi(y, jdExact);
    // 月柱
    var mP = monthGanZhi(jdExact);
    // 日柱（晚子时换日）
    var dayShift = (hour >= 23) ? 1 : 0;
    var dGzIndex = (jdn(y, m, d) + 49 + dayShift) % 60;
    var dP = ganzhi(dGzIndex);
    // 时柱
    var hP = hourGanZhi(dP.ganIdx, hour);

    var dayGan = dP.ganIdx;
    var pillars = [
      { name: '年柱', gz: yP.gz, label: '年' },
      { name: '月柱', gz: { gan: mP.gan, zhi: mP.zhi, ganIdx: mP.ganIdx, zhiIdx: mP.zhiIdx, index: indexOfGZ(mP.ganIdx, mP.zhiIdx) }, label: '月' },
      { name: '日柱', gz: dP, label: '日' },
      { name: '时柱', gz: hP, label: '时' }
    ];
    pillars.forEach(function (p) {
      p.ganShiShen = p.label === '日' ? '日主' : tenGod(dayGan, p.gz.ganIdx);
      p.zhiShiShen = tenGod(dayGan, GAN.indexOf(HIDDEN[p.gz.zhiIdx][0]));
      p.hidden = HIDDEN[p.gz.zhiIdx].map(function (g) {
        return { gan: g, shiShen: tenGod(dayGan, GAN.indexOf(g)) };
      });
      p.nayin = nayin(p.gz.index);
      p.kongWang = kongWang(dGzIndex).join('');
    });

    // 五行统计（天干各 1，地支本气 1.2，中气 0.6，余气 0.3；日主本身也计）
    var wx = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach(function (p) {
      wx[GAN_WX[p.gz.ganIdx]] += 1;
      var h = HIDDEN[p.gz.zhiIdx];
      var weights = [1.2, 0.6, 0.3];
      h.forEach(function (g, i) { wx[GAN_WX[GAN.indexOf(g)]] += weights[i] || 0.2; });
    });
    var wxArr = WX_LIST.map(function (k) { return { wx: k, value: Math.round(wx[k] * 10) / 10 }; });
    var totalWX = wxArr.reduce(function (s, x) { return s + x.value; }, 0);

    // 大运
    var dayun = calcDayun(yP.year, yP.gz.ganIdx, mP, jdExact, input.gender, dGzIndex);

    // 起运（简化）
    return {
      input: input,
      jdExact: jdExact,
      pillars: pillars,
      dayGanIdx: dayGan,
      wx: wxArr, totalWX: totalWX,
      wuxingRaw: wx,
      dayun: dayun,
      shengxiao: SHENGXIAO[yP.gz.zhiIdx],
      lunar: solarToLunar(y, m, d, hour, minute),
      jieqi: { monthJie: mP.jieName, nextJie: mP.nextJie ? { name: mP.nextJie.name, date: fd(mP.nextJie.date) } : null }
    };
  }
  function indexOfGZ(g, z) { for (var i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i; return 0; }
  function fd(dt) { return dt.year + '-' + pad(dt.month) + '-' + pad(dt.day) + ' ' + pad(dt.hour) + ':' + pad(dt.minute); }

  function calcDayun(yearForYear, yearGanIdx, mP, jdExact, gender, dayGzIndex) {
    var yangYear = (yearGanIdx % 2 === 0);
    var isMale = gender !== '女';
    var forward = (yangYear && isMale) || (!yangYear && !isMale);
    // 顺排数到「本月结束的节」；逆排数回「本月起始的节」（即 jieJD，不是再前一个节）
    var targetJD = forward ? (mP.nextJie ? mP.nextJie.jd : null) : mP.jieJD;
    var diffDays = targetJD ? Math.abs(targetJD - jdExact) : 15;
    var totalMonths = Math.floor(diffDays / 3 * 12);
    var startY = Math.floor(totalMonths / 12), startM = totalMonths % 12;
    var monthGZIndex = indexOfGZ(mP.ganIdx, mP.zhiIdx);
    var list = [];
    for (var i = 1; i <= 10; i++) {
      var gzIdx = ((monthGZIndex + (forward ? i : -i)) % 60 + 60) % 60;
      var startAge = startY + (i - 1) * 10 + (startM / 12);
      list.push({
        index: i,
        gz: gzName(gzIdx),
        gan: GAN[gzIdx % 10], zhi: ZHI[gzIdx % 12],
        ganIdx: gzIdx % 10, zhiIdx: gzIdx % 12,
        startAge: Math.floor(startAge),
        startYear: yearForYear + Math.floor(startAge),
        ganShiShen: tenGod(dayGzIndex % 10, gzIdx % 10)
      });
    }
    var bd = jdToDate(jdExact);
    var sy = bd.year + startY, sm = bd.month + startM;
    while (sm > 12) { sm -= 12; sy += 1; }
    return {
      forward: forward,
      startDate: sy + '-' + pad(sm),
      diffDays: Math.round(diffDays * 100) / 100,
      jieName: mP.jieName,
      totalMonths: totalMonths,
      startDesc: startY + '岁' + startM + '个月起运',
      startAge: startY + startM / 12,
      list: list
    };
  }

  /* ================================================================ 六爻 */
  var TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  var TRI_BITS = { 乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0], 巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0] };
  var TRI_XIANG = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };
  var TRI_WX = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
  // 纳甲：内卦三爻 / 外卦三爻 的干支
  var NAYIN_YAO = {
    乾: { inner: [['甲', '子'], ['甲', '寅'], ['甲', '辰']], outer: [['壬', '午'], ['壬', '申'], ['壬', '戌']] },
    坎: { inner: [['戊', '寅'], ['戊', '辰'], ['戊', '午']], outer: [['戊', '申'], ['戊', '戌'], ['戊', '子']] },
    艮: { inner: [['丙', '辰'], ['丙', '午'], ['丙', '申']], outer: [['丙', '戌'], ['丙', '子'], ['丙', '寅']] },
    震: { inner: [['庚', '子'], ['庚', '寅'], ['庚', '辰']], outer: [['庚', '午'], ['庚', '申'], ['庚', '戌']] },
    巽: { inner: [['辛', '丑'], ['辛', '亥'], ['辛', '酉']], outer: [['辛', '未'], ['辛', '巳'], ['辛', '卯']] },
    离: { inner: [['己', '卯'], ['己', '丑'], ['己', '亥']], outer: [['己', '酉'], ['己', '未'], ['己', '巳']] },
    坤: { inner: [['乙', '未'], ['乙', '巳'], ['乙', '卯']], outer: [['癸', '丑'], ['癸', '亥'], ['癸', '酉']] },
    兑: { inner: [['丁', '巳'], ['丁', '卯'], ['丁', '丑']], outer: [['丁', '亥'], ['丁', '酉'], ['丁', '未']] }
  };
  // 64 卦名（上卦+下卦）
  var NAME64 = {
    '乾乾': '乾为天', '乾兑': '天泽履', '乾离': '天火同人', '乾震': '天雷无妄', '乾巽': '天风姤', '乾坎': '天水讼', '乾艮': '天山遁', '乾坤': '天地否',
    '兑乾': '泽天夬', '兑兑': '兑为泽', '兑离': '泽火革', '兑震': '泽雷随', '兑巽': '泽风大过', '兑坎': '泽水困', '兑艮': '泽山咸', '兑坤': '泽地萃',
    '离乾': '火天大有', '离兑': '火泽睽', '离离': '离为火', '离震': '火雷噬嗑', '离巽': '火风鼎', '离坎': '火水未济', '离艮': '火山旅', '离坤': '火地晋',
    '震乾': '雷天大壮', '震兑': '雷泽归妹', '震离': '雷火丰', '震震': '震为雷', '震巽': '雷风恒', '震坎': '雷水解', '震艮': '雷山小过', '震坤': '雷地豫',
    '巽乾': '风天小畜', '巽兑': '风泽中孚', '巽离': '风火家人', '巽震': '风雷益', '巽巽': '巽为风', '巽坎': '风水涣', '巽艮': '风山渐', '巽坤': '风地观',
    '坎乾': '水天需', '坎兑': '水泽节', '坎离': '水火既济', '坎震': '水雷屯', '坎巽': '水风井', '坎坎': '坎为水', '坎艮': '水山蹇', '坎坤': '水地比',
    '艮乾': '山天大畜', '艮兑': '山泽损', '艮离': '山火贲', '艮震': '山雷颐', '艮巽': '山风蛊', '艮坎': '山水蒙', '艮艮': '艮为山', '艮坤': '山地剥',
    '坤乾': '地天泰', '坤兑': '地泽临', '坤离': '地火明夷', '坤震': '地雷复', '坤巽': '地风升', '坤坎': '地水师', '坤艮': '地山谦', '坤坤': '坤为地'
  };
  // 卦义（现代整理，非经文原文）
  var GUA_YI = {
    '乾为天': '刚健进取，大通之象。宜守正待时，忌骄亢自满。',
    '坤为地': '柔顺承载，厚德载物。宜守成辅佐，忌争先强出头。',
    '水雷屯': '初生艰难，万事起头难。宜守不宜进，静待外援。',
    '山水蒙': '蒙昧待启，宜虚心求教于人，童蒙求我则吉。',
    '水天需': '等待时机，需而不进，饮食宴乐以待时。',
    '天水讼': '争讼之象，宜和解退让，讼则终凶。',
    '地水师': '兴师动众，宜有纪律统率，不得已而后用。',
    '水地比': '亲比辅佐，择善而从，如众星拱月。',
    '风天小畜': '小有积蓄，力弱未发，宜蓄势待时。',
    '天泽履': '履虎尾而不咬，谨慎前行，礼而后动。',
    '地天泰': '通泰安康，上下交而志同，大吉之象。',
    '天地否': '闭塞不通，上下不交，宜守静待变。',
    '天火同人': '同心同德，与人和同，利涉大川。',
    '火天大有': '大有丰盛，盛大富有，宜谦守不骄。',
    '地山谦': '谦德受益，卑以自牧，无往不利。',
    '雷地豫': '安乐和豫，顺时而动，忌逸乐过度。',
    '泽雷随': '随时随人，顺势而从，择善而随。',
    '山风蛊': '积弊待治，整顿革新，先甲三日后甲三日。',
    '地泽临': '居高临下，渐进而盛，宜教化下人。',
    '风地观': '观察瞻仰，静观其变，以身示人。',
    '火雷噬嗑': '咀嚼除梗，明断是非，宜用刑狱。',
    '山火贲': '文饰之美，饰不掩质，宜重内涵。',
    '山地剥': '剥落衰败，阴盛阳衰，宜止不宜行。',
    '地雷复': '一阳来复，否极泰来，宜循序渐进。',
    '天雷无妄': '无妄之灾，守正不妄为，妄动招祸。',
    '山天大畜': '大有畜积，止健蓄德，宜养贤待时。',
    '山雷颐': '颐养之道，慎言语节饮食，自求口实。',
    '泽风大过': '阳刚过盛，栋梁将折，宜权变救弊。',
    '坎为水': '重险之象，险中求通，守信不失。',
    '离为火': '附丽光明，柔顺中正，宜依附正道。',
    '泽山咸': '感应相通，少男少女相感，婚姻多吉。',
    '雷风恒': '恒久不变，守常持久，忌躁进改弦。',
    '天山遁': '退避隐遁，君子远小人，宜退不宜进。',
    '雷天大壮': '强盛壮健，壮而守正，忌恃强妄动。',
    '火地晋': '晋升上进，明出地上，宜顺势而进。',
    '地火明夷': '光明受伤，晦其明以自守，宜隐忍待时。',
    '风火家人': '家道正，内治有序，宜各守其分。',
    '火泽睽': '乖离不合，同中存异，小事可成大事难。',
    '水山蹇': '艰难险阻，宜止而反身修德，利西南不利东北。',
    '雷水解': '解除险难，宜速决，赦过宥罪。',
    '山泽损': '损下益上，有损乃有益，宜损所当损。',
    '风雷益': '损上益下，增益之时，宜利民利物。',
    '泽天夬': '决断去除，刚决柔，宜明告其罪。',
    '天风姤': '不期而遇，阴长阳消，宜防微杜渐。',
    '泽地萃': '聚合萃集，众聚之象，宜有主宰。',
    '地风升': '上升渐进，柔顺而升，宜积小成大。',
    '泽水困': '困穷之象，处困守正，致命遂志。',
    '水风井': '井养不穷，修己及人，宜守常更新。',
    '泽火革': '变革之象，顺天应人，宜待时机成熟。',
    '火风鼎': '鼎新之象，去故取新，宜正位凝命。',
    '震为雷': '震动惊惧，恐惧修省，临危不乱。',
    '艮为山': '止而不进，时止则止，宜安分守静。',
    '风山渐': '渐进有序，如鸿雁渐进，宜循序不躁。',
    '雷泽归妹': '婚嫁失序，妄动则凶，宜守正待时。',
    '雷火丰': '丰大盛满，日中则昃，宜戒盈守中。',
    '火山旅': '羁旅在外，柔顺谨慎，宜小不宜大。',
    '巽为风': '谦逊顺入，随风而入，宜申命行事。',
    '兑为泽': '喜悦和乐，朋友讲习，宜以诚悦人。',
    '风水涣': '涣散之象，宜聚合人心，以济险难。',
    '水泽节': '节制有度，苦节不可贞，宜守中道。',
    '风泽中孚': '诚信中孚，信及豚鱼，宜以诚感人。',
    '雷山小过': '小有过越，宜小事不宜大事，宜谦下。',
    '水火既济': '事已成，守成防变，初吉终乱。',
    '火水未济': '事未成，慎终如始，有待而进。'
  };

  // 建八宫表
  var HEX = {}; // code '110110' -> {name, palace, wx, shi, ying}
  (function buildPalaces() {
    var SHI_POS = [6, 1, 2, 3, 4, 5, 4, 3];
    ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'].forEach(function (p) {
      var base = TRI_BITS[p].concat(TRI_BITS[p]);
      var bits = base.slice();
      var seq = [];
      seq.push({ bits: bits.slice(), shi: SHI_POS[0] });
      for (var i = 1; i <= 5; i++) { bits = bits.slice(); bits[i - 1] ^= 1; seq.push({ bits: bits.slice(), shi: SHI_POS[i] }); }
      bits = bits.slice(); bits[3] ^= 1; seq.push({ bits: bits.slice(), shi: SHI_POS[6] });
      bits = bits.slice(); bits[0] ^= 1; bits[1] ^= 1; bits[2] ^= 1; seq.push({ bits: bits.slice(), shi: SHI_POS[7] });
      seq.forEach(function (s, idx) {
        var code = s.bits.join('');
        var lower = triNameOf(s.bits.slice(0, 3));
        var upper = triNameOf(s.bits.slice(3, 6));
        var name = NAME64[upper + lower];
        if (!name) throw new Error('缺卦名 ' + upper + lower);
        HEX[code] = {
          code: code, bits: s.bits.slice(), name: name, palace: p, wx: TRI_WX[p],
          shi: s.shi, ying: s.shi > 3 ? s.shi - 3 : s.shi + 3,
          upper: upper, lower: lower, pure: idx === 0, palaceIndex: idx
        };
      });
    });
    if (Object.keys(HEX).length !== 64) throw new Error('六十四卦表不完整: ' + Object.keys(HEX).length);
  })();
  function triNameOf(bits) {
    for (var k in TRI_BITS) if (TRI_BITS[k].join('') === bits.join('')) return k;
    throw new Error('无效三爻 ' + bits.join(''));
  }
  function hexOf(bits) { return HEX[bits.join('')]; }

  // 六亲：宫五行为「我」
  function liuQin(palaceWX, wx) {
    var rel = wxRelation(palaceWX, wx);
    if (rel === '同') return '兄弟';
    if (rel === '生') return '子孙';
    if (rel === '克') return '妻财';
    if (rel === '被生') return '父母';
    if (rel === '被克') return '官鬼';
    return '?';
  }
  var LIU_SHEN = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];
  var LIU_SHEN_DESC = {
    青龙: '主喜庆、财喜、酒色、和合',
    朱雀: '主口舌、文书、信息、争讼',
    勾陈: '主田土、迟滞、牵连、旧事',
    腾蛇: '主虚惊、怪异、纠缠、梦寐',
    白虎: '主凶伤、疾病、丧服、刚猛',
    玄武: '主暗昧、盗贼、欺骗、私情'
  };
  function liuShenStart(dayGanIdx) {
    // 甲乙起青龙，丙丁起朱雀，戊起勾陈，己起腾蛇，庚辛起白虎，壬癸起玄武
    var map = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5];
    return map[dayGanIdx];
  }
  /**
   * 装卦
   * lines: [{value:6|7|8|9}] 自初爻至上爻
   * dayGZ: {ganIdx, zhiIdx, index}
   */
  function buildChart(lines, dayGZ, monthZhiIdx) {
    if (lines.length !== 6) throw new Error('需要六爻');
    var benBits = lines.map(function (l) { return (l.value === 7 || l.value === 9) ? 1 : 0; });
    var dong = lines.map(function (l) { return l.value === 6 || l.value === 9; });
    var bianBits = lines.map(function (l, i) { return dong[i] ? (benBits[i] ^ 1) : benBits[i]; });
    var ben = hexOf(benBits), bian = hexOf(bianBits);
    var palWX = ben.wx;

    // 伏神：本宫首卦中缺失的六亲
    var shou = null;
    for (var k in HEX) if (HEX[k].pure && HEX[k].palace === ben.palace) { shou = HEX[k]; break; }
    var shouYao = buildYao(shou, dayGZ);
    var presentQin = {};
    var benYao = buildYao(ben, dayGZ);
    benYao.forEach(function (y) { presentQin[y.qin] = true; });
    var fuShen = {}; // 爻位(1..6) -> [{qin,gan,zhi,wx}]
    shouYao.forEach(function (y) {
      if (!presentQin[y.qin]) {
        if (!fuShen[y.pos]) fuShen[y.pos] = [];
        fuShen[y.pos].push({ qin: y.qin, gan: y.gan, zhi: y.zhi, wx: y.wx, gz: y.gan + y.zhi });
      }
    });

    var shenStart = liuShenStart(dayGZ.ganIdx);
    var allYao = benYao.map(function (y) {
      return {
        pos: y.pos, yang: y.yang, qin: y.qin, gan: y.gan, zhi: y.zhi, wx: y.wx, gz: y.gan + y.zhi,
        shen: LIU_SHEN[(shenStart + y.pos - 1) % 6],
        dong: dong[y.pos - 1],
        mark: lines[y.pos - 1].value === 9 ? 'o' : (lines[y.pos - 1].value === 6 ? 'x' : ''),
        shiYing: y.pos === ben.shi ? '世' : (y.pos === ben.ying ? '应' : ''),
        fu: fuShen[y.pos] || []
      };
    });
    var bianYao = bianBits.map(function (b, i) {
      // 变卦六亲仍以本卦宫为准（传统做法）
      var tri = i < 3 ? bian.lower : bian.upper;
      var ny = NAYIN_YAO[tri][i < 3 ? 'inner' : 'outer'][i % 3];
      var wx = ZHI_WX[ZHI.indexOf(ny[1])];
      return { pos: i + 1, yang: b === 1, gan: ny[0], zhi: ny[1], gz: ny[0] + ny[1], wx: wx, qin: liuQin(palWX, wx), dong: dong[i] };
    });

    var hu = { // 互卦：2,3,4 为下；3,4,5 为上
      lower: triNameOf([benBits[1], benBits[2], benBits[3]]),
      upper: triNameOf([benBits[2], benBits[3], benBits[4]])
    };
    var huHex = hexOf(TRI_BITS[hu.lower].concat(TRI_BITS[hu.upper]));

    return {
      lines: lines, ben: ben, bian: bian, bianYao: bianYao, hu: huHex,
      yao: allYao, dongYao: allYao.filter(function (y) { return y.dong; }),
      dayGZ: dayGZ, monthZhiIdx: monthZhiIdx,
      kongWang: kongWang(dayGZ.index)
    };
  }
  function buildYao(hex, dayGZ) {
    var out = [];
    for (var i = 0; i < 6; i++) {
      var tri = i < 3 ? hex.lower : hex.upper;
      var ny = NAYIN_YAO[tri][i < 3 ? 'inner' : 'outer'][i % 3];
      var zhiIdx = ZHI.indexOf(ny[1]);
      var wx = ZHI_WX[zhiIdx];
      out.push({
        pos: i + 1, yang: hex.bits[i] === 1, gan: ny[0], zhi: ny[1], zhiIdx: zhiIdx, wx: wx,
        gz: ny[0] + ny[1], qin: liuQin(hex.wx, wx)
      });
    }
    return out;
  }

  // 五行旺衰评分（月建、日辰）
  function wangShuai(wx, monthZhiIdx, dayGZ) {
    var score = 0, notes = [];
    var mWX = ZHI_WX[monthZhiIdx];
    var relM = wxRelation(wx, mWX); // wx 对 月建
    if (relM === '同') { score += 2; notes.push('得月建比扶'); }
    else if (relM === '生') { score -= 1; notes.push('泄气于月建'); }
    else if (relM === '克') { score -= 1.5; notes.push('克月建而受伤'); }
    else if (relM === '被生') { score += 2; notes.push('月建生扶'); }
    else if (relM === '被克') { score -= 2; notes.push('月建克之'); }
    var dWX = ZHI_WX[dayGZ.zhiIdx];
    var relD = wxRelation(wx, dWX);
    if (relD === '同') { score += 1.5; notes.push('日辰比扶'); }
    else if (relD === '生') { score -= 0.5; }
    else if (relD === '克') { score -= 1; }
    else if (relD === '被生') { score += 1.5; notes.push('日辰生扶'); }
    else if (relD === '被克') { score -= 1.5; notes.push('日辰克制'); }
    var level = score >= 2.5 ? '旺' : score >= 0.8 ? '较旺' : score >= -0.8 ? '平' : score >= -2.5 ? '偏弱' : '弱';
    return { score: Math.round(score * 10) / 10, level: level, notes: notes };
  }

  var YONG_SHEN_MAP = {
    '财运': '妻财', '事业': '官鬼', '婚姻': '妻财', '感情': '妻财', '学业': '父母', '考试': '父母',
    '健康': '官鬼', '疾病': '官鬼', '子女': '子孙', '孕产': '子孙', '失物': '妻财', '出行': '父母',
    '官讼': '官鬼', '房产': '父母', '人际': '兄弟',
    '功名': '官鬼', '升迁': '官鬼', '求职': '官鬼', '求名': '官鬼', '其他': '世爻'
  };

  /* ---- 卦象吉凶：按卦辞/彖/大象中的断占语打分（先处理「无咎」「不利」等否定词） ---- */
  var VERDICT_WORDS = [
    ['悔亡', 1.2], ['无不利', 1.2], ['无咎', 1.0], ['无悔', 0.8], ['无攸利', -2.0],
    ['不利', -2.0], ['勿用', -1.0], ['不可', -1.0], ['大吉', 2.5], ['元吉', 2.5],
    ['吉', 1.6], ['凶', -2.0], ['吝', -1.0], ['厉', -1.0], ['悔', -0.6],
    ['亨', 1.4], ['贞', 0.4], ['利', 0.8]
  ];
  function scoreText(txt) {
    var s = 0, hits = [], t = String(txt || '');
    VERDICT_WORDS.forEach(function (p) {
      var re = new RegExp(p[0], 'g');
      var n = (t.match(re) || []).length;
      if (n) { s += n * p[1]; hits.push(p[0] + '×' + n); t = t.replace(re, '□'); }
    });
    return { s: Math.round(s * 10) / 10, hits: hits };
  }
  /** 返回 {score, level, gc, tx, dx, hits} */
  function guaVerdict(S, name) {
    var g = S && S[name];
    if (!g) return null;
    var a = scoreText(g.gc), b = scoreText(g.tx), d = scoreText(g.dx);
    var score = Math.round((a.s + b.s + d.s * 0.4) * 10) / 10;
    var level = score >= 3 ? '偏吉' : score >= 1 ? '稍吉' : score > -1 ? '平' : score > -3 ? '稍凶' : '偏凶';
    return { score: score, level: level, gc: g.gc, tx: g.tx, dx: g.dx, pg: g.pg || '', hits: { gc: a.hits, tx: b.hits, dx: d.hits } };
  }
  var COMBO = {
    'strong-good': '用神有力、彖意亦吉，事多可成，宜乘势而进。',
    'strong-mid': '用神有力而卦象平平，事在人为，成否系于经营。',
    'strong-bad': '用神虽旺，卦象却凶，主强求有得而终有悔，宜敛锋。',
    'mid-good': '用神中和、彖意向好，循理而行，多能顺遂。',
    'mid-mid': '用神与卦象俱平，事无大碍亦无大利，守常为吉。',
    'mid-bad': '用神平平、卦象不佳，宜缓不宜急，先图自保。',
    'weak-good': '用神偏弱而卦象向吉，得外力之助可成，宜借势求人。',
    'weak-mid': '用神偏弱、卦象平平，力有不及，宜蓄势待时。',
    'weak-bad': '用神弱、卦象又凶，所谋多阻，宜止宜守，勿强求。'
  };

  /* ---------- 神煞表 ---------- */
  var TIANYI = { 甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 壬: ['卯', '巳'], 癸: ['卯', '巳'], 辛: ['午', '寅'] };
  var TAOHUA = { 寅: '卯', 午: '卯', 戌: '卯', 申: '酉', 子: '酉', 辰: '酉', 亥: '子', 卯: '子', 未: '子', 巳: '午', 酉: '午', 丑: '午' };
  var YIMA = { 寅: '申', 午: '申', 戌: '申', 申: '寅', 子: '寅', 辰: '寅', 亥: '巳', 卯: '巳', 未: '巳', 巳: '亥', 酉: '亥', 丑: '亥' };
  var HUAGAI = { 寅: '戌', 午: '戌', 戌: '戌', 申: '辰', 子: '辰', 辰: '辰', 亥: '未', 卯: '未', 未: '未', 巳: '丑', 酉: '丑', 丑: '丑' };

  function zhiChong(z) { var i = ZHI.indexOf(z); return i < 0 ? '' : ZHI[(i + 6) % 12]; }
  function zhiHe(z) {
    var P = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
    return P[z] || '';
  }
  function wxWangMonth(wx) {
    var M = { 木: ['寅', '卯'], 火: ['巳', '午'], 金: ['申', '酉'], 水: ['亥', '子'], 土: ['辰', '戌', '丑', '未'] };
    return M[wx] || [];
  }
  /** 依日干/日支给出四类神煞的目标地支 */
  function shenShaTargets(dayGan, dayZhi) {
    return [
      { name: '天乙贵人', zhis: TIANYI[dayGan] || [], from: '日干' + dayGan },
      { name: '桃花', zhis: TAOHUA[dayZhi] ? [TAOHUA[dayZhi]] : [], from: '日支' + dayZhi },
      { name: '驿马', zhis: YIMA[dayZhi] ? [YIMA[dayZhi]] : [], from: '日支' + dayZhi },
      { name: '华盖', zhis: HUAGAI[dayZhi] ? [HUAGAI[dayZhi]] : [], from: '日支' + dayZhi }
    ];
  }
  /** 六爻盘中命中的神煞：返回 [{name, pos, zhi}] */
  function yaoShenSha(chart, dayGan, dayZhi) {
    var t = shenShaTargets(dayGan, dayZhi), out = [];
    t.forEach(function (s) {
      chart.yao.forEach(function (y, i) {
        if (s.zhis.indexOf(y.zhi) >= 0) out.push({ name: s.name, pos: i + 1, zhi: y.zhi, from: s.from });
      });
    });
    return out;
  }
  /** 八字四柱神煞：返回 [{name, pos, from}] */
  function baziShenSha(pillars) {
    var dayGan = pillars[2].gz.gan, dayZhi = pillars[2].gz.zhi;
    var t = shenShaTargets(dayGan, dayZhi), out = [];
    var NAME = ['年', '月', '日', '时'];
    t.forEach(function (s) {
      pillars.forEach(function (p, i) {
        if (s.zhis.indexOf(p.gz.zhi) >= 0) out.push({ name: s.name, pillar: NAME[i], from: s.from });
      });
    });
    return out;
  }
  /** 流年：从起算年到 +5 年 */
  function liuNian(pillars, fromYear) {
    var gz0 = yearGanZhi(fromYear);
    var list = [];
    for (var k = 0; k < 6; k++) {
      var y = fromYear + k;
      var g = yearGanZhi(y);
      list.push({ year: y, gz: g, age: y - fromYear, shiShen: tenGod(pillars[2].gz.gan, g.gan) });
    }
    return list;
  }

  /* ---------- 应期（六爻最缺的一项） ---------- */

  /* ---------- 十二长生 / 胎元 / 流月 ---------- */
  var CS_START = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
  var CS_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  function changSheng(gan, zhi) {
    var s = ZHI.indexOf(CS_START[gan]), i = ZHI.indexOf(zhi);
    if (s < 0 || i < 0) return '';
    var yang = GAN.indexOf(gan) % 2 === 0;
    var k = yang ? (i - s + 12) % 12 : (s - i + 12) % 12;
    return CS_NAMES[k];
  }
  /** 胎元：月干进一位、月支进三位 */
  function taiYuan(pillars) {
    var gi = GAN.indexOf(pillars[1].gz.gan), zi = ZHI.indexOf(pillars[1].gz.zhi);
    return GAN[(gi + 1) % 10] + ZHI[(zi + 3) % 12];
  }
  /** 五虎遁：年干 → 正月（寅月）天干 */
  var WUHU = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
  /** 某流年的十二个月（寅月起） */
  function liuYue(yearGz) {
    var g0 = GAN.indexOf(WUHU[yearGz.gan] || '丙');
    var out = [];
    for (var m = 0; m < 12; m++) {
      out.push({ zhi: ZHI[(2 + m) % 12], gan: GAN[(g0 + m) % 10] });
    }
    return out;
  }


  /* ---------- 真太阳时 ---------- */
  /** 均时差（分钟）：太阳真时 - 平太阳时 */
  function eotMinutes(date) {
    var start = new Date(date.getFullYear(), 0, 1);
    var doy = Math.floor((date - start) / 86400000) + 1;
    var g = (2 * Math.PI / 365) * (doy - 1 + (date.getHours() - 12) / 24);
    var e = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    return e;
  }
  /** 真太阳时换算：返回 { minutes(0-1439), offset, lngOff, eot } */
  function toTrueSolar(hour, minute, lng, date) {
    var base = hour * 60 + minute;
    var lngOff = (lng - 120) * 4;          // 经度差（分钟）
    var eot = eotMinutes(date);            // 均时差（分钟）
    var total = base + lngOff + eot;
    total = ((total % 1440) + 1440) % 1440;
    return { minutes: total, offset: lngOff + eot, lngOff: lngOff, eot: eot };
  }
  function minToHHMM(m) {
    m = Math.round(m);
    var h = Math.floor(m / 60) % 24, mi = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  }


  /* ---------- 夏令时（中国 1986–1991） ---------- */
  var DST = {
    1986: ['05-04', '09-14'], 1987: ['04-12', '09-13'], 1988: ['04-10', '09-11'],
    1989: ['04-16', '09-17'], 1990: ['04-15', '09-16'], 1991: ['04-14', '09-15']
  };
  function isChinaDST(y, m, d) {
    var r = DST[y]; if (!r) return false;
    var md = pad(m) + '-' + pad(d);
    return md >= r[0] && md <= r[1];
  }

  /* ---------- 命宫 / 身宫 ----------
   * 三命通会：命宫数 = 14 −（月支序 + 时支序），≤0 加 12；月支寅=1…丑=12，时支子=1…亥=12
   * 数字 1→寅，12→丑。身宫数 = 月支序 + 时支序（>12 减 12），同法映射。
   */
  function gongFromNum(n) {
    n = ((n - 1) % 12 + 12) % 12;      // 0..11，0=寅
    return (n + 2) % 12;               // ZHI 索引（子=0）
  }
  function gongGan(yearGan, zhiIdx) {
    var g0 = GAN.indexOf(WUHU[yearGan] || '丙');   // 寅月天干
    var off = (zhiIdx - 2 + 12) % 12;
    return GAN[(g0 + off) % 10];
  }
  function mingShenGong(pillars, hourZhiIdx) {
    var mz = pillars[1].gz.zhiIdx;          // 月支
    var mNum = ((mz - 2 + 12) % 12) + 1;    // 寅=1
    var hNum = ((hourZhiIdx - 0 + 12) % 12) + 1; // 子=1
    var mingN = 14 - (mNum + hNum);
    while (mingN <= 0) mingN += 12;
    var shenN = mNum + hNum;
    while (shenN > 12) shenN -= 12;
    var mingZ = gongFromNum(mingN), shenZ = gongFromNum(shenN);
    var yg = pillars[0].gz.gan;
    return {
      ming: { zhiIdx: mingZ, zhi: ZHI[mingZ], gan: gongGan(yg, mingZ) },
      shen: { zhiIdx: shenZ, zhi: ZHI[shenZ], gan: gongGan(yg, shenZ) }
    };
  }

  /* ---------- 六爻：六合 / 三合 / 月破 / 日破 / 反吟伏吟 ---------- */
  var LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  var SANHE = { 申: '水', 子: '水', 辰: '水', 亥: '木', 卯: '木', 未: '木', 寅: '火', 午: '火', 戌: '火', 巳: '金', 酉: '金', 丑: '金' };
  function yaoRelations(chart, monthZhi, dayZhi) {
    var out = [];
    chart.yao.forEach(function (y, i) {
      var tags = [];
      if (zhiChong(y.zhi) === monthZhi) tags.push('月破');
      if (zhiChong(y.zhi) === dayZhi) tags.push('日破');
      if (LIUHE[y.zhi] === dayZhi) tags.push('日合');
      if (LIUHE[y.zhi] === monthZhi) tags.push('月合');
      out.push({ pos: i + 1, zhi: y.zhi, tags: tags, sanhe: SANHE[y.zhi] });
    });
    // 爻间六合
    for (var i = 0; i < 6; i++) {
      for (var j = i + 1; j < 6; j++) {
        if (LIUHE[chart.yao[i].zhi] === chart.yao[j].zhi) {
          out[i].tags.push('与' + (j + 1) + '爻六合');
          out[j].tags.push('与' + (i + 1) + '爻六合');
        }
      }
    }
    // 反吟 / 伏吟：本卦与变卦同位地支
    var fan = 0, fu = 0;
    chart.yao.forEach(function (y, i) {
      var by = chart.bianYao && chart.bianYao[i];
      if (!by || !by.zhi) return;
      if (by.zhi === y.zhi) { fu++; out[i].tags.push('伏吟'); }
      else if (zhiChong(by.zhi) === y.zhi) { fan++; out[i].tags.push('反吟'); }
    });
    return { list: out, fan: fan, fu: fu };
  }

  function yingQi(chart, an) {
    var y = an.yong; if (!y) return { list: [], summary: '' };
    var list = [];
    var kong = (an.kongWang && an.kongWang.zhis) || [];
    var isKong = kong.indexOf(y.zhi) >= 0;

    // 1) 值日 / 冲起
    list.push({
      k: '值日',
      v: y.zhi + '日',
      why: '用神（' + an.yongQin + '）地支是「' + y.zhi + '」，逢这个日子事到临头' + (zhiChong(y.zhi) ? '；若久等不应，则看冲它的「' + zhiChong(y.zhi) + '日」冲起' : '')
    });

    // 2) 值月
    var wm = wxWangMonth(y.wx);
    if (wm.length) list.push({ k: '值月', v: wm.join(' / ') + '月', why: '用神属' + y.wx + '，' + y.wx + '得令之月力量最足' });

    // 3) 旬空 → 出空
    if (isKong) {
      list.push({ k: '出空', v: zhiChong(y.zhi) + '日（冲空）或 ' + y.zhi + '日（填实）', why: '用神逢旬空，空则事虚，须待出空方应' });
    }

    // 4) 动而变
    if (y.dong) {
      var byao = (chart.bianYao && chart.bianYao[y.pos - 1]) || null;
      if (byao && byao.zhi) {
        list.push({ k: '动应', v: byao.zhi + '日 / ' + byao.zhi + '月', why: '用神发动化出「' + byao.gz + '」，变爻值期最验' });
      } else {
        list.push({ k: '动应', v: y.zhi + '日', why: '用神发动，动则速应，多在本旬内' });
      }
    }

    // 5) 忌神发动 → 待制忌
    var jiWx = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }[y.wx];
    var jiShen = chart.dongYao.some(function (d) {
      return d.wx && KE[d.wx] === y.wx;
    });
    if (jiShen) list.push({ k: '解制', v: wxWangMonth(jiWx).join(' / ') + '月', why: '有忌神发动克用神，须待' + jiWx + '气当令、制住忌神方转' });

    var strong = /旺/.test((an.wangShuai && an.wangShuai.level) || '');
    var weak = /弱/.test((an.wangShuai && an.wangShuai.level) || '');
    var summary = strong ? '用神旺，事近，多在数日到本月之内见分晓。'
      : weak ? '用神衰，事远，可能要等到下一个「' + (wm[0] || y.zhi) + '月」，甚至跨年。'
        : '用神中平，应期多在一个节令之内（约 15～30 天）。';
    return { list: list, summary: summary };
  }

  /* ================================================================
   * 用神层吉凶（增删卜易口径）
   * 口诀：用神旺相则吉，休囚则凶；月破旬空主不成；忌神发动克用则凶；
   *       用神伏藏待引；卦逢六冲主散，六合主成。
   * ================================================================ */
  var GUA_CHONG = {
    '乾为天': 1, '兑为泽': 1, '离为火': 1, '震为雷': 1, '巽为风': 1, '坎为水': 1, '艮为山': 1, '坤为地': 1,
    '天雷无妄': 1, '雷天大壮': 1, '天地否': 1, '地天泰': 1
  };
  var GUA_HE = { '山泽损': 1, '泽山咸': 1, '水雷屯': 1, '雷水解': 1 };

  var ZHI_CHONG_MAP = {
    子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
    卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳'
  };

  function yongVerdict(chart, an, subject) {
    var basis = [];
    var add = function (rule, delta, note) { basis.push({ rule: rule, delta: delta, note: note }); };

    var y = an.yong || {};
    var ws = an.wangShuai || { score: 0 };
    var score = Number(ws.score) || 0;
    add('rule.yongshen.wangshuai', score, '用神旺衰 ' + (ws.level || '平') + (ws.notes && ws.notes.length ? '（' + ws.notes.join('、') + '）' : ''));

    if (y.fu) { score -= 1.5; add('rule.yongshen.fucang', -1.5, '用神不上卦，伏藏待引'); }

    var kw = chart.kongWang || [];
    if (y.zhi && kw.indexOf(y.zhi) >= 0) { score -= 2; add('rule.yongshen.xunkong', -2, '用神旬空，主落空待冲实'); }

    var mz = chart.monthZhiIdx;
    if (typeof mz === 'number' && y.zhi && ZHI_CHONG_MAP[ZHI[mz]] === y.zhi) {
      score -= 2.5; add('rule.yongshen.yuepo', -2.5, '用神被月建冲，为月破');
    }

    var nm = chart.ben && chart.ben.name;
    if (nm && GUA_CHONG[nm]) { score -= 2; add('rule.gua.liuchong', -2, '卦逢六冲，主散不成'); }
    else if (nm && GUA_HE[nm]) { score += 1; add('rule.gua.liuhe', 1, '卦逢六合，主成'); }

    var shi = (chart.yao || []).filter(function (x) { return x.shiYing === '世'; })[0];
    if (shi && !y.fu && y.pos === shi.pos) { score += 1; add('rule.shiyong.chishi', 1, '用神持世，事在己手'); }

    /* 忌神：克用神之五行，持世或发动则克用 */
    if (y.wx && KE && KE[y.wx]) {
      var jiWx = KE[y.wx];
      var jiLines = (chart.yao || []).filter(function (x) { return x.wx === jiWx && !x.fu; });
      var jiShi = jiLines.some(function (x) { return x.shiYing === '世'; });
      var jiDong = jiLines.some(function (x) { return x.dong; });
      if (jiShi || jiDong) {
        var d = jiShi ? -2 : -1.5;
        score += d;
        add('rule.jishen.' + (jiShi ? 'chishi' : 'fadong'), d, '忌神（' + jiWx + '）' + (jiShi ? '持世' : '发动') + '克用神');
      }
    }

    /* 用神动化回头生 / 回头克 */
    if (y.pos && !y.fu) {
      var by = (chart.bianYao || [])[y.pos - 1];
      if (by && by.wx && y.wx) {
        if (SHENG[by.wx] === y.wx) { score += 1.5; add('rule.dongbian.huahuisheng', 1.5, '用神动化回头生'); }
        else if (KE[by.wx] === y.wx) { score -= 2; add('rule.dongbian.huahuike', -2, '用神动化回头克'); }
      }
    }

    /* 世爻动化回头克（世为我，受克则事难成） */
    if (shi && shi.dong) {
      var shiBy = (chart.bianYao || [])[shi.pos - 1];
      if (shiBy && shiBy.wx && shi.wx && KE[shiBy.wx] === shi.wx) {
        score -= 2;
        add('rule.shiyong.huahuike', -2, '世爻动化回头克，事难成');
      }
    }

    var level;
    if (score >= 2.5) level = '吉';
    else if (score >= 0.8) level = '偏吉';
    else if (score > -0.8) level = '平';
    else if (score > -2.5) level = '偏凶';
    else level = '凶';

    return { level: level, score: Math.round(score * 10) / 10, basis: basis };
  }

  function analyzeLiuyao(chart, subject, S) {
    var yongQin = YONG_SHEN_MAP[subject] || '世爻';
    var out = { yongQin: yongQin, points: [], yong: null, shi: null };
    var shi = chart.yao.filter(function (y) { return y.shiYing === '世'; })[0];
    out.shi = shi;
    if (yongQin === '世爻') {
      out.yong = shi; out.yongQin = '世爻（' + shi.qin + '）';
    } else {
      var cands = chart.yao.filter(function (y) { return y.qin === yongQin; });
      if (cands.length === 0) {
        // 伏神
        var fu = [];
        chart.yao.forEach(function (y) { y.fu.forEach(function (f) { if (f.qin === yongQin) fu.push({ y: y, f: f }); }); });
        if (fu.length) {
          out.yong = { pos: fu[0].y.pos, qin: yongQin, wx: fu[0].f.wx, zhi: fu[0].f.zhi, gz: fu[0].f.gz, fu: true, under: fu[0].y };
          out.points.push({ type: 'info', text: '用神（' + yongQin + '）不上卦，伏于' + fu[0].y.pos + '爻' + fu[0].y.qin + fu[0].y.gz + '之下（伏神' + fu[0].f.gz + '），主事未显、需待引出。' });
        } else {
          out.points.push({ type: 'warn', text: '用神（' + yongQin + '）不上卦，主所测之事目前无从着力、信息不明。' });
        }
      } else {
        // 用神多现：优先取动爻，其次临世，再次取首见
        var pick = cands.filter(function (c) { return c.dong; })[0] ||
          cands.filter(function (c) { return shi && c.pos === shi.pos; })[0] || cands[0];
        out.yong = pick;
        if (cands.length > 1) out.points.push({ type: 'info', text: '用神两现（' + cands.map(function (c) { return c.pos + '爻'; }).join('、') + '），以动爻、临世或旺者为用，今取 ' + pick.pos + '爻。' });
      }
    }

    var y = out.yong;
    if (y) {
      var ws = wangShuai(y.wx, chart.monthZhiIdx, chart.dayGZ);
      out.wangShuai = ws;
      out.points.push({ type: 'key', text: '用神「' + y.qin + '」' + y.gz + '（' + y.wx + '）：' + ws.level + (ws.notes.length ? '，' + ws.notes.join('、') : '') + '。' });
      if (chart.kongWang.indexOf(y.zhi) >= 0) out.points.push({ type: 'warn', text: '用神逢旬空（' + chart.kongWang.join('') + '），主事虚、缓、未落实。' });

      // 动爻与用神（wxRelation(动, 用) 表示「动爻对用神」的作用方向）
      chart.dongYao.forEach(function (d) {
        var rel = wxRelation(d.wx, y.wx);
        if (d.pos === y.pos) {
          out.points.push({ type: 'key', text: '用神自身发动，事有变动（' + (d.mark === 'o' ? '老阳动' : '老阴动') + '），须看变爻生克。' });
          var by = chart.bianYao[d.pos - 1];
          if (by) {
            var r2 = wxRelation(by.wx, y.wx);
            if (r2 === '生') out.points.push({ type: 'good', text: '变爻' + by.gz + '（' + by.qin + '）回头生用神，先难后易、事有转机。' });
            else if (r2 === '同') out.points.push({ type: 'good', text: '变爻' + by.gz + '（' + by.qin + '）与用神比和，气脉相连，事可延续。' });
            else if (r2 === '克') out.points.push({ type: 'bad', text: '变爻' + by.gz + '（' + by.qin + '）回头克用神，中途生变、宜防反复。' });
            else if (r2 === '被生') out.points.push({ type: 'warn', text: '变爻' + by.gz + '（' + by.qin + '）得用神生之，用神泄气于变爻，事成而耗。' });
            else if (r2 === '被克') out.points.push({ type: 'info', text: '变爻' + by.gz + '（' + by.qin + '）为用神所克，化出之物受制，反主可控。' });
          }
        } else if (rel === '生') {
          out.points.push({ type: 'good', text: '动爻' + d.pos + '爻' + d.qin + d.gz + '生用神，为原神发动，有助益之力。' });
        } else if (rel === '克') {
          out.points.push({ type: 'bad', text: '动爻' + d.pos + '爻' + d.qin + d.gz + '克用神，为忌神发动，主阻力、竞争、阻碍。' });
        } else if (rel === '被生') {
          out.points.push({ type: 'warn', text: '动爻' + d.pos + '爻' + d.qin + d.gz + '得用神生之，用神泄气，主付出、耗损。' });
        } else if (rel === '被克') {
          out.points.push({ type: 'info', text: '动爻' + d.pos + '爻' + d.qin + d.gz + '为用神所克，用神有力能制，主可控。' });
        } else if (rel === '同') {
          out.points.push({ type: 'info', text: '动爻' + d.pos + '爻' + d.qin + d.gz + '与用神比和，主同类相助，亦主分夺。' });
        }
      });

      if (y.pos === (shi && shi.pos)) out.points.push({ type: 'good', text: '用神持世，事在己手，所测之事与自身关系最切。' });
      else if (shi) {
        var relS = wxRelation(shi.wx, y.wx); // 世 对 用神
        if (relS === '被生') out.points.push({ type: 'good', text: '用神生世爻：事来就我，多有不劳而获、顺遂之象。' });
        else if (relS === '生') out.points.push({ type: 'info', text: '世爻生用神：我方主动付出，有心求取，然亦耗己之力。' });
        else if (relS === '被克') out.points.push({ type: 'bad', text: '用神克世爻：事来扰我，压力较大，宜防劳心受制。' });
        else if (relS === '克') out.points.push({ type: 'warn', text: '世爻克用神：我能制事，然需强求，力所及者方可成。' });
        else if (relS === '同') out.points.push({ type: 'info', text: '世与用神比和：我与所测之事同类，得之亦分，宜防争竞。' });
      }
    }
    var gv = guaVerdict(S, chart.ben.name);
    if (gv) {
      out.guaVerdict = gv;
      out.points.push({
        type: gv.score >= 1 ? 'good' : gv.score <= -1 ? 'bad' : 'info',
        text: '卦象吉凶（彖辞为主）：' + gv.level + '（' + (gv.score > 0 ? '+' : '') + gv.score + '）——' + (gv.tx || gv.gc).slice(0, 30) + '…'
      });
      if (out.wangShuai) {
        var wsKey = /旺/.test(out.wangShuai.level) ? 'strong' : /弱/.test(out.wangShuai.level) ? 'weak' : 'mid';
        var gvKey = gv.score >= 1 ? 'good' : gv.score <= -1 ? 'bad' : 'mid';
        out.combo = COMBO[wsKey + '-' + gvKey];
        out.points.push({ type: gvKey === 'bad' ? 'warn' : 'key', text: '综论：用神' + out.wangShuai.level + '，卦象' + gv.level + '。' + out.combo });
      }
    }
    out.points.push({ type: 'info', text: '本月建：' + ZHI[chart.monthZhiIdx] + '（' + ZHI_WX[chart.monthZhiIdx] + '），日辰：' + chart.dayGZ.gan + chart.dayGZ.zhi + '，旬空：' + chart.kongWang.join('') + '。' });
    return out;
  }

  /* ================================================================ 梅花易数 */
  function meihuaFromNumbers(a, b, extra) {
    a = Math.max(1, Math.abs(Math.round(a) || 1));
    b = Math.max(1, Math.abs(Math.round(b) || 1));
    var extraN = extra == null ? 0 : Math.abs(Math.round(extra));
    // 数除八，余数取卦：1乾 2兑 3离 4震 5巽 6坎 7艮 8(0)坤
    var upName = TRIGRAMS[((a % 8) + 7) % 8];
    var lowName = TRIGRAMS[((b % 8) + 7) % 8];
    var dong = (((a + b + extraN) - 1) % 6 + 6) % 6 + 1; // 1..6
    return meihuaBuild(upName, lowName, dong, { a: a, b: b });
  }
  function meihuaFromTime(dt) {
    // 传统法：农历年支序数 + 农历月 + 农历日 = 上卦数；再加时辰数 = 下卦数
    var lunar = solarToLunar(dt.year, dt.month, dt.day, dt.hour || 12, dt.minute || 0);
    var yearZhiNum = (lunar.year - 4) % 12; if (yearZhiNum < 0) yearZhiNum += 12; yearZhiNum += 1;
    var monthNum = lunar.month + (lunar.isLeap ? 0 : 0);
    var dayNum = lunar.day;
    var shiNum = Math.floor(((dt.hour || 12) + 1) / 2) % 12 + 1;
    var a = yearZhiNum + monthNum + dayNum;
    var b = a + shiNum;
    var upName = TRIGRAMS[(a % 8 + 7) % 8];
    var lowName = TRIGRAMS[(b % 8 + 7) % 8];
    var dong = (b % 6 === 0) ? 6 : b % 6;
    var res = meihuaBuild(upName, lowName, dong, { a: a, b: b, lunar: lunar, shiNum: shiNum });
    res.lunar = lunar;
    return res;
  }
  function meihuaBuild(upName, lowName, dong, meta) {
    var bits = TRI_BITS[lowName].concat(TRI_BITS[upName]);
    var ben = hexOf(bits);
    var dongIdx = dong - 1;
    var bianBits = bits.slice(); bianBits[dongIdx] ^= 1;
    var bian = hexOf(bianBits);
    // 互卦
    var huLower = triNameOf([bits[1], bits[2], bits[3]]);
    var huUpper = triNameOf([bits[2], bits[3], bits[4]]);
    var hu = hexOf(TRI_BITS[huLower].concat(TRI_BITS[huUpper]));
    // 体用：动爻所在卦为用，另一卦为体
    var dongInUpper = dongIdx >= 3;
    var tiName = dongInUpper ? lowName : upName;
    var yongName = dongInUpper ? upName : lowName;
    var ti = { name: tiName, wx: TRI_WX[tiName], xiang: TRI_XIANG[tiName], pos: dongInUpper ? '下卦' : '上卦' };
    var yong = { name: yongName, wx: TRI_WX[yongName], xiang: TRI_XIANG[yongName], pos: dongInUpper ? '上卦' : '下卦' };
    var rel = wxRelation(ti.wx, yong.wx); // 体 对 用
    var verdict, level;
    if (rel === '同') { verdict = '体用比和，事多顺遂，谋为易成。'; level = '吉'; }
    else if (rel === '生') { verdict = '体生用：我方付出、耗损，事可成而费力，求财多泄。'; level = '平'; }
    else if (rel === '克') { verdict = '体克用：我强彼弱，事在掌握，求谋可成，唯稍迟。'; level = '吉'; }
    else if (rel === '被生') { verdict = '用生体：外来得助，不劳而获之象，大吉。'; level = '吉'; }
    else { verdict = '用克体：彼强我弱，事多阻隔，宜守不宜进。'; level = '凶'; }
    // 互卦、变卦辅助
    var huTi = dongInUpper ? { name: huLower, wx: TRI_WX[huLower] } : { name: huUpper, wx: TRI_WX[huUpper] };
    var bianTi = dongInUpper ? { name: bian.lower, wx: TRI_WX[bian.lower] } : { name: bian.upper, wx: TRI_WX[bian.upper] };
    var relHu = wxRelation(ti.wx, huTi.wx);   // 体 对 互
    var relBian = wxRelation(ti.wx, bianTi.wx); // 体 对 变
    function tail(rel, good, bad) {
      if (rel === '被生') return '生体，' + good;
      if (rel === '同') return '与体比和，平顺';
      if (rel === '被克') return '克体，' + bad;
      if (rel === '生') return '得体之生，耗我之力';
      return '为体所制，事可掌握';
    }
    var notes = [];
    notes.push('互卦' + hu.name + '（' + huTi.name + '·' + huTi.wx + '）' + tail(relHu, '中段得助', '中段有阻') + '。');
    notes.push('变卦' + bian.name + '（' + bianTi.name + '·' + bianTi.wx + '）' + tail(relBian, '结局向好', '结局宜防反复') + '。');
    return {
      ben: ben, bian: bian, hu: hu, dong: dong, ti: ti, yong: yong,
      rel: rel, verdict: verdict, level: level, notes: notes, meta: meta
    };
  }

  /* ================================================================ 摇卦 */
  function randomCoin() {
    // 真随机：crypto 优先
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var b = new Uint8Array(1); crypto.getRandomValues(b); return b[0] & 1;
    }
    return Math.random() < 0.5 ? 0 : 1;
  }
  function castLine() {
    var sum = 0;
    for (var i = 0; i < 3; i++) sum += randomCoin() ? 3 : 2; // 字(阳)=3，背=2
    return { value: sum, name: { 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' }[sum], dong: sum === 6 || sum === 9, yang: sum === 7 || sum === 9 };
  }

  /* 用神层提为主判断：卦辞层保留为 cigu 参考 */
  (function () {
    var __origAnalyzeLiuyao = analyzeLiuyao;
    analyzeLiuyao = function (chart, subject, S) {
      var an = __origAnalyzeLiuyao(chart, subject, S);
      try {
        var yv = yongVerdict(chart, an, subject);
        an.guaVerdict = {
          level: yv.level, score: yv.score, basis: yv.basis,
          cigu: an.guaVerdict
        };
      } catch (e) { /* 出错则保留卦辞结论 */ }
      return an;
    };
  })();

  return {
    GAN: GAN, ZHI: ZHI, GAN_WX: GAN_WX, ZHI_WX: ZHI_WX, SHENG: SHENG, KE: KE, WX_LIST: WX_LIST,
    SHENGXIAO: SHENGXIAO, HOUR_NAME: HOUR_NAME, HOUR_RANGE: HOUR_RANGE,
    TRIGRAMS: TRIGRAMS, TRI_BITS: TRI_BITS, TRI_XIANG: TRI_XIANG, TRI_WX: TRI_WX,
    HEX: HEX, NAME64: NAME64, GUA_YI: GUA_YI, NAYIN_YAO: NAYIN_YAO, LIU_SHEN: LIU_SHEN, LIU_SHEN_DESC: LIU_SHEN_DESC,
    HIDDEN: HIDDEN, NAYIN: NAYIN,
    wxRelation: wxRelation, jdFromDate: jdFromDate, jdn: jdn, jdToDate: jdToDate,
    sunLongitude: sunLongitude, termJD: termJD, termTime: termTime, TERMS: TERMS, JIE: JIE, jieList: jieList,
    solarToLunar: solarToLunar, newMoonJD: newMoonJD,
    ganzhi: ganzhi, gzName: gzName, dayGanZhi: dayGanZhi, yearGanZhi: yearGanZhi, monthGanZhi: monthGanZhi,
    hourGanZhi: hourGanZhi, tenGod: tenGod, nayin: nayin, kongWang: kongWang, indexOfGZ: indexOfGZ,
    bazi: bazi, hexOf: hexOf, triNameOf: triNameOf, liuQin: liuQin, buildChart: buildChart, buildYao: buildYao,
    wangShuai: wangShuai, analyzeLiuyao: analyzeLiuyao, YONG_SHEN_MAP: YONG_SHEN_MAP, scoreText: scoreText, guaVerdict: guaVerdict, yingQi: yingQi, yaoShenSha: yaoShenSha, baziShenSha: baziShenSha, liuNian: liuNian, changSheng: changSheng, taiYuan: taiYuan, liuYue: liuYue, eotMinutes: eotMinutes, isChinaDST: isChinaDST, mingShenGong: mingShenGong, yaoRelations: yaoRelations, toTrueSolar: toTrueSolar, minToHHMM: minToHHMM, zhiChong: zhiChong, zhiHe: zhiHe,
    meihuaFromNumbers: meihuaFromNumbers, meihuaFromTime: meihuaFromTime, meihuaBuild: meihuaBuild,
    castLine: castLine, pad: pad
  };
});
