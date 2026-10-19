/* verify-classics.js —— 增删卜易卦例回归测试
 * 用例来源：识典古籍《增删卜易》卷六（https://www.shidianguji.com/book/XYXZSBY/chapter/1laba46qlsgm3）
 * 每条用例记录：原文月建/日辰、本卦（及变卦）、所问、原文断语、期望吉凶
 * 说明：卦象由卦名反推六爻（自下而上，1=阳）；动爻 = 本卦与变卦逐爻异或
 */
'use strict';
const C = require('./core.js');
const S = require('./scripture.js');

/* ---- 八卦 → 三爻位（自下而上） ---- */
const TRI = { 乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0], 巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0] };

function linesOf(guaName) {
  /* NAME64: 键为「上卦+下卦」 */
  for (const k in C.NAME64) {
    if (C.NAME64[k] === guaName) {
      const up = k[0], low = k[1];
      return TRI[low].concat(TRI[up]);
    }
  }
  return null;
}

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/* 找一个日柱为「某干某支」的日期 */
function dateWithGZ(gan, zhi) {
  const base = new Date(2024, 0, 1);
  for (let i = 0; i < 60; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const gz = C.dayGanZhi(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (gz.gan === gan && gz.zhi === zhi) return d;
  }
  return null;
}

/* ---- 用例：均摘自卷六原文，期望吉凶按原文断语归并 ---- */
const CASES = [
  {
    id: 'dui-liuchong',
    src: '午月乙未日，占终身财福，得兑卦',
    lines: '兑为泽', bian: null, month: '午', day: '乙未', subject: '财运',
    expect: '凶',
    why: '卦遇六冲，一事无成之象'
  },
  {
    id: 'xu-zisun-chishi',
    src: '戌月丁卯日，占终身功名有无，得需卦',
    lines: '水天需', bian: null, month: '戌', day: '丁卯', subject: '功名',
    expect: '凶',
    why: '子孙持世，休问功名'
  },
  {
    id: 'zhongfu-guishang',
    src: '辰月甲寅日，占终身财福，得风泽中孚',
    lines: '风泽中孚', bian: null, month: '辰', day: '甲寅', subject: '财运',
    expect: '凶',
    why: '助鬼以伤身，不必以财福为问'
  },
  {
    id: 'ge-zhi-jiaren',
    src: '卯月癸未日，占终身财福，得革之家人',
    lines: '泽火革', bian: '风火家人', month: '卯', day: '癸未', subject: '财运',
    expect: '凶',
    why: '世爻变鬼，又化回头之克'
  },
  {
    id: 'mingyi-zhi-lv',
    src: '辰月乙未日，占终身功名有无，得地火明夷变旅',
    lines: '地火明夷', bian: '火山旅', month: '辰', day: '乙未', subject: '功名',
    expect: '吉',
    why: '官星持世，化出午火财旺生官，连连加纳'
  }
];

function bucket(level) {
  const s = String(level || '');
  if (/大吉|吉/.test(s) && !/凶/.test(s)) return '吉';
  if (/大凶|凶/.test(s)) return '凶';
  return '平';
}

let pass = 0, fail = 0;
console.log('=== 增删卜易卦例回归（' + CASES.length + ' 例）===');

for (const c of CASES) {
  const base = linesOf(c.lines);
  if (!base) { console.log('  ✗ ' + c.id + ' 卦名匹配失败: ' + c.lines); fail++; continue; }
  const bianLines = c.bian ? linesOf(c.bian) : null;
  if (c.bian && !bianLines) { console.log('  ✗ ' + c.id + ' 变卦匹配失败: ' + c.bian); fail++; continue; }

  /* 动爻由本卦/变卦异或得出；阳动=9（老阳），阴动=6（老阴） */
  const values = base.map((b, i) => {
    const moving = bianLines ? b !== bianLines[i] : false;
    if (!moving) return b ? 7 : 8;
    return b ? 9 : 6;
  });

  const day = dateWithGZ(c.day[0], c.day[1]);
  if (!day) { console.log('  ✗ ' + c.id + ' 日柱构造失败'); fail++; continue; }
  const dayGZ = C.dayGanZhi(day.getFullYear(), day.getMonth() + 1, day.getDate());
  const monthIdx = ZHI.indexOf(c.month);

  const chart = C.buildChart(values.map((v) => ({ value: v })), dayGZ, monthIdx);
  const an = C.analyzeLiuyao(chart, c.subject, S);

  const gotName = chart.ben.name;
  const gotBian = chart.bian ? chart.bian.name : '';
  const okName = gotName === c.lines && (!c.bian || gotBian === c.bian);
  const got = bucket(an.guaVerdict && an.guaVerdict.level);
  const hit = okName && got === c.expect;

  if (hit) { pass++; console.log('  ✓ ' + c.id + '  ' + c.lines + (c.bian ? '→' + c.bian : '') + '  期望' + c.expect + ' 实得' + got); }
  else {
    fail++;
    console.log('  ✗ ' + c.id + '  ' + (okName ? '' : '[卦名不符: 得' + gotName + (c.bian ? '→' + gotBian : '') + '] ') +
      '期望' + c.expect + ' 实得' + got + '（' + (an.guaVerdict && an.guaVerdict.level) + '）  依据：' + c.why);
  }
}

console.log('\n通过 ' + pass + ' / 失败 ' + fail);
