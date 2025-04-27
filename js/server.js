import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = 'yangkaichun'; // 根據你原本前端設定
const GITHUB_REPO = 'health-education-system';

app.use(cors({
    origin: ['https://yangkaichun.github.io/health-education-system', 'http://localhost:3000'],
    credentials: true
}));

// 代理：前端呼叫這裡，後端幫忙去 GitHub API 取資料
app.get('/api/github-repo', async (req, res) => {
    try {
        const githubApiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`;
        
        const response = await fetch(githubApiUrl, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API error:', errorData);
            return res.status(response.status).json({ error: errorData });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
