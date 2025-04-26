// GitHub 認證相關功能 - 安全認證版本

// 全域變數
let isAuthenticated = false;
const GITHUB_TOKEN_KEY = 'github_token';
const GITHUB_USERNAME = 'yangkaichun'; // 替換為您的 GitHub 用戶名
const GITHUB_REPO = 'health-education-system'; // 替換為您的倉庫名稱
const GITHUB_CLIENT_ID = 'Ov23lih1onxEfQ2tFTUM'; // 需要在GitHub上創建OAuth App並獲取

// GitHub OAuth相關配置
const GITHUB_OAUTH_REDIRECT_URI = window.location.origin + '/oauth-callback.html';
const GITHUB_OAUTH_SCOPE = 'repo'; // 根據需要調整權限範圍

// 頁面載入時初始化認證
document.addEventListener('DOMContentLoaded', initializeAuth);

// 初始化認證
function initializeAuth() {
    console.log('Initializing GitHub authentication...');
    
    // 檢查是否已經有存儲的token
    const token = getStoredToken();
    
    if (token) {
        console.log('Found stored token, validating...');
        validateToken(token)
            .then(valid => {
                if (valid) {
                    console.log('Token is valid.');
                    isAuthenticated = true;
                    // 觸發認證成功事件
                    triggerAuthEvent(true);
                } else {
                    console.log('Stored token is invalid.');
                    clearStoredToken();
                    // 顯示登入介面
                    showLoginUI();
                }
            })
            .catch(error => {
                console.error('Error validating token:', error);
                showLoginUI();
            });
    } else {
        console.log('No stored token found.');
        showLoginUI();
    }
    
    // 初始化UI元素
    initializeAuthUI();
}

// 初始化認證UI元素
function initializeAuthUI() {
    // 創建登入按鈕（如果尚未存在）
    if (!document.getElementById('github-login-btn')) {
        const loginBtn = document.createElement('button');
        loginBtn.id = 'github-login-btn';
        loginBtn.className = 'github-auth-btn';
        loginBtn.innerText = '使用GitHub登入';
        loginBtn.addEventListener('click', initiateGitHubOAuth);
        
        // 創建登出按鈕
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'github-logout-btn';
        logoutBtn.className = 'github-auth-btn';
        logoutBtn.innerText = '登出GitHub';
        logoutBtn.style.display = 'none';
        logoutBtn.addEventListener('click', logout);
        
        // 創建使用PAT按鈕（個人訪問令牌）
        const patBtn = document.createElement('button');
        patBtn.id = 'github-pat-btn';
        patBtn.className = 'github-auth-btn';
        patBtn.innerText = '使用個人訪問令牌';
        patBtn.addEventListener('click', showPATInputDialog);
        
        // 創建認證狀態顯示元素
        const statusDiv = document.createElement('div');
        statusDiv.id = 'github-auth-status';
        statusDiv.className = 'github-auth-status';
        
        // 將按鈕添加到頁面
        const authContainer = document.createElement('div');
        authContainer.id = 'github-auth-container';
        authContainer.className = 'github-auth-container';
        authContainer.appendChild(loginBtn);
        authContainer.appendChild(patBtn);
        authContainer.appendChild(logoutBtn);
        authContainer.appendChild(statusDiv);
        
        // 添加到頁面
        document.body.appendChild(authContainer);
        
        // 添加樣式
        addAuthStyles();
    }
    
    // 更新UI狀態
    updateAuthUI();
}

// 添加認證相關的樣式
function addAuthStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .github-auth-container {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .github-auth-btn {
            padding: 8px 12px;
            background-color: #24292e;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        
        .github-auth-btn:hover {
            background-color: #0366d6;
        }
        
        .github-auth-status {
            font-size: 12px;
            margin-top: 5px;
            color: #586069;
        }
        
        .github-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            width: 350px;
        }
        
        .github-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        }
        
        .github-dialog input {
            width: 100%;
            padding: 8px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .github-dialog-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 15px;
        }
        
        .github-dialog-buttons button {
            padding: 6px 12px;
            border-radius: 4px;
            border: 1px solid #ddd;
            cursor: pointer;
        }
        
        .github-dialog-buttons button.primary {
            background-color: #2ea44f;
            color: white;
            border: none;
        }
    `;
    document.head.appendChild(styleElement);
}

// 顯示登入界面
function showLoginUI() {
    updateAuthUI();
}

// 開始GitHub OAuth流程
function initiateGitHubOAuth() {
    // 產生一個隨機狀態以防止CSRF攻擊
    const state = generateRandomState();
    // 將狀態保存在localStorage，以便稍後驗證
    localStorage.setItem('github_oauth_state', state);
    
    // 構建OAuth授權URL
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_OAUTH_REDIRECT_URI)}&scope=${encodeURIComponent(GITHUB_OAUTH_SCOPE)}&state=${state}`;
    
    // 打開OAuth視窗
    const authWindow = window.open(authUrl, 'GitHub Authorization', 'width=600,height=700');
    
    // 定期檢查OAuth callback是否發生
    const checkInterval = setInterval(() => {
        try {
            // 如果視窗被關閉
            if (authWindow.closed) {
                clearInterval(checkInterval);
                checkTokenAfterOAuth();
            }
        } catch (e) {
            // 錯誤處理
            console.error('Error checking OAuth window:', e);
        }
    }, 500);
}

// 生成隨機狀態參數
function generateRandomState() {
    const array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

// OAuth完成後檢查token
function checkTokenAfterOAuth() {
    // 從localStorage檢查token是否已經設置（由oauth-callback.html設置）
    const token = getStoredToken();
    
    if (token) {
        validateToken(token)
            .then(valid => {
                if (valid) {
                    isAuthenticated = true;
                    triggerAuthEvent(true);
                    updateAuthUI();
                } else {
                    clearStoredToken();
                    showNotification('認證失敗，請重試。', 'error');
                }
            })
            .catch(error => {
                console.error('Error validating token:', error);
                showNotification('認證過程中發生錯誤。', 'error');
            });
    } else {
        showNotification('GitHub登入未完成或被取消。', 'warning');
    }
}

// 顯示個人訪問令牌(PAT)輸入對話框
function showPATInputDialog() {
    // 創建對話框元素
    const overlay = document.createElement('div');
    overlay.className = 'github-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'github-dialog';
    
    // 對話框內容
    dialog.innerHTML = `
        <h3>輸入GitHub個人訪問令牌</h3>
        <p>請在GitHub設定中生成一個擁有以下權限的個人訪問令牌：repo</p>
        <a href="https://github.com/settings/tokens" target="_blank">前往GitHub創建令牌</a>
        <input type="password" id="github-pat-input" placeholder="輸入您的個人訪問令牌">
        <div class="github-dialog-buttons">
            <button id="github-pat-cancel">取消</button>
            <button id="github-pat-submit" class="primary">確定</button>
        </div>
    `;
    
    // 添加對話框到頁面
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // 綁定事件
    document.getElementById('github-pat-cancel').addEventListener('click', () => {
        overlay.remove();
        dialog.remove();
    });
    
    document.getElementById('github-pat-submit').addEventListener('click', () => {
        const patInput = document.getElementById('github-pat-input');
        const token = patInput.value.trim();
        
        if (token) {
            // 驗證令牌
            validateToken(token)
                .then(valid => {
                    if (valid) {
                        // 儲存令牌
                        storeToken(token);
                        isAuthenticated = true;
                        triggerAuthEvent(true);
                        showNotification('成功使用個人訪問令牌登入。', 'success');
                        overlay.remove();
                        dialog.remove();
                        updateAuthUI();
                    } else {
                        showNotification('無效的訪問令牌，請檢查後重試。', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error validating token:', error);
                    showNotification('驗證令牌時發生錯誤。', 'error');
                });
        } else {
            showNotification('請輸入訪問令牌。', 'warning');
        }
    });
    
    // 聚焦輸入框
    document.getElementById('github-pat-input').focus();
}

// 驗證GitHub令牌
async function validateToken(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            // 可選：存儲用戶數據
            localStorage.setItem('github_user_data', JSON.stringify(userData));
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error validating GitHub token:', error);
        return false;
    }
}

// 儲存令牌到localStorage
function storeToken(token) {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
}

// 從localStorage取得存儲的令牌
function getStoredToken() {
    return localStorage.getItem(GITHUB_TOKEN_KEY);
}

// 清除存儲的令牌
function clearStoredToken() {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    localStorage.removeItem('github_user_data');
}

// 登出
function logout() {
    clearStoredToken();
    isAuthenticated = false;
    triggerAuthEvent(false);
    updateAuthUI();
    showNotification('已登出GitHub帳號。', 'info');
}

// 更新認證UI狀態
function updateAuthUI() {
    const loginBtn = document.getElementById('github-login-btn');
    const logoutBtn = document.getElementById('github-logout-btn');
    const patBtn = document.getElementById('github-pat-btn');
    const statusDiv = document.getElementById('github-auth-status');
    
    if (!loginBtn || !logoutBtn || !patBtn || !statusDiv) return;
    
    if (isAuthenticated) {
        loginBtn.style.display = 'none';
        patBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // 顯示用戶信息
        try {
            const userData = JSON.parse(localStorage.getItem('github_user_data')) || {};
            statusDiv.innerHTML = `已認證: ${userData.login || '用戶'}`;
            statusDiv.style.color = '#2ea44f';
        } catch (e) {
            statusDiv.innerHTML = '已認證';
            statusDiv.style.color = '#2ea44f';
        }
    } else {
        loginBtn.style.display = 'block';
        patBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        statusDiv.innerHTML = '未認證';
        statusDiv.style.color = '#cb2431';
    }
}

// 觸發認證事件
function triggerAuthEvent(isAuthenticated) {
    const event = new CustomEvent('githubAuthChanged', {
        detail: { 
            isAuthenticated,
            token: isAuthenticated ? getStoredToken() : null
        }
    });
    document.dispatchEvent(event);
}

// 顯示通知
function showNotification(message, type = 'info') {
    // 如果已有通知，則移除
    const existingNotification = document.querySelector('.github-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 創建新通知
    const notification = document.createElement('div');
    notification.className = `github-notification github-notification-${type}`;
    notification.innerHTML = message;
    
    // 添加到頁面
    document.body.appendChild(notification);
    
    // 添加樣式
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .github-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            color: white;
            z-index: 1002;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
            opacity: 0;
        }
        
        .github-notification-info {
            background-color: #0366d6;
        }
        
        .github-notification-success {
            background-color: #2ea44f;
        }
        
        .github-notification-warning {
            background-color: #f9a825;
        }
        
        .github-notification-error {
            background-color: #cb2431;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(styleElement);
    
    // 使動畫生效
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // 3秒後移除
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 使用令牌執行GitHub API請求
async function callGitHubAPI(endpoint, method = 'GET', data = null) {
    const token = getStoredToken();
    
    if (!token) {
        throw new Error('未認證，無法執行API請求。');
    }
    
    const options = {
        method,
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`https://api.github.com${endpoint}`, options);
    
    if (!response.ok) {
        if (response.status === 401) {
            // 令牌無效
            clearStoredToken();
            isAuthenticated = false;
            triggerAuthEvent(false);
            updateAuthUI();
            throw new Error('認證已過期，請重新登入。');
        }
        
        const errorText = await response.text();
        throw new Error(`GitHub API錯誤 (${response.status}): ${errorText}`);
    }
    
    // 如果回應是JSON，則解析它
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    
    // 否則返回文本
    return await response.text();
}

// 檢查用戶是否已認證
function isUserAuthenticated() {
    return isAuthenticated;
}

// 公開API
window.GitHubAuth = {
    isAuthenticated: isUserAuthenticated,
    login: initiateGitHubOAuth,
    loginWithPAT: showPATInputDialog,
    logout: logout,
    callAPI: callGitHubAPI,
    getToken: getStoredToken
};

// 創建OAuth callback處理頁面所需的代碼 (需要保存為oauth-callback.html)
function generateOAuthCallbackPage() {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>GitHub OAuth Callback</title>
    <script>
        // 處理GitHub OAuth回調
        function handleCallback() {
            // 從URL獲取參數
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            
            // 檢查是否有錯誤
            if (error) {
                window.opener.postMessage({
                    type: 'github-oauth-error', 
                    error: error
                }, window.location.origin);
                window.close();
                return;
            }
            
            // 檢查狀態是否匹配
            const savedState = localStorage.getItem('github_oauth_state');
            if (state !== savedState) {
                window.opener.postMessage({
                    type: 'github-oauth-error',
                    error: 'Invalid state parameter'
                }, window.location.origin);
                window.close();
                return;
            }
            
            // 清除狀態
            localStorage.removeItem('github_oauth_state');
            
            // 使用授權碼交換訪問令牌
            // 注意：這需要一個後端服務來處理，因為client_secret不應該在前端暴露
            
            // 以下為示例：實際實現時應使用您的後端API
            fetch('YOUR_BACKEND_TOKEN_EXCHANGE_ENDPOINT', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            })
            .then(response => response.json())
            .then(data => {
                if (data.access_token) {
                    // 將令牌存儲到localStorage
                    localStorage.setItem('github_token', data.access_token);
                    
                    // 通知父視窗
                    window.opener.postMessage({
                        type: 'github-oauth-success',
                        token: data.access_token
                    }, window.location.origin);
                } else {
                    throw new Error('No access token received');
                }
            })
            .catch(error => {
                console.error('Error exchanging code for token:', error);
                window.opener.postMessage({
                    type: 'github-oauth-error',
                    error: error.message
                }, window.location.origin);
            })
            .finally(() => {
                // 關閉彈出視窗
                window.close();
            });
        }
        
        // 頁面載入時處理回調
        window.addEventListener('DOMContentLoaded', handleCallback);
    </script>
</head>
<body>
    <h2>GitHub 認證處理中...</h2>
    <p>此視窗將自動關閉。</p>
</body>
</html>`;
}

// 如果需要產生OAuth回調頁面
// console.log(generateOAuthCallbackPage());

// 導出必要的函數
export {
    initializeAuth,
    isUserAuthenticated,
    callGitHubAPI
};
