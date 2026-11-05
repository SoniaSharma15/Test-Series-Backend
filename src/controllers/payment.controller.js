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


// createOrder -- DISABLED: Razorpay paid enrollment turned off
// All courses use free enrollment via POST /enrollments/free
export const createOrder = async (req, res) => {
  return res.status(503).json({
    success: false,
    message: "Paid enrollment is currently disabled. All courses are free.",
  });
};

export const enrollInFreeSeries = async (req, res, next) => {
  try {
    const { testSeriesId } = req.body;
    const studentId = req.user?._id;

    if (!studentId) {
      const err = new Error("Unauthorized");
      err.statusCode = 401;
      throw err;
    }

    if (!testSeriesId || !mongoose.Types.ObjectId.isValid(testSeriesId)) {
      const err = new Error("Invalid TestSeriesId");
      err.statusCode = 400;
      throw err;
    }

    const testSeries = await TestSeries.findById(testSeriesId);
    if (!testSeries) {
      const err = new Error("Test series not found");
      err.statusCode = 404;
      throw err;
    }

    const upsertPayload = {
      $set: {
        studentId,
        testSeriesId,
        source: "free",
        amount: 0,
        status: "active",
        accessGranted: true,
        purchaseDate: new Date(),
        expiryDate: null,
      },
    };

    try {
      await Enrollment.findOneAndUpdate(
        { studentId, testSeriesId },
        upsertPayload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (upsertErr) {
      if (
        upsertErr.code === 11000 ||
        upsertErr.message?.includes("student_1_batch_1")
      ) {
        try {
          await Enrollment.collection.dropIndex("student_1_batch_1");
        } catch (_) {}
        await Enrollment.findOneAndUpdate(
          { studentId, testSeriesId },
          upsertPayload,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else {
        throw upsertErr;
      }
    }

    await TestSeries.findByIdAndUpdate(testSeriesId, {
      $inc: { totalEnrollments: 1 },
    });

    return res.status(200).json({
      success: true,
      message: "Free enrollment successful",
    });
  } catch (error) {
    next(error);
  }
};

// verifyPayment -- DISABLED: Razorpay payment verification turned off
export const verifyPayment = async (req, res) => {
  return res.status(503).json({
    success: false,
    message: "Paid enrollment is currently disabled. All courses are free.",
  });
};


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

    doc.fillColor(DEEP_NAVY).fontSize(22).font("Helvetica-Bold").text("TEST SERIES PORTAL", 130, 65);
    doc.fontSize(9).font("Helvetica").fillColor(TEXT_LIGHT).text("An Institute for UPSC, BPSC & other PCS Exams", 130, 90);
    doc.fontSize(8).text("Contact: support@testseries.com", 130, 102);

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
    doc.fontSize(9).text("Test Series Portal", 460, sigY + 15);
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
