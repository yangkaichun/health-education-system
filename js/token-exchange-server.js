// token-exchange-server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// GitHub OAuth 配置
const GITHUB_CLIENT_ID = 'Ov23lih1onxEfQ2tFTUM';
const GITHUB_CLIENT_SECRET = '7933dd1295eab368fc4a275fd49d89dcefdbb1b6';

app.post('/exchange-token', async (req, res) => {
    try {
        const { code } = req.body;
        
        // 向GitHub API請求訪問令牌
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: code
        }, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // 返回令牌數據
        res.json(tokenResponse.data);
    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Token exchange server running on port ${PORT}`);
});
