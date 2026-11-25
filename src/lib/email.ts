import nodemailer from 'nodemailer';

export type OutboundAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  attachment?: OutboundAttachment;
};

export async function sendEmail(message: OutboundEmail): Promise<void> {
  const mode = process.env.EMAIL_MODE ?? 'console';
  if (mode === 'console') {
    const attachment = message.attachment ? message.attachment.filename : 'none';
    console.log(`[email] to=${message.to} subject=${message.subject} attachment=${attachment}`);
    console.log(message.text);
    return;
  }
  if (mode !== 'smtp') {
    throw new Error('EMAIL_MODE must be console or smtp.');
  }

  const host = process.env.SMTP_HOST;
  if (!host) throw new Error('SMTP_HOST is not set.');
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASS ?? '' } : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'InvoiceLane <billing@localhost>',
    to: message.to,
    subject: message.subject,
    text: message.text,
    attachments: message.attachment
      ? [
          {
            filename: message.attachment.filename,
            content: message.attachment.content,
            contentType: message.attachment.contentType,
          },
        ]
      : undefined,
  });
}
