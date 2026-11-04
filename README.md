# Winter Roadbook · 冬季自驾路书

独立于 `sibaishi/JSP` 的静态网站，参考个人作品集的暖灰、细线、字体层级与版式。原站公开页面于 2026-11-04 迁入，保留北疆/东北双路线、地图、天气、Trip Mode、预算、准备清单和采购清单。

## 开发

```sh
cd /workspace/winter-roadbook
python3 -m http.server 8001 --bind 127.0.0.1
```

无需依赖安装或构建。`portfolio-theme.css` 为独立视觉层，`expedition.css` 为原有功能布局；默认日间主题，可切换夜间。

## 文件

- `index.html` / `expedition.js`：路书、地图、天气与路线数据。
- `trip-model.js` / `trip.js`：行程模式、每日记录及预算。
- `prepare.html` / `shopping.html`：两类清单及浏览器保存。
- `photos/`：原站照片本地迁移，作者和授权在页面中保留。
- `vendor/`：原站 Leaflet 分发文件，保留版权头。

## 部署

GitHub Pages 选择 main 分支、根目录。资源使用相对路径，兼容 `/winter-roadbook/` 项目地址与独立域名。预期域名 `winter.suelr.com`；DNS 生效后再添加 CNAME，以免提前切断项目地址。个人作品集的域名与仓库不变。

天气依赖 Open-Meteo，地图依赖 OpenStreetMap；断网时不保证在线数据可用。2027 行程与价格仍为规划假设。原站浏览器数据不会跨域自动转移，原 chatgpt.site 地址不会跟随本仓库更新。

## 交互优化 v2

首屏采用自然栅格与独立内边距，统一圆角、卡片和表单层级，适配 320–1440 px。行程支持关键词搜索、类型筛选、直接打开每日详情与恢复上次路线/日期；准备和采购页支持只看未完成。各页底部可以导出 JSON 备份并在其他设备导入；导入同名记录前明确确认，验证失败不写入。备份包含预算及个人行程，请自行妥善保管，不会上传服务器。
