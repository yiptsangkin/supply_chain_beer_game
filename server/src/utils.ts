import { randomBytes } from 'node:crypto';

export function generateId(): string {
  return randomBytes(8).toString('hex');
}

export function generateGameCode(): string {
  // 6-character uppercase alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}