import mongoose from "mongoose";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Enrollment from "../models/Enrollment.js";
import TestSeries from "../models/TestSeries.js";
import { sendEmail } from "../services/email.service.js";
import { paymentSuccessTemplate } from "../utils/emailTemplates.js";
import path from "path";
import PDFDocument from "pdfkit";

export const getPaymentHistory = async (req, res, next) => {
  try {
    const studentId = req.user?._id;

    /* ================= AUTH CHECK ================= */

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    /* ================= FETCH PAYMENTS ================= */

    const payments = await Payment.find({ studentId })
      .populate("testSeriesId", "title price")
      .sort({ createdAt: -1 });

    if (!payments.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    /* ================= TRANSFORM RESPONSE ================= */

    const result = payments.map((p) => ({
      paymentId: p.paymentId,
      transactionId: p.orderId,
      amount: Number(p.amount) || 0,
      status: p.status,
      date: p.createdAt,
      courseName: p.testSeriesId?.title || "Batch Expired",
      coursePrice:
        Number(p.testSeriesId?.price) || Number(p.amount) || 0,
    }));

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });

  } catch (error) {
    next(error);
  }
};


export const createOrder = async (req, res, next) => {
  try {
    const { testSeriesId } = req.body;
    const studentId = req.user?._id;

    /* ================= AUTH CHECK ================= */

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    if (!testSeriesId) {
      const err = new Error("TestSeriesId is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(testSeriesId)) {
      const err = new Error("Invalid TestSeriesId");
      err.statusCode = 400;
      throw err;
    }

    if (!process.env.RAZORPAY_KEY_ID) {
      const err = new Error("Payment configuration error");
      err.statusCode = 500;
      throw err;
    }

    /* ================= FETCH TEST SERIES ================= */

    const testSeries = await TestSeries.findById(testSeriesId);

    if (!testSeries) {
      const err = new Error("Test series not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= DUPLICATE CHECK ================= */

    const alreadyEnrolled = await Enrollment.findOne({
      studentId,
      testSeriesId,
    });

    if (alreadyEnrolled) {
      const err = new Error("Already enrolled in this test series");
      err.statusCode = 409;
      throw err;
    }

    /* ================= OFFER EXPIRY CHECK ================= */

    if (
      testSeries.offerExpiry &&
      new Date(testSeries.offerExpiry) < new Date()
    ) {
      const err = new Error("Offer has expired");
      err.statusCode = 400;
      throw err;
    }

    /* ================= PRICE CALCULATION (SERVER SIDE) ================= */

    const basePrice = Number(testSeries.price) || 0;

    if (basePrice <= 0) {
      const err = new Error("Invalid course price");
      err.statusCode = 400;
      throw err;
    }

    const gstAmount = basePrice * 0.18;
    const totalAmount = Math.round(basePrice + gstAmount);

    /* ================= CREATE RAZORPAY ORDER ================= */

    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // convert to paisa
      currency: "INR",
      receipt: `rcpt_${studentId.toString().slice(-6)}_${Date.now()}`,
    });

    /* ================= RESPONSE ================= */

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });

  } catch (error) {
    next(error);
  }
};


