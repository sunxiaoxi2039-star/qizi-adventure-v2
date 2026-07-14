/* ================= world_layout.js — 唯一坐标真源(蓝区,纯数据+纯函数) =================
   一个世界,三种看法(3D 世界 / 2D 地图页 / 左下角迷你图)全部从这里派生 → 构造即对齐。
   规范空间 = 归一化俯视平面 (u,v)∈[0,1]²,左上原点(和母版像素、CSS %、迷你图同向)。
     u: 0 左 → 1 右;  v: 0 上(天空城) → 1 下(雪村)。
   母版 = mvp/assets/ui/final/world_master.jpg(斜视立体全景);迷你图/2D 地图/3D 地面参照它。
   ⚠️ 灵活度红线:这里只画"地理"(10 区 + 爬升路)。169 个课程小屋节点由调用方按【当前】CH 实时
      沿路摆(levelUV),这里不写死任何关卡数量 → 拆/压/加课程零重画。
   ⚠️ 坐标唯一出口:3D 里任何位置只准来自本文件的投影函数,裸 x,z 一律禁(Codex 交棒纪律)。
   zones 的 chapIds/顺序严格对齐 协作合同-唯一真源.md §2,不可改。
*/
(function(){
"use strict";

// 母版长宽比(1536×1024 → 1.5),用于 3D 地面尺寸与投影
const MASTER_ASPECT = 1536/1024;

// 3D 世界尺度:地面平面 planeW×planeD(米),爬升总高 hMax
const WORLD = { planeW: 232, planeD: 232/MASTER_ASPECT, hMax: 30 };

/* 10 区:key / 名 / 章节 id(合同 §2)/ 母版描出的 (u,v) / 爬升高度比 hLvl / 主题 */
const ZONES = [
  { key:"village", name:"启蒙云村",   chapIds:[1,2,3,4,5],           u:0.12, v:0.80, hLvl:0.00, theme:"snow"  },
  { key:"valley",  name:"勇士谷",     chapIds:[6],                   u:0.28, v:0.75, hLvl:0.05, theme:"snow"  },
  { key:"tower",   name:"魔法塔",     chapIds:[7],                   u:0.34, v:0.545,hLvl:0.14, theme:"snow"  },
  { key:"parlor",  name:"点心客厅",   chapIds:[21,22,23],            u:0.45, v:0.335,hLvl:0.26, theme:"cloud" },
  { key:"spring",  name:"生命之泉",   chapIds:[31,32,33,34,35,36],   u:0.57, v:0.43, hLvl:0.38, theme:"cloud" },
  { key:"duel",    name:"对杀谷",     chapIds:[41,42,43],            u:0.70, v:0.51, hLvl:0.48, theme:"cloud" },
  { key:"temple",  name:"兔祖师圣殿", chapIds:[51,52,53,54],         u:0.79, v:0.35, hLvl:0.60, theme:"isle"  },
  { key:"ladder",  name:"段位阶梯",   chapIds:[61,62,63],            u:0.81, v:0.245,hLvl:0.72, theme:"isle"  },
  { key:"isles",   name:"试炼浮岛",   chapIds:[71,72,73,74,75],      u:0.84, v:0.185,hLvl:0.84, theme:"isle"  },
  { key:"sky",     name:"高段天空城", chapIds:[82,83,84],            u:0.87, v:0.10, hLvl:1.00, theme:"gold"  },
];

/* ---------- 投影(纯函数,可逆) ---------- */
// (u,v) → 3D 地面 world 坐标。v=1(雪村)在近处 +z;v=0(天空城)在远处 -z。y 走爬升高度。
function planToWorld(u,v){
  return {
    x: (u-0.5)*WORLD.planeW,
    z: (v-0.5)*WORLD.planeD,
    y: WORLD.hMax*(1-v)   // 简化:越往上(v 小)越高;真实台阶由 groundHeightAt 精修
  };
}
function worldToPlan(x,z){
  return { u: x/WORLD.planeW+0.5, v: z/WORLD.planeD+0.5 };
}
// (u,v) → 迷你图/2D地图 百分比(背景就是母版,像素同 u,v → 直接 *100)
function planToMini(u,v){ return [ u*100, v*100 ]; }
function worldToMini(x,z){ const p=worldToPlan(x,z); return planToMini(p.u,p.v); }

/* ---------- 爬升路 + 169 小屋节点(沿路派生,不写死数量) ---------- */
// 路 = 穿过 10 区锚点的折线(线性;需要更贴路时可在 zones 间插 waypoint)。
// 区 i 的路段 = [zones[i], zones[i+1]);末区退化为锚点自身。
function zonePathUV(i, frac){
  const a=ZONES[i], b=ZONES[Math.min(ZONES.length-1, i+1)];
  return { u: a.u+(b.u-a.u)*frac, v: a.v+(b.v-a.v)*frac };
}
// 某区第 idx(0..n-1)个小屋 / 该区共 n 个 → (u,v)。调用方用【当前 CH】数出 n 与 idx。
function levelUV(zoneIdx, idx, n){
  const f = n>0 ? (idx+0.5)/n : 0.5;
  return zonePathUV(zoneIdx, f);
}
// 章节 id → 所属区 index(按 chapIds);找不到返回 -1
function zoneOfChapter(chId){
  for(let i=0;i<ZONES.length;i++) if(ZONES[i].chapIds.indexOf(+chId)>=0) return i;
  return -1;
}

/* ---------- 地形高度桩(Phase2 Codex 做真台阶时填) ---------- */
function groundHeightAt(x,z){
  // 现在打桩:按 v 线性给个缓坡,保证兔子落地 y 有意义、不穿模
  const p=worldToPlan(x,z);
  return WORLD.hMax*(1-Math.min(1,Math.max(0,p.v)));
}

window.WORLD_LAYOUT = {
  MASTER_ASPECT, WORLD, ZONES,
  planToWorld, worldToPlan, planToMini, worldToMini,
  zonePathUV, levelUV, zoneOfChapter, groundHeightAt,
  masterImg: "assets/ui/final/world_master.jpg",
  miniImg:   "assets/ui/final/world_master_mini.jpg",
  V: "?v=1"
};
})();
