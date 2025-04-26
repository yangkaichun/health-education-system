// GitHub API 認證與初始化

// GitHub 認證設定
let GITHUB_TOKEN = localStorage.getItem('github_token') || '';
const GITHUB_USERNAME = 'yangkaichun'; // 替換為您的 GitHub 用戶名
const GITHUB_REPO = 'health-education-system'; // 替換為您的倉庫名稱

let isAuthenticated = false;

// 初始化頁面
function initPage() {
    document.addEventListener('DOMContentLoaded', checkAuthStatus);
}

// 檢查認證狀態
function checkAuthStatus() {
    if (GITHUB_TOKEN) {
        // 驗證 token 是否有效
        verifyGitHubToken()
            .then(valid => {
                isAuthenticated = valid;
                if (valid) {
                    console.log('User is already authenticated with GitHub');
                    onAuthSuccess();
                } else {
                    console.log('GitHub token is invalid');
                    showGitHubLoginForm();
                }
            });
    } else {
        console.log('User is not authenticated');
        showGitHubLoginForm();
    }
}

// 驗證 GitHub 令牌
async function verifyGitHubToken() {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        return response.status === 200;
    } catch (error) {
        console.error('Error verifying GitHub token:', error);
        return false;
    }
}

// 顯示 GitHub 登入表單
function showGitHubLoginForm() {
    // 建立模態框
    const modalContainer = document.createElement('div');
    modalContainer.className = 'auth-modal';
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.zIndex = '1000';
    
    // 創建表單
    const formContainer = document.createElement('div');
    formContainer.style.backgroundColor = 'white';
    formContainer.style.padding = '2rem';
    formContainer.style.borderRadius = '8px';
    formContainer.style.width = '90%';
    formContainer.style.maxWidth = '400px';
    
    // 標題
    const title = document.createElement('h2');
    title.textContent = 'GitHub 身份驗證';
    title.style.marginBottom = '1.5rem';
    title.style.color = '#4a89dc';
    
    // 說明
    const instruction = document.createElement('p');
    instruction.innerHTML = '請輸入您的 GitHub <a href="https://github.com/settings/tokens" target="_blank">個人訪問令牌</a>，需要 repo 權限。';
    instruction.style.marginBottom = '1.5rem';
    
    // 輸入框
    const tokenInput = document.createElement('input');
    tokenInput.type = 'text';
    tokenInput.placeholder = 'GitHub 個人訪問令牌';
    tokenInput.style.width = '100%';
    tokenInput.style.padding = '0.75rem';
    tokenInput.style.marginBottom = '1rem';
    tokenInput.style.border = '1px solid #ddd';
    tokenInput.style.borderRadius = '4px';
    
    // 按鈕
    const submitButton = document.createElement('button');
    submitButton.textContent = '登入';
    submitButton.style.backgroundColor = '#4a89dc';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.padding = '0.75rem 1.5rem';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.width = '100%';
    
    // 錯誤訊息
    const errorMessage = document.createElement('p');
    errorMessage.style.color = '#e74c3c';
    errorMessage.style.marginTop = '1rem';
    errorMessage.style.display = 'none';
    
    // 組合元素
    formContainer.appendChild(title);
    formContainer.appendChild(instruction);
    formContainer.appendChild(tokenInput);
    formContainer.appendChild(submitButton);
    formContainer.appendChild(errorMessage);
    modalContainer.appendChild(formContainer);
    document.body.appendChild(modalContainer);
    
    // 提交事件
    submitButton.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (!token) {
            errorMessage.textContent = '請輸入有效的令牌';
            errorMessage.style.display = 'block';
            return;
        }
        
        // 驗證令牌
        errorMessage.style.display = 'none';
        submitButton.disabled = true;
        submitButton.textContent = '驗證中...';
        
        fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`
            }
        })
        .then(response => {
            if (response.status === 200) {
                // 令牌有效
                GITHUB_TOKEN = token;
                localStorage.setItem('github_token', token);
                isAuthenticated = true;
                modalContainer.remove();
                onAuthSuccess();
            } else {
                // 令牌無效
                errorMessage.textContent = '無效的令牌或權限不足';
                errorMessage.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = '登入';
            }
        })
        .catch(error => {
            console.error('Error authenticating with GitHub:', error);
            errorMessage.textContent = '驗證過程中發生錯誤';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = '登入';
        });
    });
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
    
    // 5 秒後自動移除
    setTimeout(() => {
        errorContainer.remove();
    }, 5000);
}

// 授權成功後執行的函數
function onAuthSuccess() {
    // 將在其他 JS 檔案中定義和實現
    if (typeof onAuthenticated === 'function') {
        onAuthenticated();
    }
}

// 載入頁面時檢查認證
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});