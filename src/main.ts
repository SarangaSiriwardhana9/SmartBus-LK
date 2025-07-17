import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for your frontend
  app.enableCors({
    origin: ['http://localhost:3000'], // Your Next.js frontend URL
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Add global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 Bus Management API running on: http://localhost:${port}/api`);
}
bootstrap();
