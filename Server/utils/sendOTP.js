import nodemailer from 'nodemailer';


const sendOTP = async (email, otp)=>{

    const transporter = nodemailer.createTransport(
        {

            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL/TLS
            service:'gmail',
            auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
            }
        }
    );

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "OTP Verification.",
        text: `Hello,
Thank you for registering on our platform.

Your One-Time Password (OTP) for email verification is: ${otp}

Please enter this OTP to verify your account. This code will expire in 10 minutes.

If you did not request this, please ignore this email.

Best regards,  
The Journey Thorugh Pakistan Team`


    };

    await transporter.sendMail(mailOptions);
    console.log("OTP has been sent to email: ", email);
}


export default sendOTP;