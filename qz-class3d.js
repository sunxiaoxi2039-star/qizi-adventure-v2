/* ============ 3D 屋内课堂(方案A)============
   红线:上课不跳出 3D 世界。做法:白瓷教室建在 (500,0,0)(雾距外,主世界永远看不见),
   开课时镜头飞进教室;桌上的 3D 棋盘以【引擎自己的画布】为贴图——
   引擎(qz-engine)仍是唯一裁判与唯一画师,所有 10 种题型(演示/标记/圈圈/气标)零改动全兼容;
   棋子再用真 3D 子叠在画面上增加立体感。点击=射线打桌面→换算格点→转发 __qz.click。
   由 world3d.html 模块调用 window.QZ_CLASS3D_INSTALL(deps) 安装。 */
window.QZ_CLASS3D_INSTALL = function (D) {
  "use strict";
  const { THREE, scene, propInstance, loadProp, bunnyGLB, tintBunny } = D;
  const CX = 500, CZ = 0;              // 教室中心
  const TABLE_H = 1.5, BW = 7.2;       // 桌高 / 棋盘边长(米)
  const S = { active: false, built: false, tex: null, boardMesh: null, stoneGrp: null, lastBoard: "", pollT: 0 };

  function build() {
    if (S.built) return; S.built = true;
    const g = new THREE.Group(); g.position.set(CX, 0, CZ); scene.add(g);
    const WHITE = new THREE.MeshStandardMaterial({ color: 0xF7F4EE, roughness: .93 });
    const WHITE2 = new THREE.MeshStandardMaterial({ color: 0xEFF0F2, roughness: .9 });
    /* 地板 + 环形墙(内表面可见)+ 顶不封(留天光) */
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, .8, 48), WHITE2);
    floor.position.y = -.4; floor.receiveShadow = true; g.add(floor);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.6, 9, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xFBF9F4, roughness: .95, side: THREE.BackSide }));
    wall.position.y = 4.5; g.add(wall);
    /* 软粉地毯 + 暖木桌 + 桌腿 */
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, .06, 40),
      new THREE.MeshStandardMaterial({ color: 0xF9E9EC, roughness: .98 }));
    rug.position.y = .03; rug.receiveShadow = true; g.add(rug);
    const table = new THREE.Mesh(new THREE.BoxGeometry(BW + 1.2, .5, BW + 1.2),
      new THREE.MeshStandardMaterial({ color: 0xCDA574, roughness: .72 }));
    table.position.y = TABLE_H - .25; table.castShadow = true; table.receiveShadow = true; g.add(table);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, TABLE_H - .5, 12),
        new THREE.MeshStandardMaterial({ color: 0xB98F5E, roughness: .8 }));
      leg.position.set(a * (BW / 2 - .2), (TABLE_H - .5) / 2, b * (BW / 2 - .2)); g.add(leg);
    });
    /* 棋盘面 = 引擎画布贴图(引擎是唯一画师)。
       ⚠️ 开课前画布常是 0×0:此时不能挂贴图(空图上传=纯黑大板,章节卡背后很吓人),
       先用奶油素色顶着,tick() 检测到画布已排版才挂图并把底色切回白。 */
    S.tex = null;
    S.boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BW),
      new THREE.MeshBasicMaterial({ color: 0xF0E2C8 }));
    S.boardMesh.rotation.x = -Math.PI / 2;
    S.boardMesh.position.set(CX, TABLE_H + .02, CZ);
    S.boardMesh.receiveShadow = true; scene.add(S.boardMesh);
    /* 真 3D 棋子层 */
    S.stoneGrp = new THREE.Group(); S.stoneGrp.position.set(CX, TABLE_H + .02, CZ); scene.add(S.stoneGrp);
    /* 暖灯×2(灯笼模型异步到位)+ 点光 */
    loadProp("lantern", () => {
      [[-5.4, 4.2], [5.4, -4.2]].forEach(([x, z]) => {
        const ln = propInstance("lantern", 2.1); if (!ln) return;
        ln.position.set(CX + x, 0, CZ + z); scene.add(ln);
      });
    });
    const warm = new THREE.PointLight(0xFFE0B5, .85, 26, 1.6);
    warm.position.set(CX + 3, 6.5, CZ + 3); scene.add(warm);
    /* 糯糯老师坐对面,玩家小兔坐近侧背对镜头 */
    const teacher = new THREE.Group(); teacher.add(bunnyGLB(1.15));
    teacher.position.set(CX, 0, CZ - 6.2); teacher.rotation.y = 0; scene.add(teacher);
    const me = new THREE.Group(); const mb = bunnyGLB(1.0); tintBunny && tintBunny(mb, 0xFFF3F6);
    me.add(mb); me.position.set(CX, 0, CZ + 6.0); me.rotation.y = Math.PI; scene.add(me);
  }

  /* 引擎几何(pad/cell/cssSize)经 __qz.geo() 取,点击换算与引擎 pointerdown 同公式 */
  function gridFromUV(uv) {
    const geo = window.__qz && window.__qz.geo && window.__qz.geo();
    if (!geo || !geo.N) return null;
    const x = uv.x * geo.cssSize, y = (1 - uv.y) * geo.cssSize;
    const c = Math.round((x - geo.pad) / geo.cell), r = Math.round((y - geo.pad) / geo.cell);
    if (c < 0 || r < 0 || c >= geo.N || r >= geo.N) return null;
    if (Math.abs(x - (geo.pad + c * geo.cell)) > geo.cell * .45 ||
        Math.abs(y - (geo.pad + r * geo.cell)) > geo.cell * .45) return null;
    return [c, r];
  }

  const BSTONE = new THREE.MeshStandardMaterial({ color: 0x2B2B31, roughness: .35 });
  const WSTONE = new THREE.MeshStandardMaterial({ color: 0xF8F8F5, roughness: .3 });
  function syncStones() {
    const st = window.__qz && window.__qz.state && window.__qz.state();
    const bs = (st && st.board) || "";
    if (bs === S.lastBoard) return;
    S.lastBoard = bs;
    S.stoneGrp.clear();
    if (!bs) return;
    const rows = bs.split("|"), N = rows.length;
    const geo = window.__qz.geo(); if (!geo || !geo.N) return;
    const u = BW / geo.cssSize, R = geo.cell * .44 * u;
    /* ⚠️ state().board 是 B[c][r](列优先):rows[c][r],c=列 */
    for (let c = 0; c < N; c++) for (let r = 0; r < N; r++) {
      const v = +rows[c][r]; if (!v) continue;
      const m = new THREE.Mesh(new THREE.SphereGeometry(R, 18, 12), v === 1 ? BSTONE : WSTONE);
      m.scale.y = .52; m.castShadow = true;
      m.position.set(-BW / 2 + (geo.pad + c * geo.cell) * u, R * .5, -BW / 2 + (geo.pad + r * geo.cell) * u);
      S.stoneGrp.add(m);
    }
  }

  return {
    get active() { return S.active; },
    enter() { build(); S.active = true; S.lastBoard = " "; S.texW = -1; document.body.classList.add("class3d"); },
    exit() { S.active = false; document.body.classList.remove("class3d"); },
    cam(want, look) {   // 每帧被 step() 调:教室固定机位(约42°俯角)+ 轻微呼吸
      const t = performance.now() / 1000;
      want.set(CX + Math.sin(t * .3) * .25, TABLE_H + 8.5, CZ + 9);
      look.set(CX, TABLE_H, CZ - .8);
    },
    tick() {
      if (!S.active) return;
      /* ⚠️ 贴图必须在画布"已排版"后创建:build() 时画布常是空的,首次 GL 上传缓存空图,
         之后 needsUpdate 也救不回。检测画布位图尺寸变化(或首帧)就重建贴图。 */
      const cv = document.getElementById("bd");
      if (cv && S.boardMesh && S.texW !== cv.width && cv.width > 10) {
        S.texW = cv.width;
        S.tex && S.tex.dispose();
        S.tex = new THREE.CanvasTexture(cv);
        S.tex.colorSpace = THREE.SRGBColorSpace; S.tex.anisotropy = 4;
        S.boardMesh.material.map = S.tex; S.boardMesh.material.color.set(0xffffff);
        S.boardMesh.material.needsUpdate = true;
      }
      if (S.tex) S.tex.needsUpdate = true;      // 引擎每画一帧,桌面跟着变
      const now = performance.now();
      if (now - S.pollT > 140) { S.pollT = now; try { syncStones(); } catch (e) {} }
    },
    _dbg(mode) {        // QA:pink=纯色测几何 / tex=贴图 / re=重建贴图
      if (!S.boardMesh) return "no mesh";
      const m = S.boardMesh.material;
      if (mode === "pink") { m.map = null; m.color.set(0xFF00AA); }
      else if (mode === "re") { S.tex && S.tex.dispose(); S.tex = new THREE.CanvasTexture(document.getElementById("bd")); S.tex.colorSpace = THREE.SRGBColorSpace; m.map = S.tex; m.color.set(0xffffff); }
      else { m.color.set(0xffffff); m.map = S.tex; }
      m.needsUpdate = true; return mode + " ok";
    },
    gridToWorld(c, r) { // QA:格点→世界坐标(桌面上方一点)
      const geo = window.__qz && window.__qz.geo && window.__qz.geo();
      if (!geo || !geo.N) return null;
      const u = BW / geo.cssSize;
      return { x: CX - BW / 2 + (geo.pad + c * geo.cell) * u, y: TABLE_H + .05, z: CZ - BW / 2 + (geo.pad + r * geo.cell) * u };
    },
    pick(ray) {         // ptUp 转发:射线打桌面 → 格点 → 引擎裁决
      if (!S.active || !S.boardMesh) return false;
      const hit = ray.intersectObject(S.boardMesh)[0];
      if (!hit || !hit.uv) return true;         // 打在教室别处:吞掉,不许世界层寻路
      const g = gridFromUV(hit.uv);
      if (g) window.__qz.click(g[0], g[1]);
      return true;
    },
  };
};
