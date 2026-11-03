import { Global, Module } from "@nestjs/common";
import { S3Service } from "./s3.service";

/** Global để mọi module nghiệp vụ đều dùng được S3Service (attachments, avatar, ...) */
@Global()
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
