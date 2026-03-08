import cors from 'cors';
import express from 'express';

const app = express();

app.use(express.json());

const PORT = process.env.EMAIL_PROXY_PORT || 5000;

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173"].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));

app.get('/', (req, res) => {
    res.send('Email Proxy Server is running');
});

app.post('/send-email', async (req, res) => {
    const emailAPIUrl = process.env.EMAIL_API_URL || 'http://localhost:5001/send-email';
    try {
        const response = await fetch(emailAPIUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error forwarding email request:', error);
        res.status(500).json({ success: false, message: 'Failed to forward email request' });
    }
});

app.listen(PORT, () => {
    console.log(`Email Proxy Server is running on http://localhost:${PORT}`);
});