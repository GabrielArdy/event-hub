import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      endpoint: config.get<string>('STORAGE_ENDPOINT'),
      region: 'auto',
      credentials: {
        accessKeyId: config.get<string>('STORAGE_ACCESS_KEY_ID')!,
        secretAccessKey: config.get<string>('STORAGE_SECRET_ACCESS_KEY')!,
      },
      forcePathStyle: true,
    });
    this.bucket = config.get<string>('STORAGE_BUCKET_NAME', 'eventhub-storage');
    this.publicUrl = config.get<string>('STORAGE_PUBLIC_URL', '');
  }

  async upload(
    file: Buffer,
    originalName: string,
    folder: string,
    mimeType: string,
  ): Promise<string> {
    const ext = originalName.split('.').pop();
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  async delete(url: string): Promise<void> {
    const key = url.replace(`${this.publicUrl}/`, '');
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
