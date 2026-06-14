import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

/**
 * Bootstraps the full NestJS application against the DATABASE_URL from the
 * environment (defaults to a local test DB). Migrations are run before each
 * suite and the schema is dropped after.
 *
 * Set DATABASE_URL=postgresql://postgres:test@localhost:5498/officeping_test
 * before running tests.
 */
export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export async function runMigrations(app: INestApplication): Promise<void> {
  const ds = app.get<DataSource>(getDataSourceToken());
  await ds.runMigrations();
}

export async function dropSchema(app: INestApplication): Promise<void> {
  const ds = app.get<DataSource>(getDataSourceToken());
  await ds.dropDatabase();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
