// GitHub 認證相關功能 - OAuth 認證版本

// 全域變數
let isAuthenticated = false;
const GITHUB_USERNAME = 'yangkaichun'; // 您的 GitHub 用戶名
const GITHUB_REPO = 'health-education-system'; // 您的倉庫名稱
const TOKEN_STORAGE_KEY = 'github_oauth_token';

// OAuth 配置（替換為您的 OAuth 應用程序信息）
const OAUTH_CONFIG = {
    clientId: '您的client_id', // 從 GitHub OAuth 應用程序設置中獲取
    // 注意：Client Secret 不應該放在前端代碼中
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    redirectUri: window.location.origin + '/callback.html', // 您的回調頁面
    scope: 'repo' // 所需權限範圍
};

// 頁面載入時初始化認證
document.addEventListener('DOMContentLoaded', initializeAuth);

// 初始化認證
function initializeAuth() {
    console.log('Initializing GitHub authentication...');
    
    // 設置認證相關事件監聽
    setupAuthListeners();
    
    // 檢查 URL 中是否有授權碼（從 OAuth 重定向返回）
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // 如果有授權碼，處理 OAuth 回調
        handleOAuthCallback(code);
    } else {
        // 檢查是否已有儲存的 Token
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        
        if (token) {
            // 驗證 Token 是否有效
            validateToken(token)
                .then(valid => {
                    if (valid) {
                        // Token 有效，完成認證
                        console.log('Token is valid, completing authentication');
                        completeAuthentication(token);
                    } else {
                        // Token 無效，需要重新認證
                        console.log('Token is invalid, showing auth form');
                        showAuthForm();
                    }
                })
                .catch(error => {
                    console.error('Token validation failed:', error);
                    showAuthForm();
                });
        } else {
            // 沒有 Token，顯示認證表單
            showAuthForm();
        }
    }
}

// 設置認證相關事件監聽
function setupAuthListeners() {
    // 登入按鈕事件
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        authButton.addEventListener('click', startOAuthFlow);
    }
    
    // 登出按鈕事件
    const logoutButton = document.getElementById('logout-github');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // 檢查連接按鈕事件
    const checkConnectionButton = document.getElementById('check-connection');
    if (checkConnectionButton) {
        checkConnectionButton.addEventListener('click', checkGitHubConnection);
    }
}

// 開始 OAuth 流程
function startOAuthFlow() {
    // 產生隨機 state 以防止 CSRF 攻擊
    const state = generateRandomString(24);
    localStorage.setItem('oauth_state', state);
    
    // 構建 OAuth 授權 URL
    const authUrl = `${OAUTH_CONFIG.authorizationUrl}?` +
        `client_id=${OAUTH_CONFIG.clientId}&` +
        `redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}&` +
        `scope=${encodeURIComponent(OAUTH_CONFIG.scope)}&` +
        `state=${state}`;
    
    // 重定向到 GitHub 授權頁面
    window.location.href = authUrl;
}

