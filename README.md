# 🍺 啤酒游戏 (Beer Game)

MIT 经典供应链管理模拟游戏，支持多人在线实时协作，体验"牛鞭效应"。

## 目录

- [快速开始](#快速开始)
- [游戏规则](#游戏规则)
- [操作指南](#操作指南)
- [部署到 Vercel](#部署到-vercel)
- [项目结构](#项目结构)
- [技术栈](#技术栈)

---

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动后端（终端 1）
npm run dev:server
# 后端运行在 http://localhost:3000

# 3. 启动前端（终端 2）
npm run dev:client
# 前端运行在 http://localhost:5173
```

### 游玩方式

1. **创建游戏**：打开浏览器访问 `http://localhost:5173`，点击"创建房间"，输入你的名字
2. **邀请玩家**：把房间号发给其他 3 位玩家，他们点击"加入房间"并输入房间号
3. **选择角色**：4 位玩家分别选择零售商、批发商、分销商、工厂
4. **开始游戏**：房主点击"开始游戏"
5. **提交决策**：每回合根据库存和订单情况，决定向上游的订货量
6. **查看结果**：所有回合结束后自动跳转结算页

### 总控看板

访问 `http://localhost:5173/dashboard` 可以实时查看所有小组的游戏状态和成本对比。

---

## 游戏规则

### 角色

| 角色 | 上游 | 下游 |
|------|------|------|
| 零售商 | 批发商 | 消费者 |
| 批发商 | 分销商 | 零售商 |
| 分销商 | 工厂 | 批发商 |
| 工厂 | 生产 | 分销商 |

### 延迟机制

- **订单传递延迟**：2 回合
- **货物运输延迟**：2 回合

### 成本

| 成本类型 | 费率 |
|----------|------|
| 库存持有成本 | $1 / 单位 / 回合 |
| 缺货成本 | $2 / 单位 / 回合 |

### 消费者需求

- 前 4 回合：每回合 4 单位
- 第 5 回合起：每回合 8 单位

### 初始状态

- 每位玩家初始库存：12 单位
- 默认回合数：24 回合（可调 10-50）

---

## 操作指南

### 创建房间

1. 首页点击 **"创建房间"**
2. 输入你的名字（必填）
3. 可选：修改回合数（默认 24，范围 10-50）
4. 点击 **"创建房间"**，获得 6 位房间号

### 加入房间

1. 首页点击 **"加入房间"**
2. 输入房主分享的 6 位房间号
3. 输入你的名字
4. 点击 **"加入房间"**

### 等待室

- 选择你的角色（点击空位或"选择此角色"）
- 可以更换角色（再次点击）
- 4 人满员后，房主点击 **"开始游戏"**

### 游戏界面

| 区域 | 说明 |
|------|------|
| 供应链接图 | 展示 4 个角色的当前库存和决策状态 |
| 我的状态 | 当前库存、缺货、收到订单/货物、成本 |
| 订货决策 | 输入订货量，点击提交 |
| 库存趋势图 | 库存和缺货随时间变化的折线图 |
| 成本趋势图 | 累计成本和回合成本的折线图 |
| 回合记录表 | 每回合详细数据 |

### 结算页面

- 排名：按总成本从低到高排列
- 消费者需求变化图
- 每位玩家的持有成本和缺货成本明细

### 总控看板

- 访问 `/dashboard` 路径
- 实时统计：进行中/等待中/已完成游戏数量
- 每个小组卡片：房间号、状态、玩家、进度
- 完成多组后自动显示成本对比柱状图

---

## 部署到 Vercel

由于啤酒游戏使用 WebSocket 实现实时通信，需要将**前端**和**后端**分开部署：

- **前端** → Vercel（静态网站）
- **后端** → Railway / Render（支持 WebSocket 长连接）

### 一、部署前端到 Vercel

#### 方式 1：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（在项目根目录执行）
vercel --prod
```

#### 方式 2：Vercel Dashboard

1. 推送代码到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入项目
3. 设置：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:client`
   - **Output Directory**: `client/dist`
4. 添加环境变量：
   - `VITE_SERVER_URL` = 你的后端 URL（如 `https://beer-game-api.railway.app`）
5. 点击 Deploy

### 二、部署后端到 Railway

[Railway](https://railway.app) 支持 WebSocket，且有免费额度。

#### 方式 1：Railway CLI

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化（在项目根目录）
railway init

# 部署
railway up
```

#### 方式 2：Railway Dashboard

1. 推送代码到 GitHub
2. 在 [railway.app](https://railway.app) 创建新项目
3. 选择 "Deploy from GitHub repo"
4. 设置：
   - **Root Directory**: `/`
   - **Start Command**: `npm run start:server`
   - **Build Command**: `npm install`
5. 部署后获得后端 URL（如 `beer-game-api.up.railway.app`）
6. 将此 URL 设置为 Vercel 的 `VITE_SERVER_URL` 环境变量

### 三、部署后端到 Render

[Render](https://render.com) 也支持 WebSocket，免费计划有 750 小时/月。

1. 在 [render.com](https://render.com) 创建新的 **Web Service**
2. 连接 GitHub 仓库
3. 设置：
   - **Root Directory**: 留空
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:server`
4. 选择 Free 计划
5. 部署后获得后端 URL（如 `beer-game.onrender.com`）
6. 将此 URL 设置为 Vercel 的 `VITE_SERVER_URL` 环境变量

### 四、关联前后端

部署完成后，确保 Vercel 前端设置了正确的环境变量：

```
VITE_SERVER_URL=https://你的后端地址
```

（注意：URL 末尾不要加 `/`）

### 五、部署命令速查

| 命令 | 用途 |
|------|------|
| `npm run start:server` | Railway/Render 生产启动 |
| `npm run build:client` | Vercel 构建命令 |
| `npm run dev:server` | 本地开发后端 |
| `npm run dev:client` | 本地开发前端 |

---

## 项目结构

```
beer_game/
├── packages/
│   └── shared/            # 共享类型、常量
│       └── src/
│           ├── types.ts   # Game, Player, RoundState 等
│           └── constants.ts # 角色、成本、延迟、需求模式
├── server/                # Express + Socket.IO 后端
│   └── src/
│       ├── index.ts       # 入口（Express + Socket.IO + API）
│       ├── store.ts       # 内存存储（games, players, rounds）
│       ├── game-logic.ts  # 核心逻辑（回合处理、管道、成本）
│       ├── utils.ts       # ID 生成、房间号生成
│       └── handlers/
│           ├── lobby.ts   # 创建/加入房间、选角色、开始游戏
│           └── game.ts    # 提交决策、回合推进
├── client/                # Vue 3 + Vite 前端
│   └── src/
│       ├── pages/         # 7 个页面
│       │   ├── HomePage.vue
│       │   ├── CreateGamePage.vue
│       │   ├── JoinGamePage.vue
│       │   ├── LobbyPage.vue
│       │   ├── GamePage.vue
│       │   ├── ResultPage.vue
│       │   └── DashboardPage.vue
│       ├── components/
│       │   ├── game/      # 游戏组件
│       │   │   ├── GameBoard.vue
│       │   │   ├── SupplyChainDiagram.vue
│       │   │   ├── PlayerPanel.vue
│       │   │   ├── OrderDecision.vue
│       │   │   ├── RoundStatus.vue
│       │   │   ├── InventoryChart.vue
│       │   │   ├── CostChart.vue
│       │   │   └── GameLog.vue
│       │   ├── lobby/     # 等待室组件
│       │   └── layout/    # 布局组件
│       ├── composables/   # useSocket, useGame
│       ├── stores/        # Pinia (auth, game)
│       └── config.ts      # 后端地址配置
├── vercel.json            # Vercel 部署配置
└── README.md
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 + Composition API |
| 构建工具 | Vite 5 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 实时通信 | Socket.IO |
| 图表 | Chart.js (vue-chartjs) |
| 后端框架 | Express |
| 运行时 | Node.js 20+ |
| 语言 | TypeScript |

## 常见问题

### Q: 后端需要数据库吗？
不需要。当前使用内存存储，所有游戏数据在服务器重启后丢失。如需持久化，可以参考 `server/src/store.ts` 替换为数据库实现。

### Q: 可以同时进行多少局游戏？
理论上无限制，每局游戏独立存储在内存中。实际受服务器内存限制。

### Q: 玩家断线了怎么办？
游戏支持断线重连。玩家重新连接后会自动恢复游戏状态。如果所有玩家都断开超过 5 分钟，游戏会自动终止。

### Q: 如何修改消费者需求模式？
编辑 `packages/shared/src/constants.ts` 中的 `generateConsumerDemand` 函数。