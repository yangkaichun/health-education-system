// GitHub API 數據存儲

// GitHub 設定
const GITHUB_USERNAME = 'yangkaichun'; // 替換為您的 GitHub 用戶名
const GITHUB_REPO = 'health-education-system'; // 替換為您的倉庫名稱
const DATA_PATH = 'data';

const GITHUB_TOKEN = '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';

// 檔案路徑
const TOPICS_FILE = 'topics.json';
const QUESTIONNAIRES_FILE = 'questionnaires.json';
const RESULTS_FILE = 'results.json';
const EMAILS_FILE = 'emails.json';

// 緩存設定
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分鐘緩存過期
let dataCache = {
    topics: { data: null, timestamp: 0 },
    questionnaires: { data: null, timestamp: 0 },
    results: { data: null, timestamp: 0 },
    emails: { data: null, timestamp: 0 }
};

// 初始化 GitHub 儲存
async function initializeGitHubStorage() {
    try {
        // 檢查所有必要的檔案是否存在，如果不存在會創建默認數據
        await readGitHubFile(TOPICS_FILE);
        await readGitHubFile(QUESTIONNAIRES_FILE);
        await readGitHubFile(RESULTS_FILE);
        await readGitHubFile(EMAILS_FILE);
        
        console.log('GitHub storage initialized successfully');
        return true;
    } catch (error) {
        console.error('初始化 GitHub 儲存時發生錯誤:', error);
        return false;
    }
}

// 從 GitHub 讀取檔案
async function readGitHubFile(filename) {
    const cacheKey = filename.replace('.json', '');
    const now = Date.now();
    
    // 檢查緩存
    if (dataCache[cacheKey] && 
        dataCache[cacheKey].data && 
        now - dataCache[cacheKey].timestamp < CACHE_EXPIRY) {
        return dataCache[cacheKey].data;
    }
    
    try {
        // 獲取檔案內容
        const token = localStorage.getItem('github_token');
        const headers = token ? { 'Authorization': `token ${token}` } : {};
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_PATH}/${filename}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                ...headers
            }
        });
        
        if (!response.ok) {
            // 如果檔案不存在，返回初始資料並嘗試創建檔案
            if (response.status === 404) {
                console.log(`檔案 ${filename} 不存在，將創建並返回初始資料`);
                const defaultData = initializeDefaultData(filename);
                
                // 嘗試創建檔案
                if (token) {
                    try {
                        await updateGitHubFile(filename, defaultData);
                    } catch (createError) {
                        console.warn(`無法創建檔案 ${filename}:`, createError);
                    }
                }
                
                return defaultData;
            }
            
            throw new Error(`GitHub API 回應錯誤: ${response.status}`);
        }
        
        const fileData = await response.json();
        let content;
        try {
            content = atob(fileData.content); // Base64 解碼
        } catch (error) {
            console.error('Base64 解碼失敗:', error);
            content = '[]'; // 使用空陣列作為備用
        }
        
        let data;
        try {
            data = JSON.parse(content);
        } catch (error) {
            console.error('JSON 解析失敗:', error);
            data = initializeDefaultData(filename);
        }
        
        // 更新緩存
        dataCache[cacheKey] = {
            data: data,
            timestamp: now,
            sha: fileData.sha  // 保存 SHA 用於更新
        };
        
        return data;
    } catch (error) {
        console.error(`讀取 GitHub 檔案 ${filename} 時發生錯誤:`, error);
        return initializeDefaultData(filename);
    }
}

