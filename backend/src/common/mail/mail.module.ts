import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";

/** Global để mọi module nghiệp vụ đều gửi được email */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
