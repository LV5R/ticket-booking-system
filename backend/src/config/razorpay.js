import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

// Default to dummy keys so the server doesn't crash if they are missing
const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

const razorpay = new Razorpay({
  key_id,
  key_secret,
});

export default razorpay;
