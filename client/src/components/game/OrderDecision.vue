<template>
  <div class="card order-decision">
    <h3>订货决策</h3>
    <div v-if="playerState" class="mt-1">
      <div class="decision-info">
        <p>
          <strong>收到下游订单:</strong> {{ playerState.incomingOrder }} 单位
        </p>
        <p>
          <strong>收到上游货物:</strong> {{ playerState.incomingShipment }} 单位
        </p>
        <p>
          <strong>当前库存:</strong> {{ playerState.inventory }} 单位
        </p>
        <p v-if="playerState.backorder > 0" class="text-danger">
          <strong>缺货:</strong> {{ playerState.backorder }} 单位
        </p>
      </div>

      <div v-if="!playerState.hasDecided" class="decision-form mt-2">
        <div class="form-group">
          <label class="label">向上游订货量</label>
          <div class="flex items-center gap-1">
            <input
              v-model.number="orderQuantity"
              type="number"
              class="input"
              min="0"
              max="999"
              placeholder="输入订货量"
              @keyup.enter="submitDecision"
            />
            <button
              class="btn btn-primary"
              :disabled="orderQuantity === null || orderQuantity < 0 || isSubmitting"
              @click="submitDecision"
            >
              {{ isSubmitting ? '提交中...' : '提交' }}
            </button>
          </div>
        </div>
        <div v-if="decisionError" class="error-text">{{ decisionError }}</div>
      </div>

      <div v-else class="decision-submitted mt-2">
        <div class="submitted-badge">
          ✓ 已提交订货量: <strong>{{ playerState.orderQuantity }}</strong> 单位
        </div>
        <p class="waiting-text">等待其他玩家提交决策...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';

const { emit } = useSocket();
const authStore = useAuthStore();
const gameStore = useGameStore();

const orderQuantity = ref<number | null>(null);
const isSubmitting = ref(false);
const decisionError = ref('');

const playerState = computed(() => gameStore.myPlayerState);

function submitDecision() {
  if (orderQuantity.value === null || orderQuantity.value < 0) return;

  isSubmitting.value = true;
  decisionError.value = '';

  emit('round:decide', {
    gameId: gameStore.currentGame!.id,
    playerId: authStore.playerId,
    roundNumber: gameStore.roundState!.roundNumber,
    orderQuantity: orderQuantity.value,
  });

  // Optimistically mark as decided
  if (playerState.value) {
    playerState.value.hasDecided = true;
    playerState.value.orderQuantity = orderQuantity.value;
  }

  isSubmitting.value = false;
}
</script>

<style scoped>
.order-decision h3 {
  font-size: 16px;
}

.decision-info {
  font-size: 14px;
  line-height: 2;
}

.decision-info p {
  display: flex;
  justify-content: space-between;
}

.text-danger {
  color: var(--color-danger);
}

.decision-form .input {
  flex: 1;
}

.submitted-badge {
  padding: 12px 16px;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: var(--radius);
  color: #15803d;
  font-size: 14px;
  text-align: center;
}

.waiting-text {
  margin-top: 12px;
  font-size: 14px;
  color: var(--color-text-muted);
  text-align: center;
}
</style>