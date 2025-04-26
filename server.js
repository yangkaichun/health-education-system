// server.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = 3001;

// 從 .env 檔案讀取 GitHub Token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = 'yangkaichun';
const GITHUB_REPO = 'health-education-system';

app.use(cors());
app.use(express.json());

// 建一個 API，讓前端來叫
app.get('/github/contents', async (req, res) => {
  try {
    const githubRes = await axios.get(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      }
    });

    res.json(githubRes.data);
  } catch (error) {
    console.error('Error fetching GitHub contents:', error.message);
    res.status(500).send('Failed to fetch data from GitHub');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
