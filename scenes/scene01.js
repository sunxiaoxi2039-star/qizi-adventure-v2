/* ============ 场景配置 · 世界1 雪村(25K→20K) ============
   场景引擎 scene.html 读这份配置渲染;并行建设时每个世界只写自己的 sceneNN.js,不碰引擎。
   ⚠️ 重排纪律:课程重排只发生在 chapters 序列里(这里不含 ch5 双叫吃,按专家建议移世界2);
   不改引擎 CH 数据、不改任何口播文本(语音逐字节红线零风险)。
   ⚠️ 负荷三铁律由场景序列保证:ch1-4 演示开场+类型交替,天然合规(专家已评"范本级入门")。 */
window.SCENE_CONFIG = {
  id: 1,
  key: "snow-village",
  name: "雪村",                                  // t2/tt 词典键(已有译文体系)
  rank: "25K→20K",
  bg:  "assets/callen-worlds-v1/worlds/01-snow-village.jpg",  // 视觉幕布(callen v1)
  bgV: "?v=1",
  /* 本场景的课程序列 = 章节 id 列表(引擎 CH 现成数据,关卡按章内原序走)
     世界1 = 气/吃子/打吃逃跑/连接分断。ch5(双叫吃)按专家建议 → 世界2;
     ch6(完整对局)暂不入场景主线(待内容工厂产迷你吃子局替代)。 */
  chapters: [1, 2, 3, 4],
  /* 安静奖励(codex 方案):每过一关点亮一盏灯笼;全点亮 = 场景毕业庆祝 */
  reward: { kind: "lantern", celebrateText: null },   // celebrateText=null → 只视觉,不新增口播(语音红线)
  /* 2.5D 布景参数(场景引擎 slice 底座) */
  ambience: {
    fog: 0xF6F9FD, ground: 0xF7FAFE, sun: 0xFFEFD6,
    snow: true,                                   // 飘雪粒子
    props: [                                      // 现成 GLB 摆件(共享 prop 管线)
      ["prop_tree.glb",       -14,  -2, 5.6,  0.3],
      ["prop_tree.glb",        13,  -9, 6.4, -0.4],
      ["prop_tree.glb",       -21, -16, 7.2,  0.8],
      ["prop_tree.glb",        19, -21, 7.8, -0.9],
      ["prop_lantern.glb",    2.8, -5.6, 2.1,  0 ],
      ["prop_lantern.glb",   -3.2,-15.6, 2.1,  0.5],
      ["prop_stone_black.glb", 6.5, 1.5, 0.8,  0 ],
      ["prop_stone_white.glb",-5.5,-3.5, 0.7,  0 ]
    ],
    warmLights: [[2.8, -5.6], [-3.2, -15.6]]      // 灯笼暖点光
  },
  /* 课程入口(世界里唯一入口,codex 规则):兔子跳进光圈 = 开下一关 */
  entrance: { x: 0, z: -12, r: 2.6 },
  /* 世界间跳转(试点先只回世界选择/继续) */
  next: { scene: 2, label: "雪地启程" }
};
