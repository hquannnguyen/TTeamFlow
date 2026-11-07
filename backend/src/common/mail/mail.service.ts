import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Mail service — gửi email qua SMTP (Gmail App Password).
 * MAIL_DEV_LOG=true: không gửi thật, in nội dung email ra console (dùng khi demo/chạy test).
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;
  private from!: string;
  private devLog!: boolean;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>("MAIL_HOST");
    const port = Number(this.config.get("MAIL_PORT") ?? 587);
    const user = this.config.get<string>("MAIL_USER");
    const password = this.config.get<string>("MAIL_PASSWORD");

    this.from =
      this.config.get<string>("MAIL_FROM") ??
      `TTeamFlow <${user ?? "no-reply@tteamflow.local"}>`;
    this.devLog = this.config.get<string>("MAIL_DEV_LOG") === "true";

    if (this.devLog) {
      this.enabled = true;
      this.logger.warn(
        "MAIL_DEV_LOG=true — email sẽ được in ra console thay vì gửi thật.",
      );
      return;
    }

    if (!host || !user || !password) {
      this.logger.warn(
        "Thiếu MAIL_HOST/MAIL_USER/MAIL_PASSWORD — chức năng email sẽ không khả dụng. Bật MAIL_DEV_LOG=true để debug.",
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
    this.enabled = true;
  }

  private wrapLayout(
    title: string,
    bodyHtml: string,
    ctaUrl?: string,
    ctaLabel?: string,
  ) {
    return `<!DOCTYPE html>
<html lang="vi">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#4f46e5;padding:20px 32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">TTeamFlow</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">${title}</h2>
      <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.7;">${bodyHtml}</p>
      ${
        ctaUrl && ctaLabel
          ? `<a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${ctaLabel}</a>
             <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;word-break:break-all;">Nếu nút không hoạt động, mở đường dẫn: ${ctaUrl}</p>`
          : ""
      }
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">Email tự động từ TTeamFlow — bạn không cần trả lời email này.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.enabled) {
      this.logger.warn(
        `Mail chưa cấu hình — bỏ qua gửi "${subject}" tới ${to}`,
      );
      return false;
    }

    if (this.devLog) {
      this.logger.log(`[MAIL DEV] to=${to} subject="${subject}"\n${html}`);
      return true;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      return true;
    } catch (error) {
      this.logger.error(`Gửi mail thất bại tới ${to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(to: string, fullName: string, token: string) {
    const url = `${this.config.get<string>("APP_URL") ?? "http://localhost"}/verify-email?token=${token}`;
    return this.send(
      to,
      "Xác minh email TTeamFlow của bạn",
      this.wrapLayout(
        `Chào ${fullName},`,
        "Vui lòng xác minh địa chỉ email để hoàn tất thiết lập tài khoản TTeamFlow. Liên kết có hiệu lực trong <strong>24 giờ</strong>.",
        url,
        "Xác minh email",
      ),
    );
  }

  async sendPasswordResetEmail(to: string, fullName: string, token: string) {
    const url = `${this.config.get<string>("APP_URL") ?? "http://localhost"}/reset-password?token=${token}`;
    return this.send(
      to,
      "Đặt lại mật khẩu TTeamFlow",
      this.wrapLayout(
        `Chào ${fullName},`,
        "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Liên kết có hiệu lực trong <strong>30 phút</strong> và chỉ dùng được một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.",
        url,
        "Đặt lại mật khẩu",
      ),
    );
  }
}
