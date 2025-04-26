// GitHub 認證相關功能 - 自動認證版本

// 全域變數
let isAuthenticated = false;
//const GITHUB_TOKEN_KEY = process.env.GITHUB_TOKEN;
const GITHUB_TOKEN_KEY = 'github_token';
const GITHUB_USERNAME = 'yangkaichun'; // 替換為您的 GitHub 用戶名
const GITHUB_REPO = 'health-education-system'; // 替換為您的倉庫名稱
//const API_SERVER_URL = 'https://yangkaichun.github.io/health-education-system/'; 
//const API_SERVER_URL = 'http://localhost:3001'; 


// 預設的 GitHub Token - 直接內建在代碼中
//const DEFAULT_TOKEN = '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';
const DEFAULT_TOKEN = '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';
//const DEFAULT_TOKEN = process.env.GITHUB_TOKEN
//const DEFAULT_TOKEN = process.env.GITHUB_TOKEN
//async function fetchGitHubContents() {
 // try {
  //  const response = await fetch(`${API_SERVER_URL}/github/contents`);
  //  const data = await response.json();
   
  //  const DEFAULT_TOKEN =await response.json();
    
  //  console.log('GitHub contents:', data);
    // 處理資料
 // } catch (error) {
 //   console.error('Error fetching GitHub contents:', error);
 // }
//}

//fetchGitHubContents();




// 頁面載入時初始化認證
document.addEventListener('DOMContentLoaded', initializeAuth);

// 初始化認證
function initializeAuth() {
    console.log('Initializing GitHub authentication...');
    
    // 設置認證相關事件監聽
    setupAuthListeners();
    
    // 檢查是否已有儲存的 Token，如果沒有則使用預設 Token
    let token = localStorage.getItem(GITHUB_TOKEN_KEY);
    
    if (!token) {
        console.log('No token found, using default token');
        // 使用預設 Token
        token = DEFAULT_TOKEN;
        localStorage.setItem(GITHUB_TOKEN_KEY, token);
    }
    
    // 驗證 Token 是否有效
    validateToken(token)
        .then(valid => {
            if (valid) {
                // Token 有效，完成認證
                console.log('Token is valid, completing authentication');
                completeAuthentication(token);
            } else {
                // 如果是預設 Token 且無效，表示可能需要更新
                if (token === DEFAULT_TOKEN) {
                    console.error('Default token is invalid, update required');
                    showError('預設的 GitHub Token 已失效，請聯繫系統管理員更新。');
                }
                // 顯示認證表單
                console.log('Token is invalid, showing auth form');
                showAuthForm();
            }
        })
        .catch(error => {
            console.error('Token validation failed:', error);
            showAuthForm();
        });
}

// 設置認證相關事件監聽
function setupAuthListeners() {
    // 登入按鈕事件
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        authButton.addEventListener('click', handleAuthentication);
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
    
    // Token 輸入框回車事件
    const tokenInput = document.getElementById('github-token');
    if (tokenInput) {
        tokenInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleAuthentication();
            }
        });
    }
}

// 處理認證
async function handleAuthentication() {
    const tokenInput = document.getElementById('github-token');
    const token = tokenInput.value.trim();
    
    if (!token) {
        showNotification('請輸入有效的 GitHub Token', 'error');
        return;
    }
    
    try {
        // 顯示驗證中狀態
        showAuthStatus('驗證中...', 'loading');
        
        // 驗證 Token
        const valid = await validateToken(token);
        
        if (valid) {
            completeAuthentication(token);
        } else {
            showAuthStatus('驗證失敗', 'error');
            showNotification('GitHub Token 無效或權限不足', 'error');
        }
    } catch (error) {
        console.error('認證過程錯誤:', error);
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
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
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
    if (confirm('確定要登出嗎？登出後將需要重新輸入 GitHub Token。')) {
        // 清除 Token
        localStorage.removeItem(GITHUB_TOKEN_KEY);
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
        
        const token = localStorage.getItem(GITHUB_TOKEN_KEY) || DEFAULT_TOKEN;
        
        if (!token) {
            if (connectionStatusEl) {
                showConnectionStatus('未認證', 'error');
            }
            return { connected: false, error: '尚未提供 GitHub Token' };
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

// 顯示認證表單 - 只在預設 Token 失效時才會顯示
function showAuthForm() {
    let authSection = document.getElementById('github-auth');
    
    // 如果認證區塊不存在，動態創建
    if (!authSection) {
        authSection = document.createElement('section');
        authSection.id = 'github-auth';
        authSection.innerHTML = `
            <h2>GitHub 認證</h2>
            <p>系統無法使用預設認證，請輸入您的 GitHub 個人訪問令牌</p>
            <div class="auth-form">
                <input type="text" id="github-token" placeholder="輸入 GitHub Token">
                <button id="auth-button">登入</button>
            </div>
            <div class="auth-help">
                <p>如何獲取 GitHub Token:</p>
                <ol>
                    <li>登入 <a href="https://github.com/" target="_blank">GitHub</a></li>
                    <li>點擊右上角頭像 → Settings → Developer settings</li>
                    <li>選擇 Personal access tokens → Tokens (classic)</li>
                    <li>點擊 "Generate new token"，設置名稱並選擇 "repo" 權限</li>
                    <li>生成並複製 Token 後粘貼到上方輸入框</li>
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
        const originalText = authButton.getAttribute('data-original-text') || '登入';
        
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
    return isAuthenticated || localStorage.getItem(GITHUB_TOKEN_KEY) !== null;
}

// 獲取存儲的 Token
function getStoredToken() {
    return localStorage.getItem(GITHUB_TOKEN_KEY) || DEFAULT_TOKEN;
}

// 測試 Token
async function testToken() {
    try {
        console.log('Testing default token...');
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`, {
            headers: {
                'Authorization': `token ${DEFAULT_TOKEN}`
            }
        });
        
        if (response.ok) {
            console.log('Default token is valid!');
            return true;
        } else {
            console.error('Default token is invalid!', await response.json());
            return false;
        }
    } catch (error) {
        console.error('Error testing token:', error);
        return false;
    }
}

// 添加調試功能
function debugAuthentication() {
    console.group('GitHub 認證調試信息');
    console.log('使用的 Token:', getStoredToken() ? '已設置 (隱藏)' : '未設置');
    console.log('認證狀態:', isUserAuthenticated() ? '已認證' : '未認證');
    console.log('Token 來源:', getStoredToken() === DEFAULT_TOKEN ? '預設 Token' : '用戶提供的 Token');
    console.log('GITHUB_USERNAME:', GITHUB_USERNAME);
    console.log('GITHUB_REPO:', GITHUB_REPO);
    console.groupEnd();
    
    // 測試認證
    testToken().then(valid => {
        console.log('Token 測試結果:', valid ? '有效' : '無效');
        if (!valid) {
            console.warn('警告: 預設 Token 無效，請更新');
        }
    });
}

// 在頁面載入時測試
document.addEventListener('DOMContentLoaded', function() {
    testToken().then(valid => {
        if (!valid) {
            console.warn('請更新預設 Token！');
        }
    });
});

// 確保全局可訪問性
window.GITHUB_USERNAME = GITHUB_USERNAME;
window.GITHUB_REPO = GITHUB_REPO;
window.DEFAULT_TOKEN = DEFAULT_TOKEN;
window.isUserAuthenticated = isUserAuthenticated;
window.getStoredToken = getStoredToken;
window.showNotification = showNotification;
window.checkGitHubConnection = checkGitHubConnection;
window.debugAuthentication = debugAuthentication;
