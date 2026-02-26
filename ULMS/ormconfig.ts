import 'dotenv/config';
import 'reflect-metadata'; // 👈 thêm dòng này cũng được, an toàn hơn
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root', // hoặc root nếu bạn chọn root
  // password: process.env.DB_PASS || 'appsecret',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'library_management',
  synchronize: false,
  logging: true,
  timezone: '+07:00',
  // Cách 1: Dùng glob "đúng thư mục entities"
  entities: ['src/**/entities/*.{ts,js}'],
  migrations: ['database/migrations/*.{ts,js}'],
});