// 處理 OAuth 回調
async function handleOAuthCallback(code) {
    // 驗證 state 以防止 CSRF 攻擊
    const storedState = localStorage.getItem('oauth_state');
    const urlParams = new URLSearchParams(window.location.search);
    const returnedState = urlParams.get('state');
    
    if (storedState !== returnedState) {
        console.error('State validation failed');
        showNotification('認證失敗：安全驗證不匹配', 'error');
        showAuthForm();
        return;
    }
    
    try {
        // 顯示驗證中狀態
        showAuthStatus('驗證中...', 'loading');
        
        // 清除 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 交換授權碼獲取訪問令牌
        // 注意：出於安全考慮，這個請求應該由您的後端服務器處理
        // 前端示例（實際應用中應該使用後端處理）:
        const response = await fetch('/api/github/oauth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        
        if (!response.ok) {
            throw new Error('獲取訪問令牌失敗');
        }
        
        const data = await response.json();
        const token = data.access_token;
        
        if (token) {
            // 驗證 Token
            const valid = await validateToken(token);
            
            if (valid) {
                completeAuthentication(token);
            } else {
                showAuthStatus('驗證失敗', 'error');
                showNotification('GitHub 認證失敗', 'error');
            }
        } else {
            throw new Error('未收到訪問令牌');
        }
    } catch (error) {
        console.error('OAuth 回調處理錯誤:', error);
        showAuthStatus('驗證失敗', 'error');
        showNotification('認證過程中發生錯誤: ' + error.message, 'error');
    }
}

// 驗證 Token
async function validateToken(token) {
    try {
        console.log('Validating token...');
        // 檢查對儲存庫的訪問權限
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        if (response.status === 200) {
            console.log('Token is valid');
            return true;
        } else {
            console.error('Token validation failed, status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

// 完成認證
function completeAuthentication(token) {
    // 儲存 Token
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    isAuthenticated = true;
    
    // 隱藏認證表單 (如果存在)
    hideAuthForm();
    
    // 在管理頁面顯示狀態 (如果存在)
    const githubStatus = document.getElementById('github-status');
    if (githubStatus) {
        githubStatus.style.display = 'block';
        showConnectionStatus('已連接', 'success');
    }
    
    // 顯示成功訊息
    showNotification('GitHub 認證成功', 'success');
    
    // 初始化系統資料
    if (typeof onAuthenticated === 'function') {
        console.log('Calling onAuthenticated function');
        onAuthenticated();
    } else {
        console.warn('onAuthenticated function not defined');
    }
}

// 處理登出
function handleLogout() {
    if (confirm('確定要登出嗎？登出後將需要重新認證 GitHub。')) {
        // 清除 Token 和 OAuth 狀態
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem('oauth_state');
        isAuthenticated = false;
        
        // 顯示認證表單
        showAuthForm();
        
        // 顯示訊息
        showNotification('已成功登出', 'info');
        
        // 重新載入頁面以清除資料
        setTimeout(() => {
            location.reload();
        }, 1500);
    }
}

// 檢查 GitHub 連接狀態
async function checkGitHubConnection() {
    try {
        const connectionStatusEl = document.getElementById('connection-status');
        if (connectionStatusEl) {
            showConnectionStatus('檢查中...', 'loading');
        }
        
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        
        if (!token) {
            if (connectionStatusEl) {
                showConnectionStatus('未認證', 'error');
            }
            return { connected: false, error: '尚未提供 GitHub 認證' };
        }
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const repoData = await response.json();
            if (connectionStatusEl) {
                showConnectionStatus('已連接', 'success');
            }
            console.log('Connected to repository:', repoData.full_name);
            return {
                connected: true,
                repoName: repoData.full_name,
                repoUrl: repoData.html_url
            };
        } else {
            const errorData = await response.json();
            if (connectionStatusEl) {
                showConnectionStatus('連接失敗', 'error');
            }
            console.error('Connection failed:', errorData);
            return {
                connected: false,
                error: `GitHub API 錯誤: ${response.status} - ${errorData.message}`
            };
        }
    } catch (error) {
        console.error('Error checking GitHub connection:', error);
        const connectionStatusEl = document.getElementById('connection-status');
        if (connectionStatusEl) {
            showConnectionStatus('連接錯誤', 'error');
        }
        return {
            connected: false,
            error: error.message
        };
    }
}

// 顯示 GitHub 連接狀態
function showConnectionStatus(message, status) {
    const statusElement = document.getElementById('connection-status');
    
    if (statusElement) {
        const iconElement = statusElement.querySelector('.status-icon');
        const textElement = statusElement.querySelector('.status-text');
        
        if (iconElement && textElement) {
            textElement.textContent = message;
            
            // 移除所有狀態類別
            statusElement.classList.remove('status-success', 'status-error', 'status-loading');
            
            // 設置圖標和類別
            switch (status) {
                case 'success':
                    iconElement.textContent = '✅';
                    statusElement.classList.add('status-success');
                    break;
                case 'error':
                    iconElement.textContent = '❌';
                    statusElement.classList.add('status-error');
                    break;
                case 'loading':
                    iconElement.textContent = '⏳';
                    statusElement.classList.add('status-loading');
                    break;
                default:
                    iconElement.textContent = '⚫';
            }
        }
    }
}

// 顯示認證表單
function showAuthForm() {
    let authSection = document.getElementById('github-auth');
    
    // 如果認證區塊不存在，動態創建
    if (!authSection) {
        authSection = document.createElement('section');
        authSection.id = 'github-auth';
        authSection.innerHTML = `
            <h2>GitHub 認證</h2>
            <p>請使用您的 GitHub 帳戶進行認證以訪問系統功能</p>
            <div class="auth-form">
                <button id="auth-button" class="github-auth-button">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"></path>
                    </svg>
                    使用 GitHub 帳戶登入
                </button>
            </div>
            <div class="auth-help">
                <p>認證過程中，系統將：</p>
                <ol>
                    <li>將您導向 GitHub 進行認證</li>
                    <li>請求對您的儲存庫的訪問權限</li>
                    <li>認證成功後重定向回本應用程序</li>
                </ol>
            </div>
        `;
        
        // 添加到頁面頂部
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(authSection, main.firstChild);
        } else {
            document.body.insertBefore(authSection, document.body.firstChild);
        }
        
        // 重新綁定事件
        setupAuthListeners();
    }
    
    // 顯示認證表單
    authSection.style.display = 'block';
    
    // 隱藏內容區塊
    const contentSections = document.querySelectorAll('main > section:not(#github-auth):not(#github-status)');
    contentSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // 隱藏狀態區塊 (如果存在)
    const githubStatus = document.getElementById('github-status');
    if (githubStatus) {
        githubStatus.style.display = 'none';
    }
}

// 隱藏認證表單
function hideAuthForm() {
    const authSection = document.getElementById('github-auth');
    
    if (authSection) {
        authSection.style.display = 'none';
    }
    
    // 顯示內容區塊
    const contentSections = document.querySelectorAll('main > section:not(#github-auth)');
    contentSections.forEach(section => {
        section.style.display = 'block';
    });
}

// 顯示認證狀態
function showAuthStatus(message, status) {
    const authButton = document.getElementById('auth-button');
    
    if (authButton) {
        const originalText = authButton.getAttribute('data-original-text') || '使用 GitHub 帳戶登入';
        
        switch (status) {
            case 'loading':
                authButton.textContent = message;
                authButton.disabled = true;
                break;
            case 'error':
                authButton.textContent = originalText;
                authButton.disabled = false;
                break;
            case 'success':
                authButton.textContent = message;
                authButton.disabled = true;
                break;
            default:
                authButton.textContent = originalText;
                authButton.disabled = false;
        }
    }
}

// 顯示錯誤訊息
function showError(message) {
    // 創建錯誤訊息容器
    const errorContainer = document.createElement('div');
    errorContainer.style.backgroundColor = '#f8d7da';
    errorContainer.style.color = '#721c24';
    errorContainer.style.padding = '1rem';
    errorContainer.style.marginBottom = '1rem';
    errorContainer.style.borderRadius = '0.25rem';
    errorContainer.style.textAlign = 'center';
    errorContainer.innerHTML = `<strong>錯誤:</strong> ${message}`;
    
    // 插入到頁面頂部
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(errorContainer, main.firstChild);
    } else {
        document.body.insertBefore(errorContainer, document.body.firstChild);
    }
}

// 顯示通知
function showNotification(message, type) {
    // 檢查是否已有通知容器
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
        // 創建通知容器
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // 創建新通知
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">${getNotificationIcon(type)}</div>
        <div class="notification-message">${message}</div>
    `;
    
    // 添加到容器
    notificationContainer.appendChild(notification);
    
    // 動畫顯示
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 自動關閉
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// 獲取通知圖標
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        case 'info': return 'ℹ️';
        default: return 'ℹ️';
    }
}

// 檢查是否已認證
function isUserAuthenticated() {
    return isAuthenticated || localStorage.getItem(TOKEN_STORAGE_KEY) !== null;
}

// 獲取存儲的 Token
function getStoredToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

// 生成隨機字串用於 state 參數
function generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    return result;
}

// 確保全局可訪問性
window.GITHUB_USERNAME = GITHUB_USERNAME;
window.GITHUB_REPO = GITHUB_REPO;
window.isUserAuthenticated = isUserAuthenticated;
window.getStoredToken = getStoredToken;
window.showNotification = showNotification;
window.checkGitHubConnection = checkGitHubConnection;
