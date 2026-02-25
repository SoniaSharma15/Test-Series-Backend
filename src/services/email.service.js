import nodemailer from "nodemailer";

let transporter;

/* ================= CREATE TRANSPORTER ONCE ================= */
const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials are not configured properly");
  }

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
  if (!to || !subject || !htmlContent) {
    const err = new Error("Invalid email parameters");
    err.statusCode = 400;
    throw err;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    const err = new Error("Invalid recipient email");
    err.statusCode = 400;
    throw err;
  }

  try {
    const mailTransporter = getTransporter();

    const mailOptions = {
      from: `"Brilliant Test Series" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      text:
        textFallback ||
        "Please view this email in an HTML supported email client.",
    };

    await mailTransporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    const err = new Error("Email could not be sent");
    err.statusCode = 500;
    throw err;
  }
};






// import sgMail from "@sendgrid/mail";

// let isInitialized = false;

// /* ================= INITIALIZE SENDGRID ONCE ================= */
// const initSendGrid = () => {
//   if (isInitialized) return;

//   if (!process.env.SENDGRID_API_KEY) {
//     throw new Error("SendGrid API key is not configured properly");
//   }

//   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//   isInitialized = true;
// };

// /* ================= SEND EMAIL ================= */
// export const sendEmail = async (
//   to,
//   subject,
//   htmlContent,
//   textFallback = ""
// ) => {
//   if (!to || !subject || !htmlContent) {
//     const err = new Error("Invalid email parameters");
//     err.statusCode = 400;
//     throw err;
//   }

//   // Basic email validation
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   if (!emailRegex.test(to)) {
//     const err = new Error("Invalid recipient email");
//     err.statusCode = 400;
//     throw err;
//   }

//   try {
//     initSendGrid();

//     const msg = {
//       to,
//       from: {
//         email: process.env.EMAIL_FROM, // must be verified in SendGrid
//         name: "Brilliant Test Series",
//       },
//       subject,
//       html: htmlContent,
//       text:
//         textFallback ||
//         "Please view this email in an HTML supported email client.",
//     };

//     await sgMail.send(msg);

//     return true;
//   } catch (error) {
//     console.error(
//       "❌ SendGrid Email Error:",
//       error.response?.body || error.message
//     );

//     const err = new Error("Email could not be sent");
//     err.statusCode = 500;
//     throw err;
//   }
// };
