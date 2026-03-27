import mysql from 'mysql2/promise'

const DB_HOST = process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1'
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306)
const DB_USER = process.env.DB_USER || process.env.MYSQL_USER || 'root'
const DB_PASS = process.env.DB_PASS || process.env.MYSQL_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'financial_app'

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-03:00',
  charset: 'utf8mb4',
})

export default pool
