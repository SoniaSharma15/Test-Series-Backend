import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import { sendEmail } from "../services/email.service.js";
import path from "path";
import PDFDocument from "pdfkit";

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
      courseName: p.testSeriesId?.title || "Batch Expired",
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

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
    });

    res.setHeader("Content-Disposition", `attachment; filename=invoice-${payment.paymentId}.pdf`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // ================= COLORS & BRANDING =================
    const DEEP_NAVY = "#0f172a";
    const ACCENT_BLUE = "#3b82f6";
    const SUCCESS_GREEN = "#10b981";
    const TEXT_LIGHT = "#64748b";
    const BG_SOFT = "#f8fafc";


    
    // Header Background
    doc.rect(0, 0, doc.page.width, 160).fill(DEEP_NAVY);

    // Brand Title
    doc
      .fillColor("#ffffff")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("The Brilliant Bihar", 50, 50);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(ACCENT_BLUE)
      .text("Official Academic Transaction Receipt", 50, 85, { characterSpacing: 1 });

// ================= STATUS ICON (loader.png) =================
const statusIconPath = path.join(process.cwd(), "src", "assets", "loader.png");
// image size (circle ke approx barabar)
const iconSize = 55;

// exact wahi jagah jahan green circle tha
const iconX = 520 - iconSize / 2;
const iconY = 70 - iconSize / 2;

try {
  doc.save();
  doc.opacity(0.99); // clear & visible
  doc.image(statusIconPath, iconX, iconY, {
    width: iconSize,
    height: iconSize,
  });
  doc.restore();
} catch (e) {
  
}


    // ================= DESCRIPTIVE INFO PANEL =================
    doc.rect(50, 180, 500, 100).fill(BG_SOFT);
    
    // LEFT: Billing To
    doc
      .fillColor(TEXT_LIGHT)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("STUDENT DETAILS", 70, 200);

    doc
      .fillColor(DEEP_NAVY)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(req.user.name.toUpperCase(), 70, 215)
      .fontSize(10)
      .font("Helvetica")
      .text(req.user.email, 70, 230);

    // RIGHT: Invoice Meta
    doc
      .fillColor(TEXT_LIGHT)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("INVOICE SUMMARY", 350, 200);

    doc
      .fillColor(DEEP_NAVY)
      .fontSize(10)
      .font("Helvetica")
      .text(`Invoice Number: ${invoiceNumber}`, 350, 215)
      .text(`Date: ${new Date(payment.createdAt).toLocaleDateString("en-IN")}`, 350, 230)
      .text(`Order ID: ${payment.orderId}`, 350, 245);
// ================= PAGE WATERMARK =================
const watermarkPath = path.join(process.cwd(), "src", "assets", "loader.png");

try {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  doc.save();

  // 👇 very light opacity (perfect watermark)
  doc.opacity(0.2);

  // 👇 center me large watermark
  const wmSize = 420;
  doc.image(
    watermarkPath,
    (pageWidth - wmSize) / 2,
    (pageHeight - wmSize) / 2,
    {
      width: wmSize,
      height: wmSize,
    }
  );

  doc.restore();
} catch (err) {
  
}
    // ================= PRODUCT DESCRIPTION SECTION =================
    doc.moveDown(8);
    
    doc
      .fillColor(DEEP_NAVY)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("ENROLLED SERVICE DESCRIPTION", 50, doc.y);

    doc.rect(50, doc.y + 5, 500, 2).fill(ACCENT_BLUE);

    const tableTop = doc.y + 20;

    // Item Header
    doc
      .fillColor(TEXT_LIGHT)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("PARTICULARS", 50, tableTop)
      .text("AMOUNT (INR)", 450, tableTop, { align: "right", width: 100 });

    // Item Content
    doc
      .fillColor(DEEP_NAVY)
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(payment.testSeriesId.title, 50, tableTop + 25);

    doc
      .fillColor(TEXT_LIGHT)
      .fontSize(9)
      .font("Helvetica")
      .text("Full Access to Test Modules, Performance Analytics, and Detailed Solutions.", 50, tableTop + 45);

    doc
      .fillColor(DEEP_NAVY)
      .fontSize(12)
      .text(basePrice, 450, tableTop + 25, { align: "right", width: 100 });

    // ================= FINANCIAL BREAKDOWN =================
    const summaryY = tableTop + 100;

   doc
  .save()
  .lineWidth(0.7)                 // thinner border
  .strokeColor("#000000")
  .rect(320, summaryY, 230, 120)
  .stroke()
  .restore();

    const drawRow = (label, value, y, isBold = false) => {
      doc
        .fillColor(isBold ? DEEP_NAVY : TEXT_LIGHT)
        .fontSize(isBold ? 12 : 10)
        .font(isBold ? "Helvetica-Bold" : "Helvetica")
        .text(label, 340, y)
        .text(value, 450, y, { align: "right", width: 90 });
    };

    drawRow("Sub-Total", basePrice, summaryY + 20);
    drawRow("Tax (GST 18%)", gstAmount, summaryY + 45);
    
    doc
  .save()
  .opacity(0.6)
  .rect(340, summaryY + 70, 200, 0.8)
  .fill("#000000") 
  .restore();
    drawRow("Total Amount", totalPaid, summaryY + 85, true);

    // ================= SECURE VERIFICATION =================
    const footerTop = 650;

    doc.rect(50, footerTop, 200, 80).fill(BG_SOFT);
    
    doc
      .fillColor(SUCCESS_GREEN)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("✓ PAYMENT VERIFIED SECURE", 70, footerTop + 20);

    doc
      .fillColor(DEEP_NAVY)
      .fontSize(7)
      .font("Helvetica")
      .text("Transaction completed via encrypted gateway.", 70, footerTop + 35)
      .text(`Gateway Ref: ${payment.paymentId}`, 70, footerTop + 45);

    // ================= FOOTER =================
    doc
      .fillColor(TEXT_LIGHT)
      .fontSize(8)
      .text("The Brilliant Bihar - Empowering Future Success", 0, 780, { align: "center", width: doc.page.width })
      .text("This is a digitally signed document. No physical signature required. Currency: INR", 0, 792, { align: "center", width: doc.page.width });

    doc.end();

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

