import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * S3 service — làm việc với MinIO (API tương thích S3).
 * Bucket luôn PRIVATE: mọi upload/download đi qua presigned URL.
 */
@Injectable()
export class S3Service implements OnModuleInit {
  private client!: S3Client;
  private bucket!: string;
  private presignTtl!: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const endpoint = this.config.get<string>("S3_ENDPOINT");
    const accessKey = this.config.get<string>("S3_ACCESS_KEY");
    const secretKey = this.config.get<string>("S3_SECRET_KEY");
    this.bucket = this.config.get<string>("S3_BUCKET") ?? "tteamflow";
    this.presignTtl = Number(this.config.get("PRESIGN_URL_TTL") ?? 900);

    if (!endpoint || !accessKey || !secretKey) {
      // Không ném lỗi lúc bootstrap để app vẫn chạy được không có MinIO (dev);
      // các API attachment sẽ báo lỗi rõ ràng khi được gọi.
      console.warn(
        "[S3Service] Thiếu S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY — chức năng tệp đính kèm sẽ không khả dụng.",
      );
      return;
    }

    this.client = new S3Client({
      endpoint,
      region: "us-east-1",
      forcePathStyle: true, // bắt buộc cho MinIO: http://host/bucket/key
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
  }

  private assertReady() {
    if (!this.client) {
      throw new InternalServerErrorException(
        "Dịch vụ lưu trữ tệp chưa được cấu hình",
      );
    }
  }

  /**
   * Tạo presigned URL cho client PUT file trực tiếp lên MinIO.
   * Byte của file KHÔNG đi qua backend.
   */
  async getUploadUrl(objectKey: string, mimeType: string): Promise<string> {
    this.assertReady();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client, command, { expiresIn: this.presignTtl });
  }

  /** Tạo presigned URL tải file (GET) với hạn ngắn. */
  async getDownloadUrl(objectKey: string): Promise<string> {
    this.assertReady();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });
    return getSignedUrl(this.client, command, { expiresIn: this.presignTtl });
  }

  /** Kiểm tra object đã tồn tại trên MinIO (dùng cho flow complete). */
  async objectExists(objectKey: string): Promise<boolean> {
    this.assertReady();
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Xoá object khỏi bucket (best-effort — không ném lỗi nếu thiếu). */
  async deleteObject(objectKey: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
    } catch (error) {
      console.error(`[S3Service] Không xoá được object ${objectKey}:`, error);
    }
  }
}