// 更新 GitHub 檔案
async function updateGitHubFile(filename, data) {
    try {
        const token = localStorage.getItem('github_token');
        if (!token) {
            throw new Error('需要 GitHub 令牌才能更新檔案');
        }
        
        const cacheKey = filename.replace('.json', '');
        const content = JSON.stringify(data, null, 2);
        const contentEncoded = btoa(unescape(encodeURIComponent(content))); // 處理 UTF-8 編碼
        
        // 獲取檔案 SHA
        let sha = null;
        if (dataCache[cacheKey] && dataCache[cacheKey].sha) {
            sha = dataCache[cacheKey].sha;
        } else {
            // 如果緩存沒有 SHA，先獲取檔案資訊
            try {
                const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_PATH}/${filename}`, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (fileResponse.ok) {
                    const fileData = await fileResponse.json();
                    sha = fileData.sha;
                }
            } catch (error) {
                console.log('檔案可能不存在，將創建新檔案:', error);
            }
        }
        
        // 準備更新或創建檔案的請求參數
        const requestBody = {
            message: `更新 ${filename} - ${new Date().toISOString()}`,
            content: contentEncoded,
        };
        
        if (sha) {
            requestBody.sha = sha;
        }
        
        // 發送更新請求
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_PATH}/${filename}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API 更新錯誤詳情:', errorData);
            throw new Error(`GitHub API 更新錯誤: ${response.status} - ${errorData.message || '未知錯誤'}`);
        }
        
        const responseData = await response.json();
        
        // 更新緩存
        dataCache[cacheKey] = {
            data: data,
            timestamp: Date.now(),
            sha: responseData.content.sha
        };
        
        return true;
    } catch (error) {
        console.error(`更新 GitHub 檔案 ${filename} 時發生錯誤:`, error);
        throw error; // 將錯誤傳播出去，以便調用者能夠處理
    }
}

// 為不同檔案產生預設資料
function initializeDefaultData(filename) {
    switch(filename) {
        case TOPICS_FILE:
            return Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                name: `衛教主題 ${i + 1}`,
                youtubeUrl: ''
            }));
        case QUESTIONNAIRES_FILE:
            return Array.from({ length: 30 }, (_, i) => ({
                topicId: i + 1,
                questions: []
            }));
        case RESULTS_FILE:
            return [];
        case EMAILS_FILE:
            return [];
        default:
            return [];
    }
}

// API 函數
async function getAllTopics() {
    try {
        const topics = await readGitHubFile(TOPICS_FILE);
        return Array.isArray(topics) ? topics : initializeDefaultData(TOPICS_FILE);
    } catch (error) {
        console.error('獲取所有主題時發生錯誤:', error);
        return initializeDefaultData(TOPICS_FILE);
    }
}

async function updateTopics(topics) {
    try {
        // 確保資料有效
        if (!Array.isArray(topics)) {
            throw new Error('主題資料必須是陣列');
        }
        
        // 確保每個主題都有必要的屬性
        const validatedTopics = topics.map(topic => ({
            id: topic.id,
            name: topic.name || `衛教主題 ${topic.id}`,
            youtubeUrl: topic.youtubeUrl || ''
        }));
        
        return await updateGitHubFile(TOPICS_FILE, validatedTopics);
    } catch (error) {
        console.error('更新主題時發生錯誤:', error);
        throw error;
    }
}

async function getQuestionnaire(topicId) {
    try {
        const questionnaires = await readGitHubFile(QUESTIONNAIRES_FILE);
        
        if (!Array.isArray(questionnaires)) {
            return { topicId, questions: [] };
        }
        
        // 找出對應的問卷
        const questionnaire = questionnaires.find(q => q.topicId === topicId);
        
        if (questionnaire) {
            // 確保問卷有 questions 陣列
            if (!questionnaire.questions) {
                questionnaire.questions = [];
            }
            return questionnaire;
        }
        
        // 未找到對應問卷，返回新的問卷物件
        return { topicId, questions: [] };
    } catch (error) {
        console.error(`獲取問卷 (topicId: ${topicId}) 時發生錯誤:`, error);
        return { topicId, questions: [] };
    }
}

async function updateQuestionnaire(questionnaire) {
    try {
        // 驗證問卷資料
        if (!questionnaire || typeof questionnaire !== 'object') {
            throw new Error('問卷資料無效');
        }
        
        if (!questionnaire.topicId) {
            throw new Error('問卷缺少 topicId');
        }
        
        // 確保問卷有 questions 陣列
        if (!questionnaire.questions) {
            questionnaire.questions = [];
        }
        
        // 讀取所有問卷
        const questionnaires = await readGitHubFile(QUESTIONNAIRES_FILE);
        
        if (!Array.isArray(questionnaires)) {
            throw new Error('問卷資料格式無效');
        }
        
        // 尋找對應的問卷
        const index = questionnaires.findIndex(q => q.topicId === questionnaire.topicId);
        
        if (index !== -1) {
            // 更新現有問卷
            questionnaires[index] = questionnaire;
        } else {
            // 新增問卷
            questionnaires.push(questionnaire);
        }
        
        // 保存到 GitHub
        return await updateGitHubFile(QUESTIONNAIRES_FILE, questionnaires);
    } catch (error) {
        console.error('更新問卷時發生錯誤:', error);
        throw error;
    }
}

async function getAllResults() {
    try {
        const results = await readGitHubFile(RESULTS_FILE);
        return Array.isArray(results) ? results : [];
    } catch (error) {
        console.error('獲取所有結果時發生錯誤:', error);
        return [];
    }
}

async function addResult(result) {
    try {
        // 驗證結果資料
        if (!result || typeof result !== 'object') {
            throw new Error('結果資料無效');
        }
        
        if (!result.id) {
            result.id = Date.now().toString(); // 使用時間戳作為 ID
        }
        
        // 讀取所有結果
        const results = await readGitHubFile(RESULTS_FILE);
        
        if (!Array.isArray(results)) {
            throw new Error('結果資料格式無效');
        }
        
        // 新增結果
        results.push(result);
        
        // 保存到 GitHub
        return await updateGitHubFile(RESULTS_FILE, results);
    } catch (error) {
        console.error('新增結果時發生錯誤:', error);
        throw error;
    }
}

async function deleteResult(resultId) {
    try {
        if (!resultId) {
            throw new Error('結果 ID 無效');
        }
        
        // 讀取所有結果
        const results = await readGitHubFile(RESULTS_FILE);
        
        if (!Array.isArray(results)) {
            throw new Error('結果資料格式無效');
        }
        
        // 過濾掉要刪除的結果
        const filteredResults = results.filter(r => r.id !== resultId);
        
        // 檢查是否有結果被刪除
        if (filteredResults.length === results.length) {
            console.warn(`未找到結果 ID: ${resultId}`);
        }
        
        // 保存到 GitHub
        return await updateGitHubFile(RESULTS_FILE, filteredResults);
    } catch (error) {
        console.error('刪除結果時發生錯誤:', error);
        throw error;
    }
}

async function updateNurseAcknowledged(resultId, acknowledged) {
    try {
        if (!resultId) {
            throw new Error('結果 ID 無效');
        }
        
        // 讀取所有結果
        const results = await readGitHubFile(RESULTS_FILE);
        
        if (!Array.isArray(results)) {
            throw new Error('結果資料格式無效');
        }
        
        // 尋找對應的結果
        const index = results.findIndex(r => r.id === resultId);
        
        if (index === -1) {
            throw new Error(`未找到結果 ID: ${resultId}`);
        }
        
        // 更新護理師確認狀態
        results[index].nurseAcknowledged = acknowledged;
        
        // 保存到 GitHub
        return await updateGitHubFile(RESULTS_FILE, results);
    } catch (error) {
        console.error('更新護理師確認狀態時發生錯誤:', error);
        throw error;
    }
}

async function getEmailList() {
    try {
        const emails = await readGitHubFile(EMAILS_FILE);
        return Array.isArray(emails) ? emails : [];
    } catch (error) {
        console.error('獲取 Email 列表時發生錯誤:', error);
        return [];
    }
}

async function updateEmailList(emails) {
    try {
        // 驗證 Email 列表
        if (!Array.isArray(emails)) {
            throw new Error('Email 列表必須是陣列');
        }
        
        // 確保每個 Email 物件都有必要的屬性
        const validatedEmails = emails.map(email => ({
            email: email.email,
            enabled: email.enabled !== undefined ? email.enabled : true
        }));
        
        // 保存到 GitHub
        return await updateGitHubFile(EMAILS_FILE, validatedEmails);
    } catch (error) {
        console.error('更新 Email 列表時發生錯誤:', error);
        throw error;
    }
}

// 傳送通知 Email
async function sendNotificationEmail(result) {
    try {
        // 由於 GitHub Pages 無法發送實際的 Email，這裡只是模擬操作
        console.log(`[模擬] 發送通知郵件：有關主題 ${result.topicId} 的新問卷結果`);
        
        // 獲取 Email 列表
        const emails = await getEmailList();
        const enabledEmails = emails.filter(email => email.enabled);
        
        if (enabledEmails.length > 0) {
            console.log(`[模擬] 通知將發送至: ${enabledEmails.map(e => e.email).join(', ')}`);
        } else {
            console.log('[模擬] 沒有啟用的 Email 地址可以通知');
        }
        
        // 在實際應用中，這裡應該使用 Email 服務 API 發送郵件
        // 例如：SendGrid, Mailgun, AWS SES 等
        
        return true;
    } catch (error) {
        console.error('發送通知郵件時發生錯誤:', error);
        return false;
    }
}

// 備份數據功能
function exportAllData() {
    Promise.all([
        readGitHubFile(TOPICS_FILE),
        readGitHubFile(QUESTIONNAIRES_FILE),
        readGitHubFile(RESULTS_FILE),
        readGitHubFile(EMAILS_FILE)
    ])
    .then(([topics, questionnaires, results, emails]) => {
        const allData = {
            topics,
            questionnaires,
            results,
            emails,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(allData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `healthcare_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    })
    .catch(error => {
        console.error('匯出數據時發生錯誤:', error);
        alert('匯出數據時發生錯誤: ' + error.message);
    });
}

