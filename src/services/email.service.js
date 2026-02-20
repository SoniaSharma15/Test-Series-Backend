import nodemailer from "nodemailer";

let transporter;

/* ================= CREATE TRANSPORTER ONCE ================= */
const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

/* ================= SEND EMAIL ================= */
export const sendEmail = async (
  to,
  subject,
  htmlContent,
  textFallback = ""
) => {
  try {
    const mailTransporter = getTransporter();

    const mailOptions = {
      from: `"Brilliant Test Series" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,      // ✅ HTML Support
      text: textFallback || "Please view this email in HTML supported client.",
    };

    const info = await mailTransporter.sendMail(mailOptions);

 

    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw new Error("Email could not be sent");
  }
};
