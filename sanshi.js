/* sanshi.js —— 三式：大六壬 + 奇门遁甲（时家转盘）
 * 依赖 core.js 的干支/节气/月将基础
 * 说明：六壬三传按九宗门实现（涉害用孟仲季简法），奇门用拆补法定局
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.XJSanShi = api;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this), function (root) {
  'use strict';
  var C = (typeof require === 'function' && typeof module === 'object') ? require('./core.js') : root.XuanCore;

  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };      // A 克 B
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };    // A 生 B

  /* 日干寄宫（六壬） */
  var JI_GONG = { 甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳', 己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑' };

  /* 月将：中气后太阳所在宫 */
  var JIANG = [
    { qi: '雨水', jiang: '亥', name: '登明' }, { qi: '春分', jiang: '戌', name: '河魁' },
    { qi: '谷雨', jiang: '酉', name: '从魁' }, { qi: '小满', jiang: '申', name: '传送' },
    { qi: '夏至', jiang: '未', name: '小吉' }, { qi: '大暑', jiang: '午', name: '胜光' },
    { qi: '处暑', jiang: '巳', name: '太乙' }, { qi: '秋分', jiang: '辰', name: '天罡' },
    { qi: '霜降', jiang: '卯', name: '太冲' }, { qi: '小雪', jiang: '寅', name: '功曹' },
    { qi: '冬至', jiang: '丑', name: '大吉' }, { qi: '大寒', jiang: '子', name: '神后' }
  ];

  /* 十二天将 */
  var JIANG_SHEN = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];
  /* 昼夜贵人（甲戊庚牛羊…） */
  var GUI_REN = {
    甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
    乙: ['子', '申'], 己: ['子', '申'],
    丙: ['亥', '酉'], 丁: ['亥', '酉'],
    壬: ['卯', '巳'], 癸: ['卯', '巳'],
    辛: ['午', '寅']
  };

  /* 旬空 */
  function xunKong(gan, zhi) {
    var gi = GAN.indexOf(gan), zi = ZHI.indexOf(zhi);
    var off = (zi - gi + 12) % 12;          // 旬内序差
    var xunStart = (zi - off + 12) % 12;    // 旬首地支
    return [ZHI[(xunStart + 10) % 12], ZHI[(xunStart + 11) % 12]];
  }

  function zhiIdx(z) { return ZHI.indexOf(z); }

  /* ---------- 天地盘：月将加占时 ---------- */
  function tianDiPan(jiangZhi, hourZhi) {
    /* 天盘[地盘支] = 某支；月将落在时支位 */
    var shift = (zhiIdx(jiangZhi) - zhiIdx(hourZhi) + 12) % 12;
    var pan = {};
    for (var i = 0; i < 12; i++) pan[ZHI[i]] = ZHI[(i + shift) % 12];
    return pan;
  }

  /* ---------- 六壬 ---------- */
  function liuren(date) {
    date = date || new Date();
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate(), hh = date.getHours();
    var day = C.dayGanZhi(y, m, d);
    var hourIdx = (hh === 23) ? 12 : Math.floor(((hh + 1) % 24) / 2);
    var hourGan = hourPillar(day.gan, hourIdx);
    var hourZhi = ZHI[hourIdx % 12];

    /* 月将：找最近已过的中气 */
    var jiangInfo = monthJiang(y, m, d);
    var pan = tianDiPan(jiangInfo.jiang, hourZhi);

    /* 四课 */
    var ganGong = JI_GONG[day.gan];
    var ke1 = pan[ganGong];                       // 日干上神
    var ke2 = pan[ke1];                           // 日干上神之上神
    var ke3 = pan[day.zhi];                       // 日支上神
    var ke4 = pan[ke3];
    var siKe = [
      { no: 1, xia: ganGong, shang: ke1, tag: '干上' },
      { no: 2, xia: ke1, shang: ke2, tag: '干阴' },
      { no: 3, xia: day.zhi, shang: ke3, tag: '支上' },
      { no: 4, xia: ke3, shang: ke4, tag: '支阴' }
    ];
    siKe.forEach(function (k) { k.ke = relation(k.xia, k.shang); });

    /* 三传 */
    var sanChuan = makeSanChuan(siKe, day, pan);

    /* 天将 */
    var pals = tianJiang(day.gan, hourIdx, pan, sanChuan);

    return {
      date: y + '-' + m + '-' + d + ' ' + pad(hh) + ':' + pad(date.getMinutes()),
      dayGZ: day.gan + day.zhi,
      hourGZ: (hourGan ? hourGan.gan : '') + hourZhi,
      hourZhi: hourZhi,
      jiang: jiangInfo,
      pan: pan,
      siKe: siKe,
      sanChuan: sanChuan,
      jiangShen: pals,
      xunKong: xunKong(day.gan, day.zhi),
      yiMa: yiMa(day.zhi)
    };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* 时柱（五鼠遁）：甲己起甲子、乙庚起丙子、丙辛起戊子、丁壬起庚子、戊癸起壬子 */
  var ZI_START = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 };
  function hourPillar(dayGan, hourIdx) {
    var zg = ZI_START[dayGan] === undefined ? 0 : ZI_START[dayGan];
    var idx = (zg + hourIdx) % 10;
    return { gan: GAN[idx], zhi: ZHI[hourIdx % 12], ganIdx: idx, zhiIdx: hourIdx % 12 };
  }

  /* 月将：按中气 */
  function monthJiang(y, m, d) {
    var names = JIANG.map(function (j) { return j.qi; });
    var all = [];
    for (var yy = y - 1; yy <= y + 1; yy++) {
      var t = C.jieList(yy) || [];
      t.forEach(function (x) { all.push({ name: x.name, date: x.date, jd: x.jd }); });
    }
    /* 中气不在 jieList（只有节），用黄经 30 度整数倍近似：直接按公历日期表 */
    var QI_DAY = { 雨水: [2, 19], 春分: [3, 20], 谷雨: [4, 20], 小满: [5, 21], 夏至: [6, 21], 大暑: [7, 23],
      处暑: [8, 23], 秋分: [9, 23], 霜降: [10, 23], 小雪: [11, 22], 冬至: [12, 22], 大寒: [1, 20] };
    var cur = null, best = -1;
    for (var i = 0; i < JIANG.length; i++) {
      var q = JIANG[i].qi, md = QI_DAY[q];
      for (var yr = y - 1; yr <= y; yr++) {
        var dt = new Date(yr, md[0] - 1, md[1]);
        if (dt <= date0(y, m, d) && dt.getTime() > best) {
          best = dt.getTime(); cur = { qi: q, jiang: JIANG[i].jiang, name: JIANG[i].name, from: yr + '-' + md[0] + '-' + md[1] };
        }
      }
    }
    return cur || { qi: '雨水', jiang: '亥', name: '登明', from: '' };
  }

  function date0(y, m, d) { return new Date(y, m - 1, d, 12, 0, 0); }

  function relation(xia, shang) {
    var a = ZHI_WX[xia], b = ZHI_WX[shang];
    if (a === b) return '比';
    if (KE[a] === b) return '下贼上';
    if (KE[b] === a) return '上克下';
    if (SHENG[a] === b) return '下生上';
    if (SHENG[b] === a) return '上生下';
    return '';
  }

  /* ---- 三传：九宗门（涉害用孟仲季深浅简法） ---- */
  var GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };

  function makeSanChuan(siKe, day, pan) {
    var yangDay = day.ganIdx % 2 === 0;

    /* 伏吟 / 返吟 */
    var fuYin = true, fanYin = true;
    for (var i = 0; i < 12; i++) {
      if (pan[ZHI[i]] !== ZHI[i]) fuYin = false;
      if (pan[ZHI[i]] !== ZHI[(i + 6) % 12]) fanYin = false;
    }

    var method = '', picked = null;
    var xiaZei = [], shangKe = [];
    siKe.forEach(function (k) {
      if (k.ke === '下贼上') xiaZei.push(k);
      else if (k.ke === '上克下') shangKe.push(k);
    });

    function biOrShe(list) {
      var same = list.filter(function (k) { return (zhiIdx(k.shang) % 2 === 0) === yangDay; });
      if (same.length === 1) { method = '比用法'; return same[0]; }
      if (same.length > 1) { method = '涉害法'; return sheHai(same); }
      method = '涉害法';
      return sheHai(list);
    }

    /* 涉害深浅：上神在十二支中受克次数，多者先；并列取四孟，再取与日干比 */
    function sheHaiDepth(z) {
      var wx = ZHI_WX[z], n = 0;
      for (var i = 0; i < 12; i++) if (KE[ZHI_WX[ZHI[i]]] === wx) n++;
      return n;
    }
    function rank(z) {
      var i = zhiIdx(z);
      if ([2, 5, 8, 11].indexOf(i) >= 0) return 3;
      if ([0, 3, 6, 9].indexOf(i) >= 0) return 2;
      return 1;
    }
    function sheHai(list) {
      list = list.slice().sort(function (a, b) {
        var ka = [sheHaiDepth(a.shang), rank(a.shang), ((zhiIdx(a.shang) % 2 === 0) === yangDay) ? 1 : 0];
        var kb = [sheHaiDepth(b.shang), rank(b.shang), ((zhiIdx(b.shang) % 2 === 0) === yangDay) ? 1 : 0];
        for (var i = 0; i < 3; i++) if (kb[i] !== ka[i]) return kb[i] - ka[i];
        return 0;
      });
      return list[0];
    }

    if (fuYin) { method = '伏吟法'; picked = null; }
    else if (fanYin) { method = '返吟法'; picked = null; }
    else if (xiaZei.length) { method = xiaZei.length === 1 ? '贼克法' : '比用法'; picked = xiaZei.length === 1 ? xiaZei[0] : biOrShe(xiaZei); }
    else if (shangKe.length) { method = shangKe.length === 1 ? '贼克法' : '比用法'; picked = shangKe.length === 1 ? shangKe[0] : biOrShe(shangKe); }
    else {
      /* 无克 → 遥克：日干五行 与 上神五行 相克 */
      var gw = GAN_WX[day.gan];
      var yao = siKe.filter(function (k) {
        var sw = ZHI_WX[k.shang];
        return KE[gw] === sw || KE[sw] === gw;
      });
      if (yao.length === 1) { method = '遥克法'; picked = yao[0]; }
      else if (yao.length > 1) { method = '遥克法'; picked = yao[0]; }
      else if (day.gan === '壬' || day.gan === '癸') { method = '昴星法'; picked = siKe[0]; }
      else if (day.zhi === JI_GONG[day.gan]) { method = '八专法'; picked = siKe[0]; }
      else { method = '别责法'; picked = siKe[0]; }
    }

    var chu;
    if (fuYin) chu = JI_GONG[day.gan];
    else if (fanYin) chu = siKe[0].shang;
    else chu = picked ? picked.shang : siKe[0].shang;

    var chuan = [{ no: 1, zhi: chu, from: method }];
    chuan.push({ no: 2, zhi: pan[chuan[0].zhi] });
    chuan.push({ no: 3, zhi: pan[chuan[1].zhi] });

    return { method: method, list: chuan, picked: picked ? picked.no : 0 };
  }

  /* ---- 十二天将 ---- */
  function tianJiang(dayGan, hourIdx, pan, sanChuan) {
    var day = hourIdx >= 6 && hourIdx < 18;       // 昼
    var g = GUI_REN[dayGan] || ['丑', '未'];
    var gui = day ? g[0] : g[1];
    /* 贵人顺逆：贵人临 亥子丑寅卯辰 顺行，余逆行 */
    var idx = zhiIdx(gui);
    var forward = idx <= 5;
    var out = {};
    for (var i = 0; i < 12; i++) {
      var pos = forward ? (idx + i) % 12 : ((idx - i) % 12 + 12) % 12;
      out[pan[ZHI[pos]]] = JIANG_SHEN[i];   // 天盘支 → 天将
    }
    return { gui: gui, forward: forward, map: out, day: day };
  }

  function yiMa(dayZhi) {
    var m = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };
    return m[dayZhi] || '';
  }

  /* ================================================================
   * 奇门遁甲（时家转盘，拆补法定局）
   * ================================================================ */
  var QM_JU = {
    /* 节气 → [上元, 中元, 下元] 局数；阳遁为冬至到夏至前 */
    冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2], 雨水: [9, 6, 3],
    惊蛰: [1, 7, 4], 春分: [3, 9, 6], 清明: [4, 1, 7], 谷雨: [5, 2, 8], 立夏: [4, 1, 7],
    小满: [5, 2, 8], 芒种: [6, 3, 9], 夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4],
    立秋: [2, 5, 8], 处暑: [1, 4, 7], 白露: [9, 3, 6], 秋分: [7, 1, 4], 寒露: [6, 9, 3],
    霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1]
  };
  var YANG_QI = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种'];
  var YI_QI = ['夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];

  /* 九宫：1坎 2坤 3震 4巽 5中 6乾 7兑 8艮 9离 */
  var GONG_NAME = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  var LUO_SHU = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];   // 九宫飞布顺序（按洛书）
  var YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];  // 六仪三奇

  var STAR9 = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
  /* 八星寄宫：中五无星，天禽寄坤二，随天芮同宫 */
  var STAR8 = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
  var STAR_GONG = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
  var MEN8 = ['休门', '死门', '伤门', '杜门', '开门', '惊门', '生门', '景门'];
  var MEN_GONG = { 1: '休门', 2: '死门', 3: '伤门', 4: '杜门', 6: '开门', 7: '惊门', 8: '生门', 9: '景门' };
  var SHEN8_YANG = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  var SHEN8_YIN = ['值符', '九天', '九地', '玄武', '白虎', '六合', '太阴', '螣蛇'];

  function qimen(date) {
    date = date || new Date();
    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate(), hh = date.getHours();
    var day = C.dayGanZhi(y, m, d);
    var hourIdx = (hh === 23) ? 12 : Math.floor(((hh + 1) % 24) / 2);
    var hourGan = hourPillar(day.gan, hourIdx);
    var hg = hourGan ? hourGan.gan : '甲', hz = ZHI[hourIdx % 12];

    /* 节气与元 */
    var jie = currentJie(y, m, d);
    var yuan = yuanOf(day);                         // 上/中/下元
    var isYang = YANG_QI.indexOf(jie.name) >= 0;
    var num = QM_JU[jie.name] ? QM_JU[jie.name][['上', '中', '下'].indexOf(yuan)] : 1;
    var ju = (isYang ? '阳遁' : '阴遁') + num + '局';

    /* 地盘三奇六仪 */
    var diPan = {};
    var startGong = num;
    var order = LUO_SHU[0].concat(LUO_SHU[1], LUO_SHU[2]);   // 1-9 的洛书序
    for (var i = 0; i < 9; i++) {
      var gong = isYang ? ((startGong - 1 + i) % 9) + 1 : ((startGong - 1 - i + 27) % 9) + 1;
      diPan[gong] = YI[i];
    }

    /* 旬首 → 值符星、值使门 */
    var xunShouInfo = xunShouOf(hg, hz);
    var xunShou = xunShouInfo.label;
    var xunShouYi = xunShouInfo.yi;
    var xunGong = 0;
    for (var g in diPan) if (diPan[g] === xunShouYi) xunGong = +g;
    var zhiFuStar = (xunGong === 5) ? '天禽' : (STAR8[xunGong] || '天禽');
    var xunGong8 = (xunGong === 5) ? 2 : xunGong;     /* 中五寄坤二 */
    var zhiShiMen = MEN_GONG[xunGong] || '休门';

    /* 时干落宫（地盘） */
    var shiGong = 0;
    for (var g2 in diPan) if (diPan[g2] === (hg === '甲' ? xunShouYi : hg)) shiGong = +g2;
    if (!shiGong) shiGong = xunGong;

    /* 天盘：值符星加时干宫，其余星按洛书序顺布 */
    var tianPan = {}, tianStar = {};
    var seq9 = ringFrom(shiGong, isYang, RING9);
    var starOrder9 = ringFrom(xunGong, isYang, RING9);
    for (var k = 0; k < 9; k++) tianPan[seq9[k]] = diPan[starOrder9[k]];   // 天盘奇仪随九宫飞布

    /* 九星按八宫环转：值符星落时干宫，余星依次顺/逆布 */
    var seq8 = ringFrom(shiGong === 5 ? 2 : shiGong, isYang, RING8);
    var starOrder8 = ringFrom(xunGong8, isYang, RING8);
    for (var k4 = 0; k4 < 8; k4++) {
      tianStar[seq8[k4]] = STAR8[starOrder8[k4]];
    }
    /* 天禽寄坤二：与天芮同宫 */
    for (var g5 in tianStar) if (tianStar[g5] === '天芮') tianStar[g5] = '天芮·禽';

    /* 八门：值使门 随时支 数 顺逆 */
    var menPan = {};
    var step = zhiIdx(hz) + 1;
    var menSeq = ringFrom(xunGong, isYang, RING8);
    for (var k2 = 0; k2 < 8; k2++) {
      var tgt = menSeq[(k2 + step) % 8];
      menPan[tgt] = MEN_GONG[menSeq[k2]] || MEN8[k2];
    }

    /* 八神：值符起，阳顺阴逆 */
    var shenPan = {};
    var shenList = isYang ? SHEN8_YANG : SHEN8_YIN;
    var shenSeq = ringFrom(shiGong, isYang, RING8);
    for (var k3 = 0; k3 < 8; k3++) shenPan[shenSeq[k3]] = shenList[k3];

    return {
      date: y + '-' + m + '-' + d + ' ' + pad(hh) + ':' + pad(date.getMinutes()),
      dayGZ: day.gan + day.zhi, hourGZ: (hourGan ? hourGan.gan : '') + hz,
      jie: jie, yuan: yuan, ju: ju, isYang: isYang,
      diPan: diPan, tianPan: tianPan, star: tianStar, men: menPan, shen: shenPan,
      zhiFu: zhiFuStar, zhiShi: zhiShiMen, xunShou: xunShou, xunShouYi: xunShouYi, xunGong: xunGong,
      kong: xunKong(hg === '甲' ? '甲' : hg, hz)
    };
  }

  /* 旬首六仪：按旬首地支定 */
  var XUN_YI_BY_ZHI = { 子: '戊', 戌: '己', 申: '庚', 午: '辛', 辰: '壬', 寅: '癸' };
  function xunShouOf(g, z) {
    var gi = GAN.indexOf(g), zi = zhiIdx(z);
    var off = (zi - gi + 12) % 12;              /* 距旬首的天数 */
    var shouZhi = ZHI[off];                    /* 旬首地支 = (日支序 - 日干序) */
    return { gan: '甲', zhi: shouZhi, label: '甲' + shouZhi, yi: XUN_YI_BY_ZHI[shouZhi] || '戊' };
  }

  var RING9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var RING8 = [1, 2, 3, 4, 6, 7, 8, 9];
  function ringFrom(gong, isYang, ring) {
    ring = ring || RING9;
    var idx = ring.indexOf(+gong);
    if (idx < 0) idx = 0;
    var out = [];
    for (var i = 0; i < ring.length; i++) {
      var p = isYang ? (idx + i) % ring.length : ((idx - i) % ring.length + ring.length) % ring.length;
      out.push(ring[p]);
    }
    return out;
  }
  function seqFromGong(gong, isYang) { return ringFrom(gong, isYang, RING9); }

  function currentJie(y, m, d) {
    var all = [];
    for (var yy = y - 1; yy <= y + 1; yy++) {
      (C.jieList(yy) || []).forEach(function (x) { all.push(x); });
    }
    all.sort(function (a, b) { return a.jd - b.jd; });
    var target = C.jdn ? C.jdn(y, m, d) : 0;
    var cur = all[0];
    for (var i = 0; i < all.length; i++) if (all[i].date && cmpDate(all[i].date, y, m, d) <= 0) cur = all[i];
    return cur;
  }
  function cmpDate(dt, y, m, d) {
    if (dt.year !== y) return dt.year - y;
    if (dt.month !== m) return dt.month - m;
    return dt.day - d;
  }

  function yuanOf(day) {
    /* 拆补法：日柱前推至最近甲/己日（符头），其地支定三元 */
    var i = day.index;
    var back = i % 5;                     // 距上一个甲/己
    var tou = (i - back + 60) % 60;
    var zhi = ZHI[tou % 12];
    if ('子午卯酉'.indexOf(zhi) >= 0) return '上';
    if ('寅申巳亥'.indexOf(zhi) >= 0) return '中';
    return '下';
  }

  return { liuren: liuren, qimen: qimen, ZHI: ZHI, GAN: GAN, JIANG: JIANG, JIANG_SHEN: JIANG_SHEN,
    GONG_NAME: GONG_NAME, STAR9: STAR9, MEN8: MEN8, LUO_SHU: LUO_SHU };
});
