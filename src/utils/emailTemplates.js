const FRONTEND_URL = process.env.FRONTEND_URL;
const currentYear = new Date().getFullYear();

/* ======================================================
   REGISTRATION TEMPLATE
====================================================== */

export const registrationTemplate = (name) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;">
    <tr>
      <td align="center">

        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:25px;text-align:center;color:white;">
              <h2 style="margin:0;font-weight:600;">Welcome to Brilliant Test Series 🎉</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px 28px;color:#374151;">
              <p style="margin-top:0;font-size:15px;">Hi <strong>${name}</strong>,</p>

              <p style="font-size:14px;line-height:1.6;">
                Your account has been successfully created. You can now access your dashboard and start your preparation journey.
              </p>

              <div style="text-align:center;margin:25px 0;">
                <a href="${FRONTEND_URL}/login"
                  style="background:#2563eb;color:white;padding:12px 22px;
                  text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                  Login to Dashboard
                </a>
              </div>

              <p style="font-size:12px;color:#6b7280;">
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
              © ${currentYear} Brilliant Test Series. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;



export const resetPasswordTemplate = (name, resetLink) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;">
    <tr>
      <td align="center">

        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">

          <tr>
            <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:25px;text-align:center;color:white;">
              <h2 style="margin:0;font-weight:600;">Password Reset Request 🔐</h2>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 28px;color:#374151;">
              <p style="margin-top:0;font-size:15px;">Hi <strong>${name}</strong>,</p>

              <p style="font-size:14px;line-height:1.6;">
                We received a request to reset your password. This link will expire in <strong>15 minutes</strong>.
              </p>

              <div style="text-align:center;margin:25px 0;">
                <a href="${resetLink}"
                  style="background:#dc2626;color:white;padding:12px 22px;
                  text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                  Reset Password
                </a>
              </div>

              <p style="font-size:12px;color:#6b7280;">
                If you didn’t request this, please ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
              © ${currentYear} Brilliant Test Series
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;



export const courseAssignedTemplate = ({
  name,
  email,
  courseTitle,
}) => {
  return `
  <div style="font-family:Arial;background:#f4f6f9;padding:40px;">
    <div style="max-width:650px;margin:auto;background:white;padding:40px;border-radius:12px;">
      
      <h2 style="color:#16a34a;">🎓 New Course Assigned</h2>

      <p>Hello <strong>${name}</strong>,</p>

      <p>An administrator has granted you access to a new course. Below are your course details:</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:8px;font-weight:bold;">Login Email:</td>
          <td style="padding:8px;">${email}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">Course Name:</td>
          <td style="padding:8px;">${courseTitle}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">Access Type:</td>
          <td style="padding:8px;">Admin Granted</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">Status:</td>
          <td style="padding:8px;color:#16a34a;font-weight:bold;">Active</td>
        </tr>
      </table>

      <div style="margin:30px 0;">
          <a href="${FRONTEND_URL}/login"
          style="background:#16a34a;color:white;padding:12px 25px;
          text-decoration:none;border-radius:6px;font-weight:bold;">
          Go To Dashboard
        </a>
      </div>

      <p style="font-size:13px;color:#555;">
        You can now login and start attempting tests.
      </p>

      <hr style="margin:30px 0;" />

      <p style="font-size:12px;color:#999;">
        © ${new Date().getFullYear()} Brilliant Test Series
      </p>

    </div>
  </div>
  `;
};



export const adminCreatedAccountTemplate = ({
  name,
  email,
  password,
  role,
  courseTitle,
}) => {
  return `
  <div style="font-family:Arial;background:#f4f6f9;padding:40px;">
    <div style="max-width:650px;margin:auto;background:white;padding:40px;border-radius:12px;">
      
      <h2 style="color:#2563eb;">🎉 Your Account Has Been Created</h2>

      <p>Hello <strong>${name}</strong>,</p>

      <p>An administrator has created your account with the following details:</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:8px;font-weight:bold;">Login Email:</td>
          <td style="padding:8px;">${email}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">Temporary Password:</td>
          <td style="padding:8px;">${password}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">Role:</td>
          <td style="padding:8px;text-transform:capitalize;">${role}</td>
        </tr>
        ${courseTitle
      ? `
        <tr>
          <td style="padding:8px;font-weight:bold;">Assigned Course:</td>
          <td style="padding:8px;">${courseTitle}</td>
        </tr>`
      : ""
    }
      </table>

      <div style="margin:30px 0;">
          <a href="${FRONTEND_URL}/login"
          style="background:#2563eb;color:white;padding:12px 25px;
          text-decoration:none;border-radius:6px;font-weight:bold;">
          Login Now
        </a>
      </div>

      <p style="color:#dc2626;font-size:13px;">
        ⚠ For security reasons, please change your password after first login.
      </p>

      <hr style="margin:30px 0;" />

      <p style="font-size:12px;color:#999;">
        © ${new Date().getFullYear()} Brilliant Test Series
      </p>

    </div>
  </div>
  `;
};

export const adminPasswordChangedTemplate = ({
  name,
  email,
  newPassword,
}) => {
  return `
  <div style="font-family:Arial;background:#f4f6f9;padding:40px;">
    <div style="max-width:650px;margin:auto;background:white;padding:40px;border-radius:12px;">
      
      <h2 style="color:#dc2626;">🔐 Your Password Has Been Updated</h2>

      <p>Hello <strong>${name}</strong>,</p>

      <p>An administrator has changed your account password. Below are your updated login details:</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:8px;font-weight:bold;">Login Email:</td>
          <td style="padding:8px;">${email}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">New Password:</td>
          <td style="padding:8px;">${newPassword}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;">Updated On:</td>
          <td style="padding:8px;">${new Date().toLocaleString()}</td>
        </tr>
      </table>

      <div style="margin:30px 0;">
          <a href="${FRONTEND_URL}/login"
          style="background:#dc2626;color:white;padding:12px 25px;
          text-decoration:none;border-radius:6px;font-weight:bold;">
          Login Now
        </a>
      </div>

      <p style="color:#dc2626;font-size:13px;">
        ⚠ For security reasons, please change your password after login.
      </p>

      <hr style="margin:30px 0;" />

      <p style="font-size:12px;color:#999;">
        If you did not request this change, contact support immediately.
      </p>

      <p style="font-size:12px;color:#bbb;">
        © ${new Date().getFullYear()} Brilliant Test Series
      </p>

    </div>
  </div>
  `;
};

