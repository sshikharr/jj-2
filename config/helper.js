import { SendMailClient } from "zeptomail";
import { admin } from "./firebase.js";

const url = "api.zeptomail.com/";
// It's best to store your token in an environment variable.
const token =
  "Zoho-enczapikey wSsVR60jqx6lX/t+nWauI7tqyFldBA/wFR8v2Fqh7XP0Fq3H98dokhKbUVDxHPJOGWI9FjtAoboryUoC0jpaj9gqmFEFWyiF9mqRe1U4J3x17qnvhDzKWW1ZlhWNJY8NwQton2ZgEcol+g==";

const client = new SendMailClient({ url, token });

export const sendLoginEmail = async (email, name, loginTime, device) => {
  try {
    const response = await client.sendMail({
      from: {
        address: "noreply@juristo.in", // your verified sender email
        name: "noreply",
      },
      to: [
        {
          email_address: {
            address: email,
            name: name,
          },
        },
      ],
      subject: "Login Successful",
      htmlbody: `<div>
                   <p>Hello ${name},</p>
                   <p>You have successfully logged in to your account in Juristo.</p>
                   <p><strong>Login Time:</strong> ${loginTime}</p>
                   <p><strong>Device:</strong> ${device}</p>
                   <p>If this wasn't you, please contact support immediately.</p>
                 </div>`,
    });
    console.log("Email sent successfully:", response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Function to send a push notification using Firebase Cloud Messaging (FCM)
export const sendLoginNotification = async (fcmToken, loginTime, device) => {
  const message = {
    notification: {
      title: "Login Successful",
      body: `Logged in at ${loginTime} using ${device}`,
    },
    token: fcmToken, // The device token received from your client app
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

export const sendResetPasswordEmail = async (recipientEmail, resetUrl) => {
  try {
    const response = await client.sendMail({
      from: {
        address: "noreply@juristo.in", // Must be verified in ZeptoMail
        name: "Juristo Support",
      },
      to: [
        {
          email_address: {
            address: recipientEmail,
            name: recipientEmail.split("@")[0],
          },
        },
      ],
      subject: "Password Reset Request",
      htmlbody: `<div>
                   <p>Hello,</p>
                   <p>You requested a password reset. Click the link below to reset your password:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>
                   <p>If you did not request a password reset, please ignore this email.</p>
                   <p>Thank you,<br/>Juristo Team</p>
                 </div>`,
    });
    console.log("Reset password email sent successfully:", response);
  } catch (error) {
    console.error("Error sending reset password email:", error);
    throw error;
  }
};

export const sendForgotPasswordEmail = async (email, resetUrl) => {
  try {
    const response = await client.sendMail({
      from: {
        address: "noreply@juristo.in",
        name: "Juristo Support",
      },
      to: [
        {
          email_address: {
            address: email,
            name: email.split("@")[0],
          },
        },
      ],
      subject: "Password Reset Request",
      htmlbody: `<div>
                   <p>Hello,</p>
                   <p>You requested a password reset for your Juristo account.</p>
                   <p>Please click the link below to reset your password:</p>
                   <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
                   <p>This link will expire in 1 hour.</p>
                   <p>If you did not request a password reset, please ignore this email.</p>
                   <p>Regards,<br/>Juristo Team</p>
                 </div>`,
    });
    console.log("Forgot Password Email sent successfully:", response);
  } catch (error) {
    console.error("Error sending forgot password email:", error);
  }
};
