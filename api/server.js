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

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in environment variables.");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

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

    // Validate request data
    if (!name || !price || !userData?.uid || !motorData?.name) {
      console.error("Validation error: Missing required fields", { name, price, userData, motorData });
      return res.status(400).json({
        error: "Missing required fields",
        message: "Липсват задължителни данни"
      });
    }

    const orderNumber = generateOrderNumber();

    const orderData = {
      orderNumber,
      productDetails: {
        ...motorData,
        price: parseFloat(price)
      },
      customer: userData,
      status: 'pending',
      orderDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const orderRef = await db.collection('orders').add(orderData);

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000'}/success.html`,
        cancel_url: `${process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000'}/cancel`,
        line_items: [
          {
            price_data: {
              currency: "bgn",
              product_data: { 
                name: motorData.name,
                description: `Manufacturer: ${motorData.manufacturer}`,
              },
              unit_amount: Math.round(parseFloat(price) * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId: orderRef.id,
          orderNumber
        }
      });

      await orderRef.update({
        checkoutSessionId: session.id
      });

      return res.status(200).json({ url: session.url });
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);
      await orderRef.delete(); // Rollback order creation if Stripe fails
      throw new Error("Failed to create Stripe checkout session");
    }

  } catch (error) {
    console.error("Error in /create-checkout-session:", error);
    return res.status(500).json({
      error: "Server error",
      message: error.message || "Internal server error"
    });
  }
});

app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    try {
      const orderId = session.metadata?.orderId;
      if (!orderId) return res.status(200).json({ received: true });

      await db.collection("orders").doc(orderId).update({
        status: 'completed',
        payment_status: session.payment_status,
        payment_completed_at: admin.firestore.FieldValue.serverTimestamp(),
        amount_paid: session.amount_total / 100,
      });
    } catch (error) {
      console.error("Error updating order:", error);
    }
  }

  res.status(200).json({ received: true });
});

// Redirect to login page on success
app.get("/success.html", (req, res) => {
  res.redirect("/login.html");
});

// Required for Vercel
export default app;