export const verifyPayment = async (req, res, next) => {
  try {
    const studentId = req.user?._id;

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      testSeriesId,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !testSeriesId
    ) {
      const err = new Error("Invalid payment payload");
      err.statusCode = 400;
      throw err;
    }

    /* ================= SIGNATURE VERIFY ================= */

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      const err = new Error("Payment verification failed");
      err.statusCode = 400;
      throw err;
    }

    /* ================= FETCH TEST SERIES ================= */

    const testSeries = await TestSeries.findById(testSeriesId);

    if (!testSeries) {
      const err = new Error("Test series not found");
      err.statusCode = 404;
      throw err;
    }

    /* ================= DUPLICATE CHECK ================= */

    const alreadyEnrolled = await Enrollment.findOne({
      studentId,
      testSeriesId,
    });

    if (alreadyEnrolled) {
      return res.status(200).json({
        success: true,
        message: "Already enrolled",
      });
    }

    /* ================= FETCH ACTUAL PAYMENT ================= */

    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    const amount = razorpayPayment.amount / 100;

    /* ================= SAVE PAYMENT ================= */

    await Payment.create({
      studentId,
      testSeriesId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount,
      status: "success",
    });

    /* ================= CREATE ENROLLMENT ================= */

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + testSeries.duration);

    await Enrollment.create({
      studentId,
      testSeriesId,
      paymentId: razorpay_payment_id,
      amount,
      status: "active",
      source: "payment",
      expiryDate,
    });

    await TestSeries.findByIdAndUpdate(testSeriesId, {
      $inc: { totalEnrollments: 1 },
    });

    /* ================= SEND EMAIL ================= */

    try {
      await sendEmail(
        req.user.email,
        "🎉 Enrollment Confirmed - Payment Successful",
        paymentSuccessTemplate({
          name: req.user.name,
          courseTitle: testSeries.title,
          frontendUrl: process.env.FRONTEND_URL,
          appName: process.env.APP_NAME,
        })
      );
    } catch (emailError) {
      console.error("Payment email failed:", emailError.message);
    }

    res.status(200).json({
      success: true,
      message: "Payment successful",
    });

  } catch (error) {
    next(error);
  }
};


// export const downloadReceipt = async (req, res) => {
//   try {
//     const studentId = req.user._id;
//     const { paymentId } = req.params;

//     const payment = await Payment.findOne({
//       paymentId,
//       studentId,
//     }).populate("testSeriesId");

//     if (!payment) {
//       return res.status(404).json({ message: "Receipt not found" });
//     }
//     if (!payment.testSeriesId) {
//       return res.status(410).json({
//         message: "Test series no longer available"
//       });
//     }

//     const totalPaid = payment.amount;
//     const basePrice = (totalPaid / 1.18).toFixed(2);
//     const gstAmount = (totalPaid - basePrice).toFixed(2);
//     const invoiceNumber = `INV-${payment.paymentId.slice(-6).toUpperCase()}`;

//     const doc = new PDFDocument({
//       size: "A4",
//       margin: 0,
//     });

//     res.setHeader("Content-Disposition", `attachment; filename=invoice-${payment.paymentId}.pdf`);
//     res.setHeader("Content-Type", "application/pdf");

//     doc.pipe(res);

//     // ================= COLORS & BRANDING =================
//     const DEEP_NAVY = "#0f172a";
//     const ACCENT_BLUE = "#3b82f6";
//     const SUCCESS_GREEN = "#10b981";
//     const TEXT_LIGHT = "#64748b";
//     const BG_SOFT = "#f8fafc";



//     // Header Background
//     doc.rect(0, 0, doc.page.width, 160).fill(DEEP_NAVY);

//     // Brand Title
//     doc
//       .fillColor("#ffffff")
//       .fontSize(28)
//       .font("Helvetica-Bold")
//       .text("The Brilliant Bihar", 50, 50);

//     doc
//       .fontSize(10)
//       .font("Helvetica")
//       .fillColor(ACCENT_BLUE)
//       .text("Official Academic Transaction Receipt", 50, 85, { characterSpacing: 1 });

//     // ================= STATUS ICON (loader.png) =================
//     const statusIconPath = path.join(process.cwd(), "src", "assets", "loader.png");
//     // image size (circle ke approx barabar)
//     const iconSize = 55;

//     // exact wahi jagah jahan green circle tha
//     const iconX = 520 - iconSize / 2;
//     const iconY = 70 - iconSize / 2;

//     try {
//       doc.save();
//       doc.opacity(0.99); // clear & visible
//       doc.image(statusIconPath, iconX, iconY, {
//         width: iconSize,
//         height: iconSize,
//       });
//       doc.restore();
//     } catch (e) {

//     }


//     // ================= DESCRIPTIVE INFO PANEL =================
//     doc.rect(50, 180, 500, 100).fill(BG_SOFT);

//     // LEFT: Billing To
//     doc
//       .fillColor(TEXT_LIGHT)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text("STUDENT DETAILS", 70, 200);

