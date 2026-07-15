<template>
  <div class="game-board">
    <!-- Top bar: round info -->
    <RoundStatus />

    <!-- Supply chain diagram -->
    <SupplyChainDiagram class="mt-2" />

    <div class="grid grid-2 mt-2">
      <!-- Player panel -->
      <PlayerPanel />

      <!-- Order decision -->
      <OrderDecision />
    </div>

    <!-- Charts -->
    <div class="grid grid-2 mt-2">
      <InventoryChart />
      <CostChart />
    </div>

    <!-- Game log -->
    <GameLog class="mt-2" />
  </div>
</template>

<script setup lang="ts">
import RoundStatus from './RoundStatus.vue';
import SupplyChainDiagram from './SupplyChainDiagram.vue';
import PlayerPanel from './PlayerPanel.vue';
import OrderDecision from './OrderDecision.vue';
import InventoryChart from './InventoryChart.vue';
import CostChart from './CostChart.vue';
import GameLog from './GameLog.vue';
</script>