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
}) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;">
    <tr>
      <td align="center">

        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:25px;text-align:center;color:white;">
              <h2 style="margin:0;font-weight:600;">🎓 New Course Assigned</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px;color:#374151;">

              <p style="margin-top:0;font-size:15px;">
                Hello <strong>${name}</strong>,
              </p>

              <p style="font-size:14px;line-height:1.6;margin-bottom:20px;">
                An administrator has granted you access to a new course. 
                Here are your course details:
              </p>

              <!-- Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;margin-bottom:20px;">
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#111827;">Login Email:</td>
                  <td style="padding:8px 0;color:#374151;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#111827;">Course Name:</td>
                  <td style="padding:8px 0;color:#374151;">${courseTitle}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#111827;">Access Type:</td>
                  <td style="padding:8px 0;color:#374151;">Admin Granted</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#111827;">Status:</td>
                  <td style="padding:8px 0;color:#16a34a;font-weight:600;">Active</td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin:25px 0;">
                <a href="${FRONTEND_URL}/login"
                  style="background:#16a34a;color:white;padding:12px 22px;
                  text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                  Go To Dashboard
                </a>
              </div>

              <p style="font-size:12px;color:#6b7280;margin-bottom:0;">
                You can now login and start attempting tests.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} Brilliant Test Series. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;



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
}) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;">
    <tr>
      <td align="center">

        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:25px;text-align:center;color:white;">
              <h2 style="margin:0;font-weight:600;">🔐 Password Updated Successfully</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px;color:#374151;">

              <p style="margin-top:0;font-size:15px;">
                Hello <strong>${name}</strong>,
              </p>

              <p style="font-size:14px;line-height:1.6;margin-bottom:20px;">
                An administrator has updated your account password. 
                Please review your updated login details below:
              </p>

              <!-- Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;margin-bottom:20px;">
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#111827;">Login Email:</td>
                  <td style="padding:8px 0;color:#374151;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#111827;">New Password:</td>
                  <td style="padding:8px 0;color:#dc2626;font-weight:600;">${newPassword}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#111827;">Updated On:</td>
                  <td style="padding:8px 0;color:#374151;">
                    ${new Date().toLocaleString()}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin:25px 0;">
                <a href="${FRONTEND_URL}/login"
                  style="background:#dc2626;color:white;padding:12px 22px;
                  text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                  Login Now
                </a>
              </div>

              <!-- Security Warning Box -->
              <div style="background:#fef2f2;border:1px solid #fecaca;padding:14px;border-radius:8px;margin-bottom:18px;">
                <p style="margin:0;font-size:13px;color:#b91c1c;font-weight:600;">
                  ⚠ For security reasons, please change your password immediately after logging in.
                </p>
              </div>

              <p style="font-size:12px;color:#6b7280;margin-bottom:0;">
                If you did not request or expect this change, please contact support immediately.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} Brilliant Test Series. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

export const paymentSuccessTemplate = ({
  name,
  courseTitle,
  frontendUrl,
  appName,
}) => {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;">
    <tr>
      <td align="center">

        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">

          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:25px;text-align:center;color:white;">
              <h2 style="margin:0;font-weight:600;">Payment Successful ✅</h2>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 28px;color:#374151;">
              
              <p style="margin-top:0;font-size:15px;">
                Hi <strong>${name || "Student"}</strong>,
              </p>

              <p style="font-size:14px;line-height:1.6;">
                Your payment has been successfully processed and your enrollment is now active.
              </p>

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                          padding:14px 16px;border-radius:10px;margin:22px 0;">
                <div style="font-size:13px;color:#6b7280;">Enrolled Test Series</div>
                <div style="font-size:15px;font-weight:600;color:#15803d;margin-top:4px;">
                  ${courseTitle}
                </div>
              </div>

              <div style="text-align:center;margin:26px 0;">
                <a href="${frontendUrl}/student/dashboard"
                  style="background:#16a34a;color:white;padding:12px 22px;
                  text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                  Go to Dashboard
                </a>
              </div>

              <p style="font-size:12px;color:#6b7280;">
                If you did not make this purchase, please contact support immediately.
              </p>

            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} ${appName || "Exam Portal"}.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};