//     doc
//       .fillColor(DEEP_NAVY)
//       .fontSize(12)
//       .font("Helvetica-Bold")
//       .text(req.user.name.toUpperCase(), 70, 215)
//       .fontSize(10)
//       .font("Helvetica")
//       .text(req.user.email, 70, 230);

//     // RIGHT: Invoice Meta
//     doc
//       .fillColor(TEXT_LIGHT)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text("INVOICE SUMMARY", 350, 200);

//     doc
//       .fillColor(DEEP_NAVY)
//       .fontSize(10)
//       .font("Helvetica")
//       .text(`Invoice Number: ${invoiceNumber}`, 350, 215)
//       .text(`Date: ${new Date(payment.createdAt).toLocaleDateString("en-IN")}`, 350, 230)
//       .text(`Order ID: ${payment.orderId}`, 350, 245);
//     // ================= PAGE WATERMARK =================
//     const watermarkPath = path.join(process.cwd(), "src", "assets", "loader.png");

//     try {
//       const pageWidth = doc.page.width;
//       const pageHeight = doc.page.height;

//       doc.save();

//       // 👇 very light opacity (perfect watermark)
//       doc.opacity(0.2);

//       // 👇 center me large watermark
//       const wmSize = 420;
//       doc.image(
//         watermarkPath,
//         (pageWidth - wmSize) / 2,
//         (pageHeight - wmSize) / 2,
//         {
//           width: wmSize,
//           height: wmSize,
//         }
//       );

//       doc.restore();
//     } catch (err) {

//     }
//     // ================= PRODUCT DESCRIPTION SECTION =================
//     doc.moveDown(8);

//     doc
//       .fillColor(DEEP_NAVY)
//       .fontSize(11)
//       .font("Helvetica-Bold")
//       .text("ENROLLED SERVICE DESCRIPTION", 50, doc.y);

//     doc.rect(50, doc.y + 5, 500, 2).fill(ACCENT_BLUE);

//     const tableTop = doc.y + 20;

//     // Item Header
//     doc
//       .fillColor(TEXT_LIGHT)
//       .fontSize(9)
//       .font("Helvetica-Bold")
//       .text("PARTICULARS", 50, tableTop)
//       .text("AMOUNT (INR)", 450, tableTop, { align: "right", width: 100 });

//     // Item Content
//     doc
//       .fillColor(DEEP_NAVY)
//       .fontSize(13)
//       .font("Helvetica-Bold")
//       .text(payment.testSeriesId.title, 50, tableTop + 25);

//     doc
//       .fillColor(TEXT_LIGHT)
//       .fontSize(9)
//       .font("Helvetica")
//       .text("Full Access to Test Modules, Performance Analytics, and Detailed Solutions.", 50, tableTop + 45);

//     doc
//       .fillColor(DEEP_NAVY)
//       .fontSize(12)
//       .text(basePrice, 450, tableTop + 25, { align: "right", width: 100 });

//     // ================= FINANCIAL BREAKDOWN =================
//     const summaryY = tableTop + 100;

//     doc
//       .save()
//       .lineWidth(0.7)                 // thinner border
//       .strokeColor("#000000")
//       .rect(320, summaryY, 230, 120)
//       .stroke()
//       .restore();

//     const drawRow = (label, value, y, isBold = false) => {
//       doc
//         .fillColor(isBold ? DEEP_NAVY : TEXT_LIGHT)
//         .fontSize(isBold ? 12 : 10)
//         .font(isBold ? "Helvetica-Bold" : "Helvetica")
//         .text(label, 340, y)
//         .text(value, 450, y, { align: "right", width: 90 });
//     };

//     drawRow("Sub-Total", basePrice, summaryY + 20);
//     drawRow("Tax (GST 18%)", gstAmount, summaryY + 45);

//     doc
//       .save()
//       .opacity(0.6)
//       .rect(340, summaryY + 70, 200, 0.8)
//       .fill("#000000")
//       .restore();
//     drawRow("Total Amount", totalPaid, summaryY + 85, true);

//     // ================= SECURE VERIFICATION =================
//     const footerTop = 650;

//     doc.rect(50, footerTop, 200, 80).fill(BG_SOFT);

