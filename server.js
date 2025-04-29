// 載入必要的套件
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// 初始化 Express 應用程式
const app = express();

// 使用中間件
app.use(express.json());  // 解析 JSON 請求
app.use(cors({
  origin: process.env.FRONTEND_URL, // 只允許前端域名的請求
  credentials: true // 允許憑證（cookies）
}));

// 定義連接埠
const PORT = process.env.PORT || 3001;

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`OAuth 後端服務運行於連接埠 ${PORT}`);
});
