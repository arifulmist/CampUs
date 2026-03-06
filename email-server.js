import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

app.use(cors({ origin: "https://campus-rosy.vercel.app/" }));
app.use(express.json());

// Configure the transporter using Gmail (or another SMTP service)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Simple health check
app.get("/", (_req, res) => {
  res.send("Email server is running");
});

// Generic email-sending endpoint
app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res
      .status(400)
      .json({ success: false, message: "Missing to, subject, or text" });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    res
      .status(200)
      .json({ success: true, message: "Email sent: " + info.response });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, message: error.toString() });
  }
});

const PORT = process.env.EMAIL_PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Email server is running on http://localhost:${PORT}`);
});