//     doc
//       .fillColor(SUCCESS_GREEN)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text("✓ PAYMENT VERIFIED SECURE", 70, footerTop + 20);

//     doc
//       .fillColor(DEEP_NAVY)
//       .fontSize(7)
//       .font("Helvetica")
//       .text("Transaction completed via encrypted gateway.", 70, footerTop + 35)
//       .text(`Gateway Ref: ${payment.paymentId}`, 70, footerTop + 45);

//     // ================= FOOTER =================
//     doc
//       .fillColor(TEXT_LIGHT)
//       .fontSize(8)
//       .text("The Brilliant Bihar - Empowering Future Success", 0, 780, { align: "center", width: doc.page.width })
//       .text("This is a digitally signed document. No physical signature required. Currency: INR", 0, 792, { align: "center", width: doc.page.width });

//     doc.end();

//   } catch (error) {
//     console.error("PDF Generation Error:", error);

//     if (!res.headersSent) {
//       return res.status(500).json({
//         message: "Invoice generation failed"
//       });
//     }
//   }
// };

export const downloadReceipt = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      paymentId,
      studentId,
    }).populate("testSeriesId");

    if (!payment) return res.status(404).json({ message: "Receipt not found" });
    if (!payment.testSeriesId) return res.status(410).json({ message: "Test series no longer available" });

    const totalPaid = Math.round(payment.amount);
    const basePrice = Math.round(totalPaid / 1.18);
    const gstAmount = totalPaid - basePrice;

    const invoiceNumber = `TBB/ACAD/${new Date().getFullYear()}/${payment.paymentId.slice(-6).toUpperCase()}`;

    const doc = new PDFDocument({ size: "A4", margin: 0 });

    res.setHeader("Content-Disposition", `attachment; filename=Receipt-${payment.paymentId}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // ================= COLORS =================
    const DEEP_NAVY = "#0f172a";
    const GOVT_BLUE = "#1e40af";
    const TEXT_MAIN = "#1e293b";
    const TEXT_LIGHT = "#64748b";
    const BORDER_COLOR = "#cbd5e1";
    const BG_SOFT = "#f8fafc";

    // 2. MAIN HEADER
    const logoPath = path.join(process.cwd(), "src", "assets", "loader.png");
    try {
      doc.image(logoPath, 50, 60, { width: 60 });
    } catch (e) {}

    doc.fillColor(DEEP_NAVY).fontSize(22).font("Helvetica-Bold").text("THE BRILLIANT BIHAR", 130, 65);
    doc.fontSize(9).font("Helvetica").fillColor(TEXT_LIGHT).text("An Institute for UPSC, BPSC & other PCS Exams", 130, 90);
    doc.fontSize(8).text("Regd Office: Patna, Bihar | Contact: support@thebrilliantbihar.com", 130, 102);

    // 3. INVOICE TYPE BADGE
    doc.rect(430, 65, 120, 20).fill("#f1f5f9");
    doc.fillColor(GOVT_BLUE).fontSize(8).font("Helvetica-Bold").text("Digial Receipt", 435, 71, { width: 110, align: "center" });

    // 4. METADATA GRID
    doc.rect(50, 130, 500, 45).strokeColor(BORDER_COLOR).lineWidth(1).stroke();
    doc.moveTo(300, 130).lineTo(300, 175).stroke();

    doc.fillColor(TEXT_LIGHT).fontSize(7).font("Helvetica-Bold");
    doc.text("RECEIPT / INVOICE NUMBER", 60, 140);
    doc.text("DATE OF ISSUE", 310, 140);

    doc.fillColor(TEXT_MAIN).fontSize(10).text(invoiceNumber, 60, 155);
    doc.text(new Date(payment.createdAt).toLocaleString("en-IN"), 310, 155);

   // 5. BILLING SECTION — FIXED ALIGNMENT

doc.rect(50, 190, 500, 110).fill(BG_SOFT); // ⬅ increased height

doc.fillColor(GOVT_BLUE)
  .fontSize(9)
  .font("Helvetica-Bold")
  .text("CANDIDATE DETAILS", 70, 205);

doc.fillColor(TEXT_MAIN)
  .fontSize(11)
  .font("Helvetica")
  .text(req.user.name.toUpperCase(), 70, 225);

doc.fillColor(TEXT_LIGHT)
  .fontSize(9)
  .font("Helvetica")
  .text(`Email: ${req.user.email}`, 70, 242);

doc.text(`Mobile: ${req.user.mobile}`, 70, 257);

doc.text(`Transaction ID: ${payment.paymentId}`, 70, 272);

    // 6. WATERMARK
    try {
      doc.save().opacity(0.06);
      doc.image(logoPath, (doc.page.width - 400) / 2, (doc.page.height - 400) / 2, { width: 400 });
      doc.restore();
    } catch (err) {}

    // 7. PARTICULARS TABLE
    const tableTop = 300;
    doc.rect(50, tableTop, 500, 25).fill(GOVT_BLUE);
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("SR NO.", 60, tableTop + 8);
    doc.text("DESCRIPTION OF SERVICE", 110, tableTop + 8);
    doc.text("AMOUNT", 450, tableTop + 8, { align: "right", width: 90 });

    doc.fillColor(TEXT_MAIN).fontSize(10).font("Helvetica");
    doc.text("01.", 60, tableTop + 40);
    doc.font("Helvetica-Bold").text(payment.testSeriesId.title, 110, tableTop + 40);
    doc.font("Helvetica").fontSize(8).text("E-Learning Test Series (UPSC/BPSC Specialized)", 110, tableTop + 55, { width: 220 });
    doc.text(`Rs. ${basePrice}`, 450, tableTop + 40, { align: "right", width: 90 });

    // 8. FINANCIAL SUMMARY
    const summaryY = 460;
    doc.lineCap('butt').moveTo(320, summaryY).lineTo(550, summaryY).stroke(BORDER_COLOR);

    const drawRow = (label, value, y, isBold = false) => {
      doc.fillColor(isBold ? DEEP_NAVY : TEXT_LIGHT)
        .fontSize(isBold ? 11 : 9)
        .font(isBold ? "Helvetica-Bold" : "Helvetica");
      doc.text(label, 320, y);
      doc.text(`Rs. ${value}`, 450, y, { align: "right", width: 90 });
    };

    drawRow("Taxable Value", basePrice, summaryY + 15);
    drawRow("CGST (9%)", Math.round(gstAmount / 2), summaryY + 35);
    drawRow("SGST (9%)", Math.round(gstAmount / 2), summaryY + 55);

    doc.rect(320, summaryY + 75, 230, 30).fill(GOVT_BLUE);
    doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold").text("Total Paid", 330, summaryY + 85);
    doc.text(`Rs. ${totalPaid}`, 450, summaryY + 85, { align: "right", width: 90 });

    // 9. SIGNATURE SECTION
    const sigY = 620;
    doc.fillColor(TEXT_MAIN).fontSize(8).font("Helvetica-Bold").text("Digitally Signed By:", 460, sigY);
    doc.fontSize(9).text("The Brilliant Bihar", 460, sigY + 15);
    doc.fontSize(7).font("Helvetica").fillColor(TEXT_LIGHT).text("Authorized Signatory", 460, sigY + 28);

    // 10. TERMS & CONDITIONS
    doc.rect(50, 710, 500, 60).strokeColor(BORDER_COLOR).stroke();
    doc.fillColor(TEXT_MAIN).fontSize(7).font("Helvetica-Bold").text("TERMS & DISCLAIMERS:", 60, 720);
    doc.font("Helvetica").fillColor(TEXT_LIGHT).text("1. This is a computer-generated receipt and does not require a physical signature.", 60, 732);
    doc.text("2. Fees once paid are non-refundable and non-transferable under any circumstances.", 60, 742);
    doc.text("3. This receipt is valid only subject to successful realization of payment from the gateway.", 60, 752);

    const footerTime = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    doc.fontSize(8).fillColor(TEXT_LIGHT)
      .text("System-generated Invoice | Time: " + footerTime, 0, 790, { align: "center" });

    doc.end();

  } catch (error) {
    console.error("Receipt Alignment Error:", error);
    if (!res.headersSent) res.status(500).json({ message: "Invoice generation failed" });
  }
};

