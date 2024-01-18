// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateAdded: { type: Date, default: Date.now },
  // Add more payment-related fields as needed
});

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
