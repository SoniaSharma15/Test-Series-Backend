import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import { sendEmail } from "../services/email.service.js";
import { chromium } from "playwright";

export const getPaymentHistory = async (req, res) => {
  try {
    const studentId = req.user._id;

    const payments = await Payment.find({
      studentId,
    })
      .populate("testSeriesId", "title price")
      .sort({ createdAt: -1 });

    const result = payments.map((p) => ({
      paymentId: p.paymentId,
      transactionId: p.orderId,
      amount: p.amount,
      status: p.status,
      date: p.createdAt,
      courseName: p.testSeriesId?.title || "N/A",
      coursePrice: p.testSeriesId?.price || p.amount,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const createOrder = async (req, res) => {
  try {
    const { testSeriesId } = req.body;
    const studentId = req.user._id;

    const testSeries = await TestSeries.findById(testSeriesId);

    if (!testSeries) {
      return res.status(404).json({ message: "Test series not found" });
    }

    const alreadyEnrolled = await Enrollment.findOne({
      studentId,
      testSeriesId,
    });

    if (alreadyEnrolled) {
      return res.status(400).json({
        message: "Already enrolled in this test series",
      });
    }

    if (
      testSeries.offerExpiry &&
      new Date(testSeries.offerExpiry) < new Date()
    ) {
      return res.status(400).json({
        message: "Offer has expired",
      });
    }

    // 🔥 GST CALCULATION ADDED HERE
    const basePrice = testSeries.price;
    const gstAmount = basePrice * 0.18;
    const totalAmount = Math.round(basePrice + gstAmount); // rounded final amount

    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // convert to paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};



export const verifyPayment = async (req, res) => {
  try {
    const studentId = req.user._id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      testSeriesId,
    } = req.body;

    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ message: "Payment verification failed" });
    }

    const testSeries = await TestSeries.findById(testSeriesId);

    if (!testSeries) {
      return res.status(404).json({
        message: "Test series not found",
      });
    }

    const alreadyEnrolled = await Enrollment.findOne({
      studentId,
      testSeriesId,
    });

    if (alreadyEnrolled) {
      return res.status(400).json({
        message: "Already enrolled",
      });
    }

    // 🔥 FIXED: Fetch real paid amount from Razorpay
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    const amount = razorpayPayment.amount / 100; // convert paisa to rupees

    await Payment.create({
      studentId,
      testSeriesId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount,
      status: "success",
    });

    // 🔥 expiry = today + duration
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + testSeries.duration);

await Enrollment.create({
  studentId,
  testSeriesId,
  paymentId: razorpay_payment_id,
  amount,
  status: "active",
  source: "payment",
  expiryDate, // ✅ IMPORTANT
});


    await TestSeries.findByIdAndUpdate(
      testSeriesId,
      { $inc: { totalEnrollments: 1 } }
    );

    await sendEmail(
  req.user.email,
  "🎉 Enrollment Confirmed - Payment Successful",
  `
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
              <h2 style="margin:0;font-weight:600;">Payment Successful ✅</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px 28px;color:#374151;">
              
              <p style="margin-top:0;font-size:15px;">
                Hi <strong>${req.user.name || "Student"}</strong>,
              </p>

              <p style="font-size:14px;line-height:1.6;">
                Congratulations! Your payment has been successfully processed and your enrollment is now active.
              </p>

              <!-- Highlight Box -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                          padding:14px 16px;border-radius:10px;margin:22px 0;">
                <div style="font-size:13px;color:#6b7280;">Enrolled Test Series</div>
                <div style="font-size:15px;font-weight:600;color:#15803d;margin-top:4px;">
                  ${testSeries.title}
                </div>
              </div>

              <p style="font-size:14px;line-height:1.6;">
                You can now access your test series from your dashboard and start practicing immediately.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:26px 0;">
                <a href="${process.env.FRONTEND_URL}/student/dashboard"
                  style="background:#16a34a;color:white;padding:12px 22px;
                  text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                  Go to Dashboard
                </a>
              </div>

              <p style="font-size:12px;color:#6b7280;">
                If you did not make this purchase, please contact our support team immediately.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} ${process.env.APP_NAME || "Exam Portal"}.
              All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`
);



    res.json({ message: "Payment successful" });

  } catch (error) {
    console.error("VERIFY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


export const downloadReceipt = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      paymentId,
      studentId,
    }).populate("testSeriesId");

    if (!payment) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    const totalPaid = payment.amount;
    const basePrice = (totalPaid / 1.18).toFixed(2);
    const gstAmount = (totalPaid - basePrice).toFixed(2);
    const invoiceNumber = `INV-${payment.paymentId.slice(-6).toUpperCase()}`;

    // ===============================
    // PREMIUM HTML TEMPLATE
    // ===============================

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; }
body {
  font-family: 'Poppins', sans-serif;
  margin: 0;
  padding: 40px;
  background: #f8fafc;
}
.invoice-container {
  background: #ffffff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.08);
  position: relative;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}
.brand h1 {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
}
.brand span {
  font-size: 12px;
  color: #64748b;
}
.invoice-title {
  text-align: right;
}
.invoice-title h2 {
  margin: 0;
  font-size: 24px;
  color: #1e293b;
}
.meta {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}
.bill-section {
  margin: 30px 0;
}
.bill-section h3 {
  font-size: 14px;
  color: #0f172a;
  margin-bottom: 8px;
}
.bill-info {
  font-size: 13px;
  color: #334155;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 30px;
}
th {
  text-align: left;
  padding: 12px;
  background: #0f172a;
  color: white;
  font-size: 13px;
}
td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
}
.right { text-align: right; }
.total-row {
  background: #1e293b;
  color: white;
  font-weight: 600;
}
.stamp {
  position: absolute;
  top: 50%;
  right: 50px;
  transform: rotate(-25deg);
  font-size: 80px;
  color: rgba(22, 163, 74, 0.08);
  font-weight: 700;
}
.footer {
  margin-top: 60px;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
}
</style>
</head>
<body>
<div class="invoice-container">
<div class="stamp">PAID</div>

<div class="header">
  <div class="brand">
    <h1>The Brilliant Bihar</h1>
    <span>Premium Examination Preparation Platform</span>
  </div>
  <div class="invoice-title">
    <h2>INVOICE</h2>
    <div class="meta">
      Invoice No: ${invoiceNumber}<br/>
      Payment ID: ${payment.paymentId}<br/>
      Order ID: ${payment.orderId}<br/>
      Date: ${new Date(payment.createdAt).toDateString()}
    </div>
  </div>
</div>

<div class="bill-section">
  <h3>BILL TO</h3>
  <div class="bill-info">
    ${req.user.name}<br/>
    ${req.user.email}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th class="right">Amount (₹)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${payment.testSeriesId.title}</td>
      <td class="right">${basePrice}</td>
    </tr>
    <tr>
      <td>GST (18%)</td>
      <td class="right">${gstAmount}</td>
    </tr>
    <tr class="total-row">
      <td>Total Paid</td>
      <td class="right">₹ ${totalPaid}</td>
    </tr>
  </tbody>
</table>

<div class="footer">
Thank you for choosing The Brilliant Bihar.<br/>
This is a digitally generated invoice and does not require signature.
</div>

</div>
</body>
</html>`;

    // ===============================
    // GENERATE PDF WITH PLAYWRIGHT
    // ===============================

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for Railway/VPS
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice-${payment.paymentId}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    return res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

