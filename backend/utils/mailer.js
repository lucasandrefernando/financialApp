import nodemailer from 'nodemailer'

const smtpUser = process.env.SMTP_USER || ''
const smtpPass = process.env.SMTP_PASS || ''
const mailFrom = process.env.MAIL_FROM || smtpUser || 'no-reply@financialapp.local'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
})

function resolveBaseUrl(appUrl) {
  return (appUrl || process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '')
}

function ensureMailerConfigured() {
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP_USER/SMTP_PASS não configurados no ambiente.')
  }
}

export async function sendEmailVerificationEmail(to, verificationToken, appUrl, appBasePath = '') {
  ensureMailerConfigured()

  const baseUrl = resolveBaseUrl(appUrl)
  const normalizedBasePath = appBasePath && appBasePath !== '/' ? appBasePath.replace(/\/+$/, '') : ''
  const verifyUrl = `${baseUrl}${normalizedBasePath}/api/auth/verify-email?token=${verificationToken}`

  await transporter.sendMail({
    from: `"FinanceApp" <${mailFrom}>`,
    to,
    subject: 'Confirme seu e-mail e crie sua senha - FinanceApp',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; color: #111827;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="background: linear-gradient(135deg, #6D28D9, #9333EA); width: 56px; height: 56px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 26px;">💼</div>
          <h1 style="margin: 14px 0 0; font-size: 24px; color: #1f113d;">FinanceApp</h1>
        </div>

        <h2 style="margin: 0 0 12px; font-size: 20px;">Confirme seu cadastro</h2>
        <p style="margin: 0 0 14px; color: #4b5563; line-height: 1.6;">
          Recebemos seu cadastro. Clique no botão abaixo para confirmar seu e-mail e definir sua senha de acesso.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #6D28D9, #9333EA); color: #fff; text-decoration: none; padding: 14px 26px; border-radius: 10px; font-weight: 600;">
            Confirmar e criar senha
          </a>
        </div>

        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
          Este link expira em <strong>24 horas</strong>.
          Se você não solicitou este cadastro, ignore este e-mail.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to, resetToken, appUrl) {
  ensureMailerConfigured()

  const baseUrl = resolveBaseUrl(appUrl)
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

  await transporter.sendMail({
    from: `"FinanceApp" <${mailFrom}>`,
    to,
    subject: 'Recuperação de senha - FinanceApp',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="background: #4F46E5; width: 56px; height: 56px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 28px;">💼</span>
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
        <p style="color: #9CA3AF; font-size: 14px;">Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este e-mail.</p>
      </div>
    `,
  })
}
