import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'lucasandre.sanos@gmail.com',
    pass: process.env.SMTP_PASS || 'ttfa pldu paym kbdm',
  },
})

export async function sendPasswordResetEmail(to, resetToken, appUrl) {
  const baseUrl = appUrl || process.env.APP_URL || 'http://localhost:5173'
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

  await transporter.sendMail({
    from: `"FinanceApp" <lucasandre.sanos@gmail.com>`,
    to,
    subject: 'Recuperação de senha — FinanceApp',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="background: #4F46E5; width: 56px; height: 56px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 28px;">💰</span>
          </div>
          <h1 style="color: #1e1b4b; margin-top: 16px;">FinanceApp</h1>
        </div>
        <h2 style="color: #111827;">Redefinir sua senha</h2>
        <p style="color: #6B7280;">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Redefinir senha
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 14px;">Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">FinanceApp — Gestão financeira inteligente</p>
      </div>
    `,
  })
}
