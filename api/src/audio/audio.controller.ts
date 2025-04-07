import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioService } from './audio.service';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('audio'))
  async processAudio(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(wav|mp3|ogg|webm)/,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024, // 10MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    try {
      const responseAudio = await this.audioService.processAudio(file.buffer);
      return {
        success: true,
        audio: responseAudio.toString('base64'),
        mimeType: 'audio/mp3',
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      throw new BadRequestException({
        success: false,
        message: 'Failed to process audio',
        error: error.message,
      });
    }
  }
}
