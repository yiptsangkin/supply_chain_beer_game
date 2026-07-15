import type { Role } from './types.js';

// ============================================================
// 成本常量
// ============================================================
export const HOLDING_COST_PER_UNIT = 1;
export const SHORTAGE_COST_PER_UNIT = 2;

// ============================================================
// 延迟常量
// ============================================================
export const ORDER_DELAY_ROUNDS = 2;
export const SHIPMENT_DELAY_ROUNDS = 2;

// ============================================================
// 角色定义
// ============================================================
export const ROLES: Role[] = ['retailer', 'wholesaler', 'distributor', 'factory'];

export const ROLE_LABELS: Record<Role, string> = {
  retailer: '零售商',
  wholesaler: '批发商',
  distributor: '分销商',
  factory: '工厂',
};

export const UPSTREAM_MAP: Record<Role, Role | null> = {
  retailer: 'wholesaler',
  wholesaler: 'distributor',
  distributor: 'factory',
  factory: null,
};

export const DOWNSTREAM_MAP: Record<Role, Role | null> = {
  factory: 'distributor',
  distributor: 'wholesaler',
  wholesaler: 'retailer',
  retailer: null,
};

// ============================================================
// 消费者需求
// ============================================================
export const DEFAULT_TOTAL_ROUNDS = 24;

export function generateConsumerDemand(totalRounds: number): number[] {
  const demand: number[] = [];
  for (let i = 1; i <= totalRounds; i++) {
    if (i <= 4) {
      demand.push(4);
    } else {
      demand.push(8);
    }
  }
  return demand;
}