// Secure payment/admin backend starter.
// Before deploying, configure Razorpay keys with Firebase Functions secrets.
// Never place Razorpay secret keys in browser files.
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");
const Razorpay = require("razorpay");
admin.initializeApp();
const db = admin.firestore();
const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = defineSecret("RAZORPAY_KEY_SECRET");
const RAZORPAY_WEBHOOK_SECRET = defineSecret("RAZORPAY_WEBHOOK_SECRET");

// Only a trusted project owner should grant the admin custom claim, using Admin SDK
// from a private trusted environment. Never expose a public endpoint that grants admin.
exports.createRazorpayOrder = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  const cart = request.data && request.data.items;
  if (!Array.isArray(cart) || !cart.length) throw new HttpsError("invalid-argument", "Cart is empty.");
  // Recalculate all prices and stock from Firestore. Never trust prices sent by the browser.
  let totalPaise = 0;
  const validated = [];
  for (const item of cart) {
    if (!item || typeof item.productId !== "string" || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99)
      throw new HttpsError("invalid-argument", "Invalid cart item.");
    const snap = await db.collection("products").doc(item.productId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Product not found.");
    const p = snap.data();
    if (p.active === false || Number(p.stock) < item.qty) throw new HttpsError("failed-precondition", "An item is unavailable.");
    const price = Number(p.price);
    if (!Number.isFinite(price) || price < 0) throw new HttpsError("failed-precondition", "Invalid product price.");
    totalPaise += Math.round(price * 100) * item.qty;
    validated.push({ productId: item.productId, name: p.name, qty: item.qty, price });
  }
  if (totalPaise < 19900) throw new HttpsError("failed-precondition", "Minimum order value is ₹199.");
  const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID.value(), key_secret: RAZORPAY_KEY_SECRET.value() });
  const order = await razorpay.orders.create({ amount: totalPaise, currency: "INR", receipt: `jyoti_${Date.now()}` });
  const ref = await db.collection("orders").add({
    uid: request.auth.uid, items: validated, total: totalPaise / 100,
    razorpayOrderId: order.id, paymentStatus: "pending", status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { orderId: order.id, amount: order.amount, currency: order.currency, internalOrderId: ref.id, keyId: RAZORPAY_KEY_ID.value() };
});

// Call only after Razorpay checkout response; server checks HMAC and matches stored order.
// Production setup should also rely on the webhook below for final payment status.
exports.verifyRazorpayPayment = onCall({ secrets: [RAZORPAY_KEY_SECRET] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internalOrderId } = request.data || {};
  if (![razorpay_order_id, razorpay_payment_id, razorpay_signature, internalOrderId].every(v => typeof v === "string"))
    throw new HttpsError("invalid-argument", "Missing payment details.");
  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET.value()).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if (expected.length !== razorpay_signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature)))
    throw new HttpsError("permission-denied", "Payment signature verification failed.");
  const ref = db.collection("orders").doc(internalOrderId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== request.auth.uid || snap.data().razorpayOrderId !== razorpay_order_id)
    throw new HttpsError("permission-denied", "Order does not match.");
  await ref.update({ razorpayPaymentId: razorpay_payment_id, paymentStatus: "signature_verified", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { verified: true, message: "Signature verified. Webhook should confirm captured payment." };
});

// Razorpay webhook: configure the endpoint URL in Razorpay Dashboard.
// Signature must be verified against the raw request body.
exports.razorpayWebhook = onRequest({ secrets: [RAZORPAY_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const signature = req.get("x-razorpay-signature") || "";
  const raw = req.rawBody;
  const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET.value()).update(raw).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
    return res.status(400).send("Invalid signature");
  const event = req.body;
  if (event.event === "payment.captured") {
    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (payment && payment.order_id) {
      const qs = await db.collection("orders").where("razorpayOrderId", "==", payment.order_id).limit(1).get();
      if (!qs.empty) await qs.docs[0].ref.update({ paymentStatus: "paid", razorpayPaymentId: payment.id, paidAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  } else if (event.event === "payment.failed") {
    const payment = event.payload && event.payload.payment && event.payload.payment.entity;
    if (payment && payment.order_id) {
      const qs = await db.collection("orders").where("razorpayOrderId", "==", payment.order_id).limit(1).get();
      if (!qs.empty) await qs.docs[0].ref.update({ paymentStatus: "failed", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }
  return res.status(200).send("ok");
});