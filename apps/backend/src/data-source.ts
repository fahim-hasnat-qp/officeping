import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import {
  AppSetting,
  Breakfast,
  Category,
  Compliment,
  Lunch,
  PushSubscription,
  Request,
  RequestNote,
  User,
} from './entities';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Category, Request, RequestNote, Breakfast, Lunch, Compliment, PushSubscription, AppSetting],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  migrationsRun: false,
};

export default new DataSource(dataSourceOptions);
