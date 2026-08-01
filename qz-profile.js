/* ============ 多孩子存档系统(qz-profile.js) ============
   必须在 qz-engine.js 之前加载:它劫持 localStorage 的进度类键,按当前档案分命名空间。
   设计要点:
   - 档案 0 = 原有数据,键名不加前缀 → 老用户进度**零迁移**自动成为"档案1"
   - 档案 1+ = 键名前加 "pN:" 前缀,互不干扰
   - 设备级设置(语言 qz_lang / 音量 qz3_vol)不分档,全家共用
   - 纯 localStorage,无后端,file:// 可用;将来接 CloudBase 只需替换 load/save 两个口
   API: window.QZP.{list,activeId,active,switchTo,create,rename,remove,exportCode,importCode,openPanel} */
(function () {
  "use strict";
  var NS_KEYS = ["qz2_prog", "qz2_freeplay", "qz2_sess", "qz2_praise", "qz2_voice"]; // 分档
  var LIST_KEY = "qz_profiles", ACT_KEY = "qz_profile_active";
  var AVATARS = ["🐰", "🐼", "🦊", "🐻", "🐨", "🐯", "🦁", "🐸"];

  var ls = window.localStorage;
  var rawGet = ls.getItem.bind(ls), rawSet = ls.setItem.bind(ls), rawDel = ls.removeItem.bind(ls);

  function readList() {
    try {
      var l = JSON.parse(rawGet(LIST_KEY) || "null");
      if (l && l.length) return l;
    } catch (e) {}
    return [{ id: 0, name: "小棋手", avatar: "🐰" }];
  }
  function writeList(l) { rawSet(LIST_KEY, JSON.stringify(l)); }
  function activeId() {
    var a = parseInt(rawGet(ACT_KEY) || "0", 10);
    if (isNaN(a)) a = 0;
    return readList().some(function (p) { return p.id === a; }) ? a : 0;
  }
  function pfx(key) {
    var a = activeId();
    return a === 0 ? key : "p" + a + ":" + key;
  }
  /* ---- 劫持:只对进度类键改写,其余原样。
         ⚠️ 必须打在 Storage.prototype 上——给 localStorage 实例赋函数会被浏览器
         当成"存一条键值",在存储里留下 getItem/setItem/removeItem 三条垃圾。 ---- */
  var SP = Object.getPrototypeOf(ls);   // Storage.prototype
  SP.getItem = function (k) { return rawGet(NS_KEYS.indexOf(k) >= 0 ? pfx(k) : k); };
  SP.setItem = function (k, v) { return rawSet(NS_KEYS.indexOf(k) >= 0 ? pfx(k) : k, v); };
  SP.removeItem = function (k) { return rawDel(NS_KEYS.indexOf(k) >= 0 ? pfx(k) : k); };
  /* 清掉早期版本可能写脏的三条(函数源码被当值存了) */
  ["getItem", "setItem", "removeItem"].forEach(function (k) {
    var v = rawGet(k);
    if (v && v.indexOf("function") === 0) rawDel(k);
  });

  function nextId(l) { var m = 0; l.forEach(function (p) { if (p.id > m) m = p.id; }); return m + 1; }

  var QZP = {
    list: readList,
    activeId: activeId,
    active: function () {
      var a = activeId();
      return readList().filter(function (p) { return p.id === a; })[0] || readList()[0];
    },
    switchTo: function (id) { rawSet(ACT_KEY, String(id)); location.reload(); },
    create: function (name, avatar) {
      var l = readList(), id = nextId(l);
      l.push({ id: id, name: name || ("小棋手" + (l.length + 1)), avatar: avatar || AVATARS[l.length % AVATARS.length] });
      writeList(l); return id;
    },
    rename: function (id, name, avatar) {
      var l = readList();
      l.forEach(function (p) { if (p.id === id) { if (name) p.name = name; if (avatar) p.avatar = avatar; } });
      writeList(l);
    },
    remove: function (id) {
      if (id === 0) return false;                       // 档案1(原始数据)不允许删
      NS_KEYS.forEach(function (k) { rawDel("p" + id + ":" + k); });
      writeList(readList().filter(function (p) { return p.id !== id; }));
      if (activeId() === id) rawSet(ACT_KEY, "0");
      return true;
    },
    /* ---- 存档码:把当前档案进度压成一串可复制的短码,换设备用 ---- */
    exportCode: function () {
      var d = {};
      NS_KEYS.forEach(function (k) { var v = rawGet(pfx(k)); if (v != null) d[k] = v; });
      var p = QZP.active();
      d.__n = p.name; d.__a = p.avatar;
      try { return "QZ1" + btoa(unescape(encodeURIComponent(JSON.stringify(d)))); }
      catch (e) { return ""; }
    },
    importCode: function (code) {
      if (!code || code.indexOf("QZ1") !== 0) return false;
      var d;
      try { d = JSON.parse(decodeURIComponent(escape(atob(code.slice(3))))); } catch (e) { return false; }
      var id = QZP.create(d.__n || "导入的存档", d.__a);
      NS_KEYS.forEach(function (k) { if (d[k] != null) rawSet("p" + id + ":" + k, d[k]); });
      rawSet(ACT_KEY, String(id));
      return true;
    },
    avatars: AVATARS,
  };

  /* ---- 切换面板(纯 DOM,不依赖引擎) ---- */
  QZP.openPanel = function () {
    if (document.getElementById("qzpMask")) return;
    var mask = document.createElement("div");
    mask.id = "qzpMask";
    mask.style.cssText = "position:fixed;inset:0;z-index:120;background:rgba(60,45,25,.42);" +
      "display:flex;align-items:center;justify-content:center;padding:18px;font-family:'PingFang SC','Microsoft YaHei',sans-serif;";
    var box = document.createElement("div");
    box.style.cssText = "background:#FBF9F4;border-radius:24px;padding:20px 18px;max-width:360px;width:100%;" +
      "max-height:86vh;overflow:auto;box-shadow:0 12px 40px rgba(80,55,20,.3);";
    function render() {
      var l = readList(), a = activeId();
      var h = '<div style="font-size:19px;font-weight:800;color:#B5651D;margin-bottom:4px">👨‍👩‍👧 谁在玩？</div>' +
        '<div style="font-size:12px;color:#a98a52;margin-bottom:14px">每个孩子有自己的星星和进度，互不影响</div>';
      l.forEach(function (p) {
        var on = p.id === a;
        h += '<div data-sw="' + p.id + '" style="display:flex;align-items:center;gap:11px;padding:11px 12px;margin-bottom:8px;' +
          'border-radius:16px;cursor:pointer;background:' + (on ? "#EAF5EA" : "#fff") + ';border:2px solid ' + (on ? "#77B77A" : "#EFE4CC") + ';">' +
          '<span style="font-size:26px">' + p.avatar + "</span>" +
          '<span style="flex:1;font-weight:800;color:#5a4326;font-size:15px">' + p.name + "</span>" +
          (on ? '<span style="font-size:12px;color:#5E9E62;font-weight:800">正在玩</span>'
              : '<span style="font-size:12px;color:#b0a48d">点这里切换</span>') +
          (p.id !== 0 ? ' <span data-del="' + p.id + '" style="font-size:15px;color:#c9b8a0;padding:0 4px">✕</span>' : "") +
          "</div>";
      });
      h += '<button id="qzpAdd" style="width:100%;margin-top:6px;border:none;background:#77B77A;color:#fff;font-weight:800;' +
        "font-size:15px;padding:12px;border-radius:14px;cursor:pointer;font-family:inherit\">➕ 添加一个孩子</button>" +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button id="qzpExp" style="flex:1;border:none;background:#F2C76E;color:#6b4a1d;font-weight:800;font-size:13px;padding:10px;border-radius:12px;cursor:pointer;font-family:inherit">📤 导出存档码</button>' +
        '<button id="qzpImp" style="flex:1;border:none;background:#FBF9F4;color:#8a6a3a;font-weight:800;font-size:13px;padding:10px;border-radius:12px;cursor:pointer;border:1.5px solid #EADFC8;font-family:inherit">📥 导入</button>' +
        "</div>" +
        '<button id="qzpClose" style="width:100%;margin-top:10px;border:none;background:transparent;color:#a98a52;font-weight:700;font-size:13px;padding:8px;cursor:pointer;font-family:inherit">关闭</button>';
      box.innerHTML = h;
      box.querySelectorAll("[data-sw]").forEach(function (el) {
        el.onclick = function (ev) {
          if (ev.target.dataset.del) return;
          QZP.switchTo(+el.dataset.sw);
        };
      });
      box.querySelectorAll("[data-del]").forEach(function (el) {
        el.onclick = function (ev) {
          ev.stopPropagation();
          var id = +el.dataset.del, p = readList().filter(function (x) { return x.id === id; })[0];
          if (confirm("删除「" + (p ? p.name : "") + "」的全部进度？不能恢复哦。")) { QZP.remove(id); render(); }
        };
      });
      box.querySelector("#qzpAdd").onclick = function () {
        var n = prompt("这个孩子叫什么名字？", "小棋手" + (readList().length + 1));
        if (n === null) return;
        QZP.switchTo(QZP.create(n.trim()));
      };
      box.querySelector("#qzpExp").onclick = function () {
        var c = QZP.exportCode();
        if (!c) { alert("导出失败了"); return; }
        try {
          navigator.clipboard.writeText(c);
          alert("存档码已复制！\n\n在另一台设备上打开游戏 → 谁在玩 → 导入，粘贴即可。");
        } catch (e) { prompt("复制这串存档码：", c); }
      };
      box.querySelector("#qzpImp").onclick = function () {
        var c = prompt("粘贴存档码（QZ1 开头）：");
        if (!c) return;
        if (QZP.importCode(c.trim())) location.reload();
        else alert("这串码不对哦，检查一下有没有复制完整。");
      };
      box.querySelector("#qzpClose").onclick = function () { mask.remove(); };
    }
    render();
    mask.onclick = function (e) { if (e.target === mask) mask.remove(); };
    mask.appendChild(box);
    document.body.appendChild(mask);
  };

  /* ---- 顶栏小头像:显示当前是谁,点开切换 ---- */
  QZP.mountChip = function () {
    if (document.getElementById("qzpChip")) return;
    var p = QZP.active();
    var b = document.createElement("button");
    b.id = "qzpChip";
    b.innerHTML = '<span style="font-size:17px">' + p.avatar + "</span>";
    b.title = "当前：" + p.name + "（点击切换孩子）";
    b.style.cssText = "position:fixed;right:14px;top:110px;z-index:46;border:none;cursor:pointer;" +
      "width:40px;height:40px;border-radius:50%;background:#FBF9F4;display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 2px 0 #EFE4CC,0 4px 10px rgba(120,80,20,.15);font-family:inherit;";
    b.onclick = QZP.openPanel;
    document.body.appendChild(b);
  };

  window.QZP = QZP;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { QZP.mountChip(); });
  else QZP.mountChip();
})();
