import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioModule } from './audio/audio.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule, AudioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
