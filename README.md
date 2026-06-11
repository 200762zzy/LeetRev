# LeetRev

一个本地 LeetCode 复习助手桌面应用。基于 Tauri v2 + React + Rust 构建，使用本地 SQLite 存储数据。

## 功能

- **题目管理** — 增删改查力扣题目，支持标签、难度分类、笔记
- **同步力扣进度** — 通过 LEETCODE_SESSION cookie 一键同步已通过/尝试过的题目到本地
- **代码编辑器** — 内置 CodeMirror 编辑器，支持 14 种编程语言
- **判题验证** — 提交代码到 LeetCode 在线判题，实时返回测试结果
- **代码模板** — 自动从 LeetCode 拉取 `class Solution` 方法签名模板
- **多版本代码** — 同一题目可保存多种语言的代码版本
- **统计看板** — 难度分布、标签分布、薄弱环节分析
- **自动抓取** — 输入题号自动抓取题目描述、中文标题、标签

## 快速开始

```bash
# 安装前端依赖
npm install

# 开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 同步力扣

在设置页面：
1. 点击「在浏览器打开登录页」登录力扣
2. 打开 DevTools (F12) → Application → Cookies → 复制 `LEETCODE_SESSION`
3. 粘贴到设置页 → 点击「从力扣同步」
4. Cookie 会持久化保存，下次无需重复粘贴

## 判题

在题目详情页：
1. 选择语言，填写代码
2. 点击「提交验证」
3. 等待 LeetCode 判题，实时显示结果
   - ✅ Accepted / ❌ Wrong Answer / ❌ Compile Error / ❌ Runtime Error
   - 显示通过测试用例数、错误用例输入/输出

## 技术栈

- **前端**: React 19 + TypeScript + Vite 8 + TailwindCSS
- **后端**: Rust + Tauri v2
- **数据库**: SQLite (rusqlite)
- **判题**: 调用 LeetCode.cn GraphQL API

## License

MIT
