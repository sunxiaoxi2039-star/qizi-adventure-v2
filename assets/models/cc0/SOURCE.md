# CC0 模型来源记录

## rabbit_animated.glb

- **模型名称**: Rabbit (Quaternius)
- **来源页面**: https://poly.pizza/m/mKev485XTR
- **直接下载 URL**: https://static.poly.pizza/0f6aa24f-b37e-4b75-aeec-5e7d71319f7d.glb
- **作者**: Quaternius (https://poly.pizza/u/Quaternius / https://quaternius.com)
- **许可证**: CC0 1.0 Universal (Public Domain / Creative Commons Zero 1.0)
  - poly.pizza 模型页面明确标注 "Public Domain (CC0) — Creative Commons Zero 1.0"
  - 可免费商用,无需署名(Quaternius 全部资产均以 CC0 发布)
- **下载日期**: 2026-07-11
- **文件大小**: 640,356 bytes (~625 KB) — 无需压缩(< 5MB)
- **格式**: GLB (glTF 2.0 binary), 由 FBX2glTF v0.9.7 生成
- **几何**: 2 mesh (Rabbit 1,570 tris + Eyes 712 tris), 512x512 贴图 (Sushi_Atlas.png)
- **骨骼 (SKINS)**: 2 个 skin, 各 58 joints (JOINTS_0/WEIGHTS_0 蒙皮数据齐全)

## 动画清单 (30 个 clip, 经 `npx @gltf-transform/cli inspect` 验证)

原始 clip 名带前缀 `CharacterArmature|CharacterArmature|CharacterArmature|`,下表为去前缀短名:

| # | 名称 | 时长 | 备注 |
|---|------|------|------|
| 0 | Assembly_End | 0.500s | |
| 1 | Assembly_Loop | 1.000s | |
| 2 | Assembly_Start | 0.500s | |
| 3 | Chop_End | 0.458s | |
| 4 | Chop_Loop | 0.667s | |
| 5 | Chop_Start | 0.500s | |
| 6 | Death | 0.750s | |
| 7 | Duck | 1.667s | |
| 8 | HitReact | 0.583s | 受击反应 |
| 9 | **Idle** | 1.000s | 待机(游戏常用) |
| 10 | Idle_Holding | 1.000s | 持物待机 |
| 11 | **Jump** | 0.250s | 起跳(游戏常用) |
| 12 | Jump_Idle | 0.500s | 空中滞留 |
| 13 | Jump_Land | 0.333s | 落地 |
| 14 | No | 1.667s | 摇头 |
| 15 | Pan_End | 0.500s | |
| 16 | Pan_Loop | 0.667s | |
| 17 | Pan_Start | 0.500s | |
| 18 | Punch | 0.667s | |
| 19 | **Run** | 0.542s | 跑步(游戏常用) |
| 20 | Run_Holding | 0.542s | 持物跑 |
| 21 | Sitting_Eating | 0.667s | 坐着吃 |
| 22 | Sitting_End | 0.417s | |
| 23 | Sitting_Idle | 3.333s | 坐姿待机 |
| 24 | Sitting_Start | 0.417s | |
| 25 | Sword | 0.833s | |
| 26 | **Walk** | 1.000s | 走路(游戏常用) |
| 27 | Walk_Holding | 1.000s | 持物走 |
| 28 | Wave | 1.667s | 挥手打招呼 |
| 29 | Yes | 1.667s | 点头 |

## Three.js 使用提示

```js
// clip 全名示例:
// "CharacterArmature|CharacterArmature|CharacterArmature|Idle"
// 建议按后缀匹配: animations.find(c => c.name.endsWith('|Idle'))
```
