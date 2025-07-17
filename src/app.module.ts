import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BusesModule } from './buses/buses.module';
import { RoutesModule } from './routes/routes.module';
import { BookingsModule } from './bookings/bookings.module'; // Add this

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        dbName: process.env.DATABASE_NAME,
      }),
    }),
    AuthModule,
    BusesModule,
    RoutesModule,
    BookingsModule, // Add this
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
