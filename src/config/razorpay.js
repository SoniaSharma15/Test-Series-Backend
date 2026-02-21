import Razorpay from "razorpay";

/* ================= ENV VALIDATION ================= */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    "Razorpay keys are not configured properly in environment variables"
  );
}

/* ================= INSTANCE ================= */

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ================= BASIC ERROR HANDLING ================= */

razorpay.on?.("error", (err) => {
  console.error("Razorpay Error:", err);
});

export default razorpay;