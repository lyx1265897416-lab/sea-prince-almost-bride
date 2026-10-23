# The Sea Prince's Almost Bride · V32

女主第一视角互动剧，第 1–5 集。打开 `index.html` 开始播放；`voices.html` 是逐句声线试听。

- 竖屏 9:16。界面布局与 Magnus《Midnight Garage》播放器一致：顶栏菜单（选集 / 字幕 / 返回上一个选择 / 从头开始），底栏播放键、可拖动进度条、集数、倍速；选择点在底部弹出选项和自由输入框
- 中文系统默认中英双语字幕，可在菜单切换为仅英文；英文系统只显示英文字幕（也可在网址后加 `?lang=zh` / `?lang=en`）
- 自由输入框目前用本地关键词匹配提示对应选项；接入实时模型时调用 `window.SeaPrince.setResponder(async (text, ctx) => ({reply, pick, choose}))` 替换
