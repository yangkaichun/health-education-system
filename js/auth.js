// Google API 認證與初始化

// API 金鑰與客戶端 ID
const API_KEY = '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';
const CLIENT_ID = '344265714322-jdk0joqgo1a8357b841rl1h2u9b4s0q8.apps.googleusercontent.com您的客戶端ID';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let isAuthenticated = false;

// 初始化頁面
function initPage() {
    document.addEventListener('DOMContentLoaded', initializeGapiClient);
}

// 初始化 Google API 客戶端
async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        maybeEnableButtons();
    } catch (err) {
        console.error('Error initializing GAPI client:', err);
        showError('無法初始化 Google API 客戶端。請確認網路連線並重新載入頁面。');
    }
}

// 初始化 Google Identity Services
function initializeGis() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // 將在 requestAccessToken 中設置
        });
        gisInited = true;
        maybeEnableButtons();
    } catch (err) {
        console.error('Error initializing GIS client:', err);
        showError('無法初始化 Google 身份服務。請確認網路連線並重新載入頁面。');
    }
}

// 檢查並啟用按鈕
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        checkAuthStatus();
    }
}

// 檢查認證狀態
function checkAuthStatus() {
    // 檢查是否已授權
    const token = gapi.client.getToken();
    if (token && token.access_token) {
        isAuthenticated = true;
        console.log('User is already authenticated');
        onAuthSuccess();
    } else {
        console.log('User is not authenticated');
        requestAccessToken();
    }
}

// 請求存取權杖
function requestAccessToken() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error('Error requesting access token:', resp);
            showError('無法獲取授權。請重新載入頁面並授予必要的權限。');
            return;
        }
        
        isAuthenticated = true;
        console.log('Successfully obtained access token');
        onAuthSuccess();
    };
    
    if (gapi.client.getToken() === null) {
        // 取得新的存取權杖
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // 跳過同意螢幕，使用先前已授權的權杖
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// 顯示錯誤訊息
function showError(message) {
    // 建立錯誤訊息容器
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.style.backgroundColor = '#ffebee';
    errorContainer.style.color = '#c62828';
    errorContainer.style.padding = '1rem';
    errorContainer.style.borderRadius = '4px';
    errorContainer.style.margin = '1rem 0';
    errorContainer.style.textAlign = 'center';
    errorContainer.innerHTML = `<strong>錯誤:</strong> ${message}`;
    
    // 顯示到頁面上
    document.body.insertBefore(errorContainer, document.body.firstChild);
}

// 授權成功後執行的函數
function onAuthSuccess() {
    // 將在其他 JS 檔案中定義和實現
    if (typeof onAuthenticated === 'function') {
        onAuthenticated();
    }
}

// 載入 Google API 客戶端
document.addEventListener('DOMContentLoaded', function() {
    // 載入 GIS 腳本
    initializeGis();
    
    // 載入 GAPI 腳本
    gapi.load('client', initializeGapiClient);
});