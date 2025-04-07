import express from "express";
import cors from "cors";
import Stripe from "stripe";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url"; // Fix for __dirname in ES Modules

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Parse JSON correctly
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
app.use(express.json());
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
    console.log('Creating order:', { name, price, userData, motorData });

    if (!name || !price || !userData || !motorData) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "All order data is required"
      });
    }

    const orderNumber = generateOrderNumber();
    
    // Create order in Firestore with full details
    const orderData = {
      orderNumber: orderNumber,
      productDetails: motorData,
      customer: userData,
      status: 'pending',
      orderDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const orderRef = await db.collection('orders').add(orderData);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${req.protocol}://${req.get('host')}/success.html`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
      line_items: [
        {
          price_data: {
            currency: "bgn",
            product_data: { name: motorData.name },
            unit_amount: Math.round(parseFloat(price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: orderRef.id,
        orderNumber: orderNumber
      }
    });

    await orderRef.update({
      checkoutSessionId: session.id
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      error: "Failed to create order",
      message: error.message
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

app.get("/success.html", (req, res) => {
  res.redirect("/login.html");
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
