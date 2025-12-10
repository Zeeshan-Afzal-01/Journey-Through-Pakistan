import nodemailer from 'nodemailer';
import { getSMTPConfig, getEmailFrom } from './settingsHelper.js';

const sendOTP = async (email, otp) => {
  try {
    // Get SMTP config from settings
    const smtpConfig = await getSMTPConfig();
    const fromInfo = await getEmailFrom();

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      service: smtpConfig.host.includes('gmail') ? 'gmail' : undefined,
      auth: {
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass
      }
    });

    const mailOptions = {
      from: `"${fromInfo.name}" <${fromInfo.email}>`,
      to: email,
      subject: "OTP Verification",
      text: `Hello,
Thank you for registering on our platform.

Your One-Time Password (OTP) for email verification is: ${otp}

Please enter this OTP to verify your account. This code will expire in 10 minutes.

If you did not request this, please ignore this email.

Best regards,  
The Journey Through Pakistan Team`
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP has been sent to email: ", email);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
}


export default sendOTP;