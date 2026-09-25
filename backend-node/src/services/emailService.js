const nodemailer = require('nodemailer');

const BRAND_COLOR = '#4F6AF5';
const BRAND_DARK  = '#3B54E0';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = { from: process.env.EMAIL_FROM, to, subject, html, text };
    const info = await transporter.sendMail(mailOptions);
    console.log(`[email] sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] error:', error);
    return { success: false, error: error.message };
  }
};

const emailWrapper = (headerContent, bodyContent) => `
<!DOCTYPE html>
<html>
<body style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; color: #0f172a;">
  <div style="background: linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_DARK}); padding: 28px 30px; border-radius: 12px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Trouve Moi</h1>
    ${headerContent}
  </div>
  <div style="padding: 30px; background: #ffffff; border-radius: 12px; margin-top: 16px; border: 1px solid #e2e8f0;">
    ${bodyContent}
  </div>
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    Trouve Moi &mdash; Plateforme de signalement d'objets perdus
  </p>
</body>
</html>
`;

const sendOTPEmail = async (email, name, otp) => {
  console.log(`\n🔑 [OTP DEV] Code de vérification pour ${email} : ${otp}\n`);
  const html = emailWrapper(
    `<p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">Code de v&eacute;rification</p>`,
    `
    <h2 style="margin: 0 0 16px; font-size: 18px;">Bonjour ${name},</h2>
    <p style="color: #475569;">Votre code de v&eacute;rification est&nbsp;:</p>
    <div style="text-align: center; margin: 28px 0;">
      <span style="font-size: 36px; font-weight: 700; color: ${BRAND_COLOR}; letter-spacing: 10px; background: #f1f5ff; padding: 16px 28px; border-radius: 10px; border: 2px dashed ${BRAND_COLOR}; display: inline-block;">
        ${otp}
      </span>
    </div>
    <p style="color: #64748b;">Ce code est valable pendant <strong>10 minutes</strong>.</p>
    <p style="color: #94a3b8; font-size: 12px;">Si vous n&apos;avez pas demand&eacute; ce code, ignorez cet email.</p>
    `
  );
  return sendEmail({ to: email, subject: 'Code de vérification — Trouve Moi', html });
};

const sendPasswordResetEmail = async (email, name, resetUrl) => {
  const html = emailWrapper(
    `<p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">R&eacute;initialisation du mot de passe</p>`,
    `
    <h2 style="margin: 0 0 16px; font-size: 18px;">Bonjour ${name},</h2>
    <p style="color: #475569;">Vous avez demand&eacute; &agrave; r&eacute;initialiser votre mot de passe.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" style="background: ${BRAND_COLOR}; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">
        R&eacute;initialiser mon mot de passe
      </a>
    </div>
    <p style="color: #64748b;">Ce lien est valable pendant <strong>1 heure</strong>.</p>
    <p style="color: #94a3b8; font-size: 12px;">Si vous n&apos;avez pas demand&eacute; cette r&eacute;initialisation, ignorez cet email.</p>
    `
  );
  return sendEmail({ to: email, subject: 'Réinitialisation de votre mot de passe — Trouve Moi', html });
};

const sendMatchNotificationEmail = async (email, name, score, itemTitle) => {
  const html = emailWrapper(
    `<p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">Nouveau match d&eacute;tect&eacute;</p>`,
    `
    <h2 style="margin: 0 0 16px; font-size: 18px;">Bonjour ${name},</h2>
    <p style="color: #475569;">Bonne nouvelle&nbsp;! Un objet correspondant &agrave; &laquo;&nbsp;<strong>${itemTitle}</strong>&nbsp;&raquo; a &eacute;t&eacute; trouv&eacute;.</p>
    <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f1f5ff; border-radius: 10px;">
      <span style="font-size: 48px; font-weight: 800; color: ${BRAND_COLOR};">${score}%</span>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">de compatibilit&eacute;</p>
    </div>
    <p style="color: #475569;">Connectez-vous &agrave; Trouve Moi pour consulter ce match.</p>
    `
  );
  return sendEmail({ to: email, subject: `Nouveau match ${score}% pour votre objet — Trouve Moi`, html });
};

module.exports = { sendEmail, sendOTPEmail, sendPasswordResetEmail, sendMatchNotificationEmail };
