// GitHub 認證相關功能

// 全域變數
let isAuthenticated = false;
const GITHUB_TOKEN_KEY = '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';
const GITHUB_USERNAME = 'yangkaichun'; // 替換為您的 GitHub 用戶名
const GITHUB_REPO = 'health-education-system'; // 替換為您的倉庫名稱

// 頁面載入時初始化認證
document.addEventListener('DOMContentLoaded', initializeAuth);

// 初始化認證
function initializeAuth() {
    // 設置認證相關事件監聽
    setupAuthListeners();
    
    // 檢查是否已有 Token
    const token = localStorage.getItem(GITHUB_TOKEN_KEY);
    
    if (token) {
        // 驗證 Token 是否有效
        validateToken(token)
            .then(valid => {
                if (valid) {
                    completeAuthentication(token);
                } else {
                    showAuthForm();
                }
            })
            .catch(error => {
                console.error('Token 驗證失敗:', error);
                showAuthForm();
            });
    } else {
        showAuthForm();
    }
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
        // 檢查對儲存庫的訪問權限
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        return response.status === 200;
    } catch (error) {
        console.error('Token 驗證錯誤:', error);
        return false;
    }
}

// 完成認證
function completeAuthentication(token) {
    // 儲存 Token
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
    isAuthenticated = true;
    
    // 隱藏認證表單，顯示管理界面
    hideAuthForm();
    showGitHubStatus(true);
    
    // 顯示成功訊息
    showNotification('GitHub 認證成功', 'success');
    
    // 初始化系統資料
    if (typeof onAuthenticated === 'function') {
        onAuthenticated();
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
        showConnectionStatus('檢查中...', 'loading');
        
        const token = localStorage.getItem(GITHUB_TOKEN_KEY);
        
        if (!token) {
            showConnectionStatus('未認證', 'error');
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
            showConnectionStatus('已連接', 'success');
            return {
                connected: true,
                repoName: repoData.full_name,
                repoUrl: repoData.html_url
            };
        } else {
            const errorData = await response.json();
            showConnectionStatus('連接失敗', 'error');
            return {
                connected: false,
                error: `GitHub API 錯誤: ${response.status} - ${errorData.message}`
            };
        }
    } catch (error) {
        console.error('檢查 GitHub 連接時發生錯誤:', error);
        showConnectionStatus('連接錯誤', 'error');
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

// 顯示 GitHub 狀態區塊
function showGitHubStatus(isConnected) {
    const statusSection = document.getElementById('github-status');
    if (statusSection) {
        statusSection.style.display = 'block';
        
        if (isConnected) {
            showConnectionStatus('已連接', 'success');
        } else {
            showConnectionStatus('未連接', 'error');
        }
    }
}

// 顯示認證表單
function showAuthForm() {
    const authSection = document.getElementById('github-auth');
    const contentSections = document.querySelectorAll('main > section:not(#github-auth):not(#github-status)');
    const githubStatus = document.getElementById('github-status');
    
    if (authSection) {
        authSection.style.display = 'block';
    }
    
    if (githubStatus) {
        githubStatus.style.display = 'none';
    }
    
    // 隱藏內容區塊
    contentSections.forEach(section => {
        section.style.display = 'none';
    });
}

// 隱藏認證表單
function hideAuthForm() {
    const authSection = document.getElementById('github-auth');
    const contentSections = document.querySelectorAll('main > section:not(#github-auth)');
    
    if (authSection) {
        authSection.style.display = 'none';
    }
    
    // 顯示內容區塊
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
    return isAuthenticated;
}

// 獲取存儲的 Token
function getStoredToken() {
    return localStorage.getItem(GITHUB_TOKEN_KEY);
}
