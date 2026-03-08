import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());

const allowedOrigins = [
    'http://localhost:5173',  // Vite dev server
    process.env.CLIENT_URL    // Production URL (Vercel)
].filter(Boolean); // Remove undefined values

app.use(cors({
    origin: allowedOrigins
}));

app.get("/", (_req, res) => {
  res.send("Email proxy server is running");
});

app.post("/send-email", async (req, res) => {
    const emailApiUrl = process.env.EMAIL_API_URL || "http://localhost:5001/send-email";
    try {
        const response = await fetch(emailApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body),
        });
        const data = await response.json();
        if (response.ok) {
            res.status(200).json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error("❌ Error forwarding email request:", error);
        res.status(500).json({ success: false, message: error.toString() });
    } 
});