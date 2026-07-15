import initSqlJs, { type Database } from 'sql.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DB_PATH = resolve(process.cwd(), 'data', 'beer_game.db');

let db: Database;

export function getDb(): Database {
  return db;
}

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });
  }

  // Enable WAL mode for better performance
  db.run('PRAGMA journal_mode=WAL');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      current_round INTEGER NOT NULL DEFAULT 1,
      total_rounds INTEGER NOT NULL DEFAULT 24,
      consumer_demand TEXT NOT NULL,
      host_id TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id),
      name TEXT NOT NULL,
      role TEXT,
      connected INTEGER NOT NULL DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS round_states (
      player_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      role TEXT NOT NULL,
      incoming_order INTEGER NOT NULL DEFAULT 0,
      incoming_shipment INTEGER NOT NULL DEFAULT 0,
      inventory INTEGER NOT NULL DEFAULT 0,
      backorder INTEGER NOT NULL DEFAULT 0,
      has_decided INTEGER NOT NULL DEFAULT 0,
      order_quantity INTEGER,
      holding_cost REAL NOT NULL DEFAULT 0,
      shortage_cost REAL NOT NULL DEFAULT 0,
      round_cost REAL NOT NULL DEFAULT 0,
      cumulative_cost REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (player_id, round_number)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_pipeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_player_id TEXT NOT NULL,
      to_player_id TEXT NOT NULL,
      round_placed INTEGER NOT NULL,
      round_arrives INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shipment_pipeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_player_id TEXT NOT NULL,
      to_player_id TEXT NOT NULL,
      round_placed INTEGER NOT NULL,
      round_arrives INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_history (
      game_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      consumer_demand INTEGER NOT NULL,
      player_states TEXT NOT NULL,
      PRIMARY KEY (game_id, round_number)
    )
  `);

  saveDb();
}

export function saveDb(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  mkdirSync(resolve(process.cwd(), 'data'), { recursive: true });
  writeFileSync(DB_PATH, buffer);
}