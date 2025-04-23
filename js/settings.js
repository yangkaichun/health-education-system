// GitHub 設定
const GITHUB_USERNAME = 'yangkaichun';
const GITHUB_REPO = 'health-education-system';
const GITHUB_TOKEN = ''; // 會在前端透過登入取得

// 儲存設定到 GitHub
async function saveSettingsToGitHub(settings) {
    try {
        if (!GITHUB_TOKEN) {
            // 如果尚未登入，先導向 GitHub 認證
            await authenticateWithGitHub();
            return; // 認證成功後會重新調用此函數
        }
        
        // 首先獲取當前檔案 SHA (如果存在)
        let fileSha = '';
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/settings.json`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            fileSha = data.sha;
        } catch (error) {
            // 檔案可能不存在，繼續執行
            console.log('File may not exist yet:', error);
        }
        
        // 將設定轉換為 Base64 編碼
        const content = btoa(JSON.stringify(settings, null, 2));
        
        // 提交到 GitHub
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/settings.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Update settings',
                content: content,
                sha: fileSha || undefined
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        // 顯示成功訊息
        showSuccessMessage('設定已成功儲存到 GitHub');
    } catch (error) {
        alert('儲存到 GitHub 失敗: ' + error.message);
    }
}

// 從 GitHub 載入設定
async function loadSettingsFromGitHub() {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/settings.json`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        
        // 解碼 Base64 內容
        const content = atob(data.content);
        const settings = JSON.parse(content);
        
        // 儲存到本地
        localStorage.setItem('topicSettings', JSON.stringify(settings));
        
        // 重新載入設定
        loadTopicSettings();
        
        return true;
    } catch (error) {
        console.error('從 GitHub 載入設定失敗:', error);
        return false;
    }
}

// GitHub 認證
async function authenticateWithGitHub() {
    // 使用 GitHub OAuth 流程
    // 這需要在 GitHub 註冊一個 OAuth 應用
    const CLIENT_ID = '您的GitHub應用Client ID';
    const REDIRECT_URI = window.location.origin + '/settings.html';
    
    // 儲存當前URL，以便登入後返回
    sessionStorage.setItem('settings_redirect', window.location.href);
    
    // 重定向到 GitHub 登入頁面
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;
}

// 修改儲存設定函數
function saveAllSettings() {
    const topicSettings = JSON.parse(localStorage.getItem('topicSettings') || '[]');
    const nameInputs = document.querySelectorAll('.topic-name-input');
    const urlInputs = document.querySelectorAll('.youtube-url-input');
    
    // 更新主題名稱
    nameInputs.forEach(input => {
        const topicId = parseInt(input.getAttribute('data-id'));
        const index = topicSettings.findIndex(topic => topic.id === topicId);
        
        if (index >= 0) {
            topicSettings[index].name = input.value.trim() || `衛教主題 ${topicId}`;
        }
    });
    
    // 更新 YouTube URL
    urlInputs.forEach(input => {
        const topicId = parseInt(input.getAttribute('data-id'));
        const index = topicSettings.findIndex(topic => topic.id === topicId);
        
        if (index >= 0) {
            topicSettings[index].youtubeUrl = input.value.trim();
        }
    });
    
    // 儲存到本地
    localStorage.setItem('topicSettings', JSON.stringify(topicSettings));
    
    // 儲存到 GitHub
    saveSettingsToGitHub(topicSettings);
    
    // 顯示成功訊息
    document.getElementById('save-success-message').style.display = 'flex';
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 檢查 URL 是否包含 OAuth 回調碼
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // 獲取 token (這需要一個後端服務或代理)
        try {
            // 實際場景中，這應該發送到一個安全的後端服務
            // 為了示範，假設我們有一個獲取token的函數
            const token = await getGitHubToken(code);
            localStorage.setItem('github_token', token);
            GITHUB_TOKEN = token;
            
            // 清除 URL 參數
            window.history.replaceState({}, document.title, 'settings.html');
            
            // 如果有之前的重定向，返回
            const redirect = sessionStorage.getItem('settings_redirect');
            if (redirect) {
                sessionStorage.removeItem('settings_redirect');
                window.location.href = redirect;
                return;
            }
        } catch (error) {
            console.error('獲取 GitHub token 失敗:', error);
        }
    }
    
    // 從localStorage或URL獲取token
    GITHUB_TOKEN = localStorage.getItem('github_token');
    
    // 嘗試從 GitHub 載入設定
    const loaded = await loadSettingsFromGitHub();
    if (!loaded) {
        // 如果無法從 GitHub 載入，使用本地設定
        if (!localStorage.getItem('topicSettings')) {
            const defaultSettings = [];
            for (let i = 1; i <= 30; i++) {
                defaultSettings.push({
                    id: i,
                    name: `衛教主題 ${i}`,
                    youtubeUrl: ''
                });
            }
            localStorage.setItem('topicSettings', JSON.stringify(defaultSettings));
        }
    }
    
    // 載入設定到頁面
    loadTopicSettings();
});