// 匯入數據功能
async function importAllData(jsonData) {
    try {
        let data;
        try {
            data = JSON.parse(jsonData);
        } catch (error) {
            throw new Error('JSON 解析失敗: ' + error.message);
        }
        
        const promises = [];
        let importSummary = [];
        
        if (data.topics && Array.isArray(data.topics)) {
            promises.push(updateGitHubFile(TOPICS_FILE, data.topics));
            importSummary.push(`主題: ${data.topics.length} 筆`);
        }
        
        if (data.questionnaires && Array.isArray(data.questionnaires)) {
            promises.push(updateGitHubFile(QUESTIONNAIRES_FILE, data.questionnaires));
            importSummary.push(`問卷: ${data.questionnaires.length} 筆`);
        }
        
        if (data.results && Array.isArray(data.results)) {
            promises.push(updateGitHubFile(RESULTS_FILE, data.results));
            importSummary.push(`結果: ${data.results.length} 筆`);
        }
        
        if (data.emails && Array.isArray(data.emails)) {
            promises.push(updateGitHubFile(EMAILS_FILE, data.emails));
            importSummary.push(`Email: ${data.emails.length} 筆`);
        }
        
        if (promises.length === 0) {
            throw new Error('找不到有效的資料');
        }
        
        await Promise.all(promises);
        console.log('成功匯入: ' + importSummary.join(', '));
        
        // 清除緩存
        dataCache = {
            topics: { data: null, timestamp: 0 },
            questionnaires: { data: null, timestamp: 0 },
            results: { data: null, timestamp: 0 },
            emails: { data: null, timestamp: 0 }
        };
        
        return true;
    } catch (error) {
        console.error('匯入數據時發生錯誤:', error);
        throw error;
    }
}

// 檢查 GitHub 連接狀態
async function checkGitHubConnection() {
    try {
        const token = localStorage.getItem('github_token');
        const headers = token ? { 'Authorization': `token ${token}` } : {};
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                ...headers
            }
        });
        
        if (response.ok) {
            const repoData = await response.json();
            console.log(`成功連接到 GitHub 倉庫: ${repoData.full_name}`);
            return {
                connected: true,
                repoName: repoData.full_name,
                repoUrl: repoData.html_url
            };
        } else {
            throw new Error(`GitHub API 回應錯誤: ${response.status}`);
        }
    } catch (error) {
        console.error('檢查 GitHub 連接時發生錯誤:', error);
        return {
            connected: false,
            error: error.message
        };
    }
}

// 同步本地緩存
function invalidateCache() {
    dataCache = {
        topics: { data: null, timestamp: 0 },
        questionnaires: { data: null, timestamp: 0 },
        results: { data: null, timestamp: 0 },
        emails: { data: null, timestamp: 0 }
    };
    console.log('本地緩存已清除');
}
