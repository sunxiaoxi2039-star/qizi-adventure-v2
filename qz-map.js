/* 云上棋路 · 素材版地图渲染器(蓝区:纯渲染,逻辑全部来自引擎接口)
   引擎侧钩子:buildMap() 开头 `if(window.QZMAP&&QZMAP.ready())return QZMAP.build();`
   依赖接口(引擎保证):CH[], chapUnlocked(i), chRank(id), prog, freeplay(), mapSel, start(lv) */
(function(){
const UI="assets/ui/final/";
const V="?v=3"; /* 资产版本;脚本自身 ?v=4 */
const T=x=>window.__t2?window.__t2(x):x; /* 引擎的三语函数 */
/* 四段长卷,每段承载的章节 id(从下到上) */
const SEGS=[
  {img:"bg_seg1_snow.jpg", ids:[1,2,3,4,5,6,7]},
  {img:"bg_seg2_snow.jpg", ids:[21,22,23,31,32,33,34,35,36]},
  {img:"bg_seg3_isles.jpg",ids:[41,42,43,51,52,53,54,61,62,63]},
  {img:"bg_seg4_sky.jpg",  ids:[71,72,73,74,75,82,83,84]},
];
/* 大站建筑(段内 % 坐标,后续调校) */
const LANDMARKS=[
  {seg:0,x:14,y:22,img:"icon_lighthouse.png"},
  {seg:0,x:84,y:64,img:"icon_cave.png"},
  {seg:1,x:18,y:38,img:"icon_bridge.png"},
  {seg:1,x:82,y:72,img:"icon_fountain.png"},
  {seg:2,x:16,y:30,img:"icon_bush.png"},
  {seg:2,x:84,y:66,img:"icon_lantern.png"},
  {seg:3,x:50,y:16,img:"icon_trophy.png"},
];
/* 锚点:蛇形排布(可被 window.QZ_ANCHORS 覆盖做手工精调) */
function anchors(){
  if(window.QZ_ANCHORS)return window.QZ_ANCHORS;
  const out={};
  SEGS.forEach((s,si)=>{
    const n=s.ids.length;
    s.ids.forEach((id,i)=>{
      const t=(i+0.55)/(n+0.1);
      out[id]={seg:si,x:50+Math.sin((i+si*0.7)*1.25)*24,y:94-t*88};
    });
  });
  return out;
}
function chapDoneIdx(i){return CH[i].levels.every(l=>prog[l.key]);}
function nodeState(i){
  if(chapDoneIdx(i))return "done";
  if(chapUnlocked(i))return "open";
  return "lock";
}
function curIndex(){
  for(let i=0;i<CH.length;i++)
    if(chapUnlocked(i)&&!chapDoneIdx(i))return i;
  return CH.length-1;
}
function nodeImg(i,isCur){
  if(isCur)return UI+"node_current.png"+V;
  const st=nodeState(i);
  if(st==="lock")return UI+"node_locked.png"+V;
  if(st==="done")return UI+(i%2?"node_white.png":"node_black.png")+V;
  return UI+"node_white.png"+V;
}
const LV_ICON={demo:"btn_watch.png",lib:"btn_pencil.png",point:"btn_pencil.png",
  connect:"btn_pencil.png",esc:"btn_pencil.png",dbl:"btn_pencil.png",choice:"btn_pencil.png",
  pick:"btn_medal.png",noentry:"btn_pencil.png",play:"btn_swords.png"};
let _ready=null;
function ready(){
  if(_ready!==null)return _ready;
  // 探测关键素材是否存在(同步近似:交给 build 时 onerror 兜底,首次默认 true 由引擎钩子控制)
  return true;
}
function build(){
  const map=document.getElementById("map");
  let ci;try{ci=(typeof mapSel==="number"&&mapSel>=0)?mapSel:curIndex();}catch(e){ci=curIndex();}
  const A=anchors();
  let html='<div id="qzScroll">';
  for(let si=SEGS.length-1;si>=0;si--){ // 顶(天空城)在上
    html+='<div class="qzSeg" data-seg="'+si+'"><img class="qzBg" src="'+UI+SEGS[si].img+V+'" onerror="window.QZMAP._bgFail&&QZMAP._bgFail()">';
    if(si<SEGS.length-1)html+='<div class="qzSeam"></div>';
    // 背景已烘焙建筑,不再叠图标

    SEGS[si].ids.forEach(id=>{
      const i=CH.findIndex(c=>c.id===id);
      if(i<0)return;
      const a=A[id];if(!a)return;
      const isCur=i===ci;
      html+='<button class="qzNode'+(isCur?' cur':'')+'" style="left:'+a.x+'%;top:'+a.y+'%" data-i="'+i+'">'
        +'<img src="'+nodeImg(i,isCur)+'">'
        +(isCur?'<img class="qzPin" src="'+UI+'pin_bunny.png'+V+'">':'')
        +'</button>';
    });
    html+='</div>';
  }
  html+='</div>';
  /* 底部当前章云石卡 */
  const ch=CH[ci];
  const stars=ch.levels.filter(l=>prog[l.key]).length;
  html+='<div id="qzCard"><img class="qzCardBg" src="'+UI+'frame_card.png'+V+'">'
    +'<div class="qzCardIn">'
    +'<div class="qzPlank"><img src="'+UI+'plank_wood.png'+V+'"><span>'+T(ch.name||"")+'</span></div>'
    +'<div class="qzRank">'+T(typeof chRank!=='undefined'?chRank(ch.id):"")+' · <img class="qzStarS" src="'+UI+'star_gold.png'+V+'"> '+stars+'/'+ch.levels.length+'</div>'
    +'<div class="qzLvs">';
  ch.levels.forEach((lv,li)=>{
    const done=!!prog[lv.key];
    const flatIdx=FLAT.indexOf(lv);
    const openIdx=FLAT.findIndex(l=>!prog[l.key]);
    const locked=!freeplay()&&openIdx>=0&&flatIdx>openIdx;
    html+='<button class="qzLv'+(locked?' lock':'')+(done?' done':'')+'" data-k="'+lv.key+'">'
      +'<img src="'+UI+(LV_ICON[lv.t]||"btn_pencil.png")+V+'">'
      +(done?'<img class="qzLvStar" src="'+UI+'star_gold.png'+V+'">':'')
      +'<span>'+T(lv.name||"")+'</span></button>';
  });
  html+='</div></div></div>';
  map.innerHTML=html;
  /* 事件 */
  map.querySelectorAll(".qzNode").forEach(b=>{
    b.onclick=()=>{
      const i=+b.dataset.i;
      if(!chapUnlocked(i)){typeof mapToast!=='undefined'&&mapToast("先通过前面的章节哦");typeof say!=='undefined'&&say("先通过前面的章节哦");return;}
      mapSel=i;build();
      document.querySelector("#qzCard").scrollIntoView({behavior:"smooth",block:"end"});
    };
  });
  map.querySelectorAll(".qzLv").forEach(b=>{
    b.onclick=()=>{
      if(b.classList.contains("lock")){typeof say!=='undefined'&&say("先通过前面的关卡哦");return;}
      const lv=FLAT.find(l=>l.key===b.dataset.k);
      if(lv)start(lv);
    };
  });
  /* 首次滚到当前章所在段 */
  const curBtn=map.querySelector(".qzNode.cur");
  if(curBtn)setTimeout(()=>{try{curBtn.scrollIntoView({block:"center"});}catch(e){}},60);
}
window.QZMAP={build,ready,anchors,SEGS,LANDMARKS};
})();
