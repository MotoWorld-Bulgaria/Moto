import express from "express";
import cors from "cors";
import Stripe from "stripe";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

let serviceAccount;
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in environment variables.");
  }
  console.log("Raw FIREBASE_SERVICE_ACCOUNT:", process.env.FIREBASE_SERVICE_ACCOUNT); // Debugging log
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", error.message);
  process.exit(1); // Exit the process with an error code
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (err) {
      console.error("Invalid JSON payload:", buf.toString());
      throw new Error("Invalid JSON payload");
    }
  }
}));
app.use(express.static(path.join(__dirname)));

// Serve login.html
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { name, price, userData, motorData } = req.body;

    if (!name || !price || !userData?.uid || !motorData?.name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    const orderNumber = generateOrderNumber();
    const orderRef = await db.collection('orders').add({
      orderNumber,
      productDetails: { ...motorData, price: numericPrice },
      customer: userData,
      status: 'pending',
      orderDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success.html`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      line_items: [{
        price_data: {
          currency: "bgn",
          product_data: { name: motorData.name, description: motorData.manufacturer },
          unit_amount: Math.round(numericPrice * 100),
        },
        quantity: 1,
      }],
      metadata: { orderId: orderRef.id, orderNumber },
    });

    await orderRef.update({ checkoutSessionId: session.id });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error in /create-checkout-session:", error);
    return res.status(500).json({ error: "Server error", message: error.message });
  }
});

app.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await db.collection("orders").doc(orderId).update({
          status: "completed",
          payment_status: session.payment_status,
          payment_completed_at: admin.firestore.FieldValue.serverTimestamp(),
          amount_paid: session.amount_total / 100,
        });
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  }
  res.json({ received: true });
});

app.get("/success.html", (req, res) => {
  res.redirect("/login.html");
});

// Required for Vercel
export default app;
