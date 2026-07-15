<template>
  <div class="card game-log">
    <h3>回合记录</h3>
    <div class="table-wrapper mt-1">
      <table v-if="history.length > 0">
        <thead>
          <tr>
            <th>回合</th>
            <th>收到订单</th>
            <th>收到货物</th>
            <th>库存</th>
            <th>缺货</th>
            <th>我的订货</th>
            <th>持有成本</th>
            <th>缺货成本</th>
            <th>累计成本</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in history" :key="entry.round">
            <td>{{ entry.round }}</td>
            <td>{{ entry.incomingOrder }}</td>
            <td>{{ entry.incomingShipment }}</td>
            <td>{{ entry.inventory }}</td>
            <td :class="{ 'text-danger': entry.backorder > 0 }">{{ entry.backorder }}</td>
            <td>{{ entry.orderQuantity ?? '—' }}</td>
            <td>${{ entry.holdingCost }}</td>
            <td>${{ entry.shortageCost }}</td>
            <td :class="{ 'text-danger': entry.cumulativeCost > 0 }">${{ entry.cumulativeCost }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="no-data">暂无数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { useSocket } from '@/composables/useSocket';
import type { RoundState, PlayerRoundState } from '@beer-game/shared';

const gameStore = useGameStore();
const { on } = useSocket();

interface LogEntry {
  round: number;
  incomingOrder: number;
  incomingShipment: number;
  inventory: number;
  backorder: number;
  orderQuantity: number | null;
  holdingCost: number;
  shortageCost: number;
  cumulativeCost: number;
}

const history = ref<LogEntry[]>([]);

function addEntry(s: RoundState) {
  const ps = gameStore.myRole ? s.playerStates[gameStore.myRole] : null;
  if (!ps) return;
  const existing = history.value.find((h) => h.round === s.roundNumber);
  if (existing) {
    Object.assign(existing, logFromState(ps));
  } else {
    history.value.push(logFromState(ps));
  }
}

function logFromState(ps: PlayerRoundState): LogEntry {
  return {
    round: ps.roundNumber,
    incomingOrder: ps.incomingOrder,
    incomingShipment: ps.incomingShipment,
    inventory: ps.inventory,
    backorder: ps.backorder,
    orderQuantity: ps.orderQuantity,
    holdingCost: ps.holdingCost,
    shortageCost: ps.shortageCost,
    cumulativeCost: ps.cumulativeCost,
  };
}

on('game:state', (data: any) => addEntry(data as RoundState));
on('game:round_processed', (data: any) => addEntry(data as RoundState));
</script>

<style scoped>
.game-log h3 {
  font-size: 16px;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  text-align: left;
  padding: 8px;
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  white-space: nowrap;
}

td {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

tr:hover {
  background: var(--color-bg);
}

.text-danger {
  color: var(--color-danger);
  font-weight: 600;
}

.no-data {
  text-align: center;
  color: var(--color-text-muted);
  padding: 20px 0;
}
</style>