import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;

  // Mode dev: kalau SMTP belum diisi, cetak ke terminal
  if (!host) {
    console.log(`\n[mail dev] Ke: ${to}\n${subject}\n${text}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}