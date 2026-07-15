<template>
  <div class="home">
    <div class="hero text-center">
      <h1 class="hero-title">🍺 啤酒游戏</h1>
      <p class="hero-desc">
        经典的 MIT 供应链管理模拟游戏。扮演零售商、批发商、分销商或工厂，
        体验信息不对称带来的"牛鞭效应"。
      </p>
      <div class="hero-actions flex items-center justify-center gap-2 mt-4">
        <router-link to="/create" class="btn btn-primary btn-lg">创建房间</router-link>
        <router-link to="/join" class="btn btn-outline btn-lg">加入房间</router-link>
      </div>
      <div class="text-center mt-1">
        <router-link to="/dashboard" class="dashboard-link">📊 查看总控看板</router-link>
      </div>
    </div>

    <div class="rules card mt-4">
      <h2>游戏规则</h2>
      <div class="grid grid-2 mt-2">
        <div class="rule-item">
          <h3>🎯 目标</h3>
          <p>最小化你的总成本。库存持有成本 $1/单位/回合，缺货成本 $2/单位/回合。</p>
        </div>
        <div class="rule-item">
          <h3>👥 角色</h3>
          <p>4 名玩家分别扮演零售商、批发商、分销商和工厂，组成一条完整供应链。</p>
        </div>
        <div class="rule-item">
          <h3>📦 延迟</h3>
          <p>订单传递和货物运输各有 2 回合延迟，你的决策不会立即生效。</p>
        </div>
        <div class="rule-item">
          <h3>📊 需求</h3>
          <p>消费者需求会在游戏中途突然变化，考验你的供应链应变能力。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  padding: 60px 0 40px;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 16px;
}

.hero-desc {
  font-size: 18px;
  color: var(--color-text-muted);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.8;
}

.hero-actions {
  margin-top: 32px;
}

.dashboard-link {
  display: inline-block;
  margin-top: 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-primary);
  padding: 8px 16px;
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius);
  transition: background 0.2s;
}

.dashboard-link:hover {
  background: #eff6ff;
}

.rules h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.rule-item {
  padding: 16px;
  background: var(--color-bg);
  border-radius: var(--radius);
}

.rule-item h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.rule-item p {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.6;
}
</style>