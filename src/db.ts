import mysql, { Pool } from "mysql2/promise";

let pool: Pool;

export async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "erp_aero_test",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  await pool.query("SELECT 1");
}

export function getPool(): Pool {
  if (!pool) throw new Error("DB not initialized");
  return pool;
}
