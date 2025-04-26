// GitHub API 數據存儲

// GitHub 設定
const GITHUB_USERNAME = 'yangkaichun'; // 替換為您的 GitHub 用戶名
const GITHUB_REPO = 'health-education-system'; // 替換為您的倉庫名稱
const DATA_PATH = 'data';

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
    // 檢查檔案是否存在，不做實際操作
    console.log('GitHub storage initialized');
    return true;
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
            throw new Error(`GitHub API 回應錯誤: ${response.status}`);
        }
        
        const fileData = await response.json();
        const content = atob(fileData.content); // Base64 解碼
        const data = JSON.parse(content);
        
        // 更新緩存
        dataCache[cacheKey] = {
            data: data,
            timestamp: now,
            sha: fileData.sha  // 保存 SHA 用於更新
        };
        
        return data;
    } catch (error) {
        console.error(`讀取 GitHub 檔案 ${filename} 時發生錯誤:`, error);
        
        // 如果檔案不存在或無法讀取，返回預設資料
        let defaultData;
        
        if (filename === TOPICS_FILE) {
            defaultData = Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                name: `衛教主題 ${i + 1}`,
                youtubeUrl: ''
            }));
        } else if (filename === QUESTIONNAIRES_FILE) {
            defaultData = Array.from({ length: 30 }, (_, i) => ({
                topicId: i + 1,
                questions: []
            }));
        } else {
            defaultData = [];
        }
        
        return defaultData;
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
                console.log('File may not exist yet:', error);
            }
        }
        
        // 準備更新或創建檔案的請求參數
        const requestBody = {
            message: `更新 ${filename}`,
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
            throw new Error(`GitHub API 更新錯誤: ${response.status} - ${JSON.stringify(errorData)}`);
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
        return false;
    }
}

// API 函數
async function getAllTopics() {
    return await readGitHubFile(TOPICS_FILE);
}

async function updateTopics(topics) {
    return await updateGitHubFile(TOPICS_FILE, topics);
}

async function getQuestionnaire(topicId) {
    const questionnaires = await readGitHubFile(QUESTIONNAIRES_FILE);
    return questionnaires.find(q => q.topicId === topicId) || { topicId, questions: [] };
}

async function updateQuestionnaire(questionnaire) {
    const questionnaires = await readGitHubFile(QUESTIONNAIRES_FILE);
    const index = questionnaires.findIndex(q => q.topicId === questionnaire.topicId);
    
    if (index !== -1) {
        questionnaires[index] = questionnaire;
    } else {
        questionnaires.push(questionnaire);
    }
    
    return await updateGitHubFile(QUESTIONNAIRES_FILE, questionnaires);
}

async function getAllResults() {
    return await readGitHubFile(RESULTS_FILE);
}

async function addResult(result) {
    const results = await readGitHubFile(RESULTS_FILE);
    results.push(result);
    return await updateGitHubFile(RESULTS_FILE, results);
}

async function deleteResult(resultId) {
    let results = await readGitHubFile(RESULTS_FILE);
    results = results.filter(r => r.id !== resultId);
    return await updateGitHubFile(RESULTS_FILE, results);
}

async function updateNurseAcknowledged(resultId, acknowledged) {
    const results = await readGitHubFile(RESULTS_FILE);
    const index = results.findIndex(r => r.id === resultId);
    
    if (index !== -1) {
        results[index].nurseAcknowledged = acknowledged;
        return await updateGitHubFile(RESULTS_FILE, results);
    }
    
    return false;
}

async function getEmailList() {
    return await readGitHubFile(EMAILS_FILE);
}

async function updateEmailList(emails) {
    return await updateGitHubFile(EMAILS_FILE, emails);
}

// 備份數據功能 (可選)
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
            emails
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
        console.error('導出數據時發生錯誤:', error);
        alert('導出數據時發生錯誤');
    });
}

// 匯入數據功能 (可選)
async function importAllData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        const promises = [];
        
        if (data.topics) {
            promises.push(updateGitHubFile(TOPICS_FILE, data.topics));
        }
        
        if (data.questionnaires) {
            promises.push(updateGitHubFile(QUESTIONNAIRES_FILE, data.questionnaires));
        }
        
        if (data.results) {
            promises.push(updateGitHubFile(RESULTS_FILE, data.results));
        }
        
        if (data.emails) {
            promises.push(updateGitHubFile(EMAILS_FILE, data.emails));
        }
        
        await Promise.all(promises);
        return true;
    } catch (error) {
        console.error('匯入數據時發生錯誤:', error);
        return false;
    }
}

// 傳送通知 Email (模擬功能)
async function sendNotificationEmail(result) {
    // 由於 GitHub Pages 無法發送 Email，這裡只進行模擬
    console.log(`模擬發送通知郵件：有關主題 ${result.topicId} 的新問卷結果`);
    
    // 獲取 Email 列表
    const emails = await getEmailList();
    const enabledEmails = emails.filter(email => email.enabled);
    
    if (enabledEmails.length > 0) {
        console.log(`通知將發送至: ${enabledEmails.map(e => e.email).join(', ')}`);
    } else {
        console.log('沒有啟用的 Email 地址可以通知');
    }
    
    return true;
}