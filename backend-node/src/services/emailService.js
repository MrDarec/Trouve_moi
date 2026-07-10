const nodemailer = require('nodemailer');

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
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email envoyé: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

const sendOTPEmail = async (email, name, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FF6B35, #F7C59F); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">🔍 Trouve Moi</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9; border-radius: 10px; margin-top: 20px;">
        <h2>Bonjour ${name} 👋</h2>
        <p>Votre code de vérification est :</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; color: #FF6B35; letter-spacing: 8px; background: #fff; padding: 15px 30px; border-radius: 8px; border: 2px dashed #FF6B35;">
            ${otp}
          </span>
        </div>
        <p style="color: #666;">Ce code est valable pendant <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to: email, subject: '🔐 Code de vérification Trouve Moi', html });
};

const sendPasswordResetEmail = async (email, name, resetUrl) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FF6B35, #F7C59F); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">🔍 Trouve Moi</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9; border-radius: 10px; margin-top: 20px;">
        <h2>Bonjour ${name} 👋</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #FF6B35; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #666;">Ce lien est valable pendant <strong>1 heure</strong>.</p>
        <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to: email, subject: '🔑 Réinitialisation de votre mot de passe', html });
};

const sendMatchNotificationEmail = async (email, name, score, itemTitle) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FF6B35, #F7C59F); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎯 Nouveau Match !</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9; border-radius: 10px; margin-top: 20px;">
        <h2>Bonjour ${name} 👋</h2>
        <p>Bonne nouvelle ! Un objet correspondant à "<strong>${itemTitle}</strong>" a été trouvé.</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 48px; font-weight: bold; color: #FF6B35;">${score}%</span>
          <p>de compatibilité</p>
        </div>
        <p>Connectez-vous à Trouve Moi pour consulter ce match.</p>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to: email, subject: `🎯 Nouveau match ${score}% pour votre objet !`, html });
};

module.exports = { sendEmail, sendOTPEmail, sendPasswordResetEmail, sendMatchNotificationEmail };
