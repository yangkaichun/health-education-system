import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config(); // 讀取 .env 環境變數
const app = express();
const port = process.env.PORT || 3001;

// CORS 安全設定（可設定只開放給你的網域）
app.use(cors({
    origin: ['https://yangkaichun.github.io/health-education-system/', 'http://localhost:3000'],
    credentials: true
}));

// API: 提供 GitHub Token
app.get('/api/github-token', (req, res) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return res.status(500).json({ error: 'GitHub Token 未設定' });
    }

    // 可額外做安全檢查，例如驗證 session、JWT 等
    res.json({ token });
});

app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
});






