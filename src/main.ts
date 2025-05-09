import * as dotenv from 'dotenv';

dotenv.config();

declare const module: NodeModule & {
  hot?: {
    accept: () => void;
    dispose: (callback: () => void) => void;
  };
};

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Thêm CORS cho port 3000
  app.enableCors({
    origin: ['http://localhost:3001', '*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  // Cấu hình để phục vụ tệp tĩnh
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => void app.close());
  }
}
bootstrap().catch((err) => {
  console.error('Error starting the application:', err);
});
