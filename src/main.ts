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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => void app.close());
  }
}
bootstrap().catch((err) => {
  console.error('Error starting the application:', err);
});
