import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { seedDatabase } from './seed.js';

const bootstrap = async () => {
  // Dynamic import so default/index.ts (the db singleton) loads here, not at
  // module-parse time. This ensures the singleton opens the db file BEFORE seeding,
  // and we use the SAME connection for seeding — no WAL handoff between two clients.
  const { AppModule } = await import('./app/app.module.js');
  const { default: prisma } = await import('./app/data-sources/default/index.js');

  await seedDatabase(prisma);

  const app = await NestFactory.create(AppModule);
  app.enableCors();

  if (process.env['NODE_ENV'] !== 'production') {
    app.use('/_test/reset', async (req: any, res: any) => {
      if (req.method !== 'POST') { res.status(405).end(); return; }
      await prisma.$disconnect();
      await prisma.$connect();
      await seedDatabase(prisma);
      res.json({ ok: true });
    });
  }

  const config = new DocumentBuilder()
    .setTitle('Book Collection')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env['PORT'] || 4444;
  await app.listen(port);
  Logger.log(`Application running on http://localhost:${port}`);
};

bootstrap();
