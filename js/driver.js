// Google Drive API 操作功能

// 檔案 ID 常數（這些 ID 將在首次創建相應檔案時設置）
let CONFIG_FILE_ID = localStorage.getItem('configFileId') || '';
let TOPICS_FILE_ID = localStorage.getItem('topicsFileId') || '';
let QUESTIONNAIRES_FILE_ID = localStorage.getItem('questionnairesFileId') || '';
let RESULTS_FILE_ID = localStorage.getItem('resultsFileId') || '';
let EMAILS_FILE_ID = localStorage.getItem('emailsFileId') || '';

// 資料檔案名稱
const CONFIG_FILE_NAME = 'healthcare_config.json';
const TOPICS_FILE_NAME = 'healthcare_topics.json';
const QUESTIONNAIRES_FILE_NAME = 'healthcare_questionnaires.json';
const RESULTS_FILE_NAME = 'healthcare_results.json';
const EMAILS_FILE_NAME = 'healthcare_emails.json';

// 檢查並創建必要的檔案
async function initializeDriveFiles() {
    try {
        // 檢查並創建配置檔案
        if (!CONFIG_FILE_ID) {
            CONFIG_FILE_ID = await createJsonFile(CONFIG_FILE_NAME, { version: "1.0" });
            localStorage.setItem('configFileId', CONFIG_FILE_ID);
        }
        
        // 檢查並創建主題檔案
        if (!TOPICS_FILE_ID) {
            // 創建 30 個初始主題
            const initialTopics = Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                name: `衛教主題 ${i + 1}`,
                youtubeUrl: ''
            }));
            
            TOPICS_FILE_ID = await createJsonFile(TOPICS_FILE_NAME, initialTopics);
            localStorage.setItem('topicsFileId', TOPICS_FILE_ID);
        }
        
        // 檢查並創建問卷檔案
        if (!QUESTIONNAIRES_FILE_ID) {
            // 創建 30 個空問卷
            const initialQuestionnaires = Array.from({ length: 30 }, (_, i) => ({
                topicId: i + 1,
                questions: []
            }));
            
            QUESTIONNAIRES_FILE_ID = await createJsonFile(QUESTIONNAIRES_FILE_NAME, initialQuestionnaires);
            localStorage.setItem('questionnairesFileId', QUESTIONNAIRES_FILE_ID);
        }
        
        // 檢查並創建結果檔案
        if (!RESULTS_FILE_ID) {
            RESULTS_FILE_ID = await createJsonFile(RESULTS_FILE_NAME, []);
            localStorage.setItem('resultsFileId', RESULTS_FILE_ID);
        }
        
        // 檢查並創建 Email 檔案
        if (!EMAILS_FILE_ID) {
            EMAILS_FILE_ID = await createJsonFile(EMAILS_FILE_NAME, []);
            localStorage.setItem('emailsFileId', EMAILS_FILE_ID);
        }
        
        console.log('All Drive files initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Drive files:', error);
        return false;
    }
}

// 創建 JSON 檔案
async function createJsonFile(fileName, data) {
    // 將資料轉換為 JSON 字串
    const content = JSON.stringify(data, null, 2);
    
    // 建立檔案的中繼資料
    const fileMetadata = {
        name: fileName,
        mimeType: 'application/json'
    };
    
    // 建立多部分請求內容
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));
    
    // 上傳檔案
    const response = await gapi.client.request({
        path: 'https://www.googleapis.com/upload/drive/v3/files',
        method: 'POST',
        params: {
            uploadType: 'multipart'
        },
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        body: form
    });
    
    // 返回新建立的檔案 ID
    return response.result.id;
}

// 讀取 JSON 檔案
async function readJsonFile(fileId) {
    try {
        // 先取得檔案的下載 URL
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'webContentLink'
        });
        
        // 直接下載檔案內容
        const metaResponse = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        // 返回解析後的 JSON 資料
        return JSON.parse(metaResponse.body);
    } catch (error) {
        console.error('Error reading JSON file:', error);
        throw error;
    }
}

// 更新 JSON 檔案
async function updateJsonFile(fileId, data) {
    try {
        // 將資料轉換為 JSON 字串
        const content = JSON.stringify(data, null, 2);
        
        // 更新檔案內容
        await gapi.client.request({
            path: '/upload/drive/v3/files/' + fileId,
            method: 'PATCH',
            params: {
                uploadType: 'media'
            },
            body: content
        });
        
        return true;
    } catch (error) {
        console.error('Error updating JSON file:', error);
        throw error;
    }
}

// 取得所有衛教主題
async function getAllTopics() {
    try {
        return await readJsonFile(TOPICS_FILE_ID);
    } catch (error) {
        console.error('Error getting all topics:', error);
        return [];
    }
}

// 更新衛教主題
async function updateTopics(topics) {
    try {
        await updateJsonFile(TOPICS_FILE_ID, topics);
        return true;
    } catch (error) {
        console.error('Error updating topics:', error);
        return false;
    }
}

// 取得特定主題的問卷
async function getQuestionnaire(topicId) {
    try {
        const questionnaires = await readJsonFile(QUESTIONNAIRES_FILE_ID);
        return questionnaires.find(q => q.topicId === topicId) || { topicId, questions: [] };
    } catch (error) {
        console.error('Error getting questionnaire:', error);
        return { topicId, questions: [] };
    }
}

// 更新特定主題的問卷
async function updateQuestionnaire(questionnaire) {
    try {
        const questionnaires = await readJsonFile(QUESTIONNAIRES_FILE_ID);
        const index = questionnaires.findIndex(q => q.topicId === questionnaire.topicId);
        
        if (index !== -1) {
            questionnaires[index] = questionnaire;
        } else {
            questionnaires.push(questionnaire);
        }
        
        await updateJsonFile(QUESTIONNAIRES_FILE_ID, questionnaires);
        return true;
    } catch (error) {
        console.error('Error updating questionnaire:', error);
        return false;
    }
}

// 取得所有結果
async function getAllResults() {
    try {
        return await readJsonFile(RESULTS_FILE_ID);
    } catch (error) {
        console.error('Error getting all results:', error);
        return [];
    }
}

// 添加新結果
async function addResult(result) {
    try {
        const results = await readJsonFile(RESULTS_FILE_ID);
        results.push(result);
        await updateJsonFile(RESULTS_FILE_ID, results);
        return true;
    } catch (error) {
        console.error('Error adding result:', error);
        return false;
    }
}

// 刪除結果
async function deleteResult(resultId) {
    try {
        let results = await readJsonFile(RESULTS_FILE_ID);
        results = results.filter(r => r.id !== resultId);
        await updateJsonFile(RESULTS_FILE_ID, results);
        return true;
    } catch (error) {
        console.error('Error deleting result:', error);
        return false;
    }
}

// 更新護理師已知曉狀態
async function updateNurseAcknowledged(resultId, acknowledged) {
    try {
        const results = await readJsonFile(RESULTS_FILE_ID);
        const index = results.findIndex(r => r.id === resultId);
        
        if (index !== -1) {
            results[index].nurseAcknowledged = acknowledged;
            await updateJsonFile(RESULTS_FILE_ID, results);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error updating nurse acknowledged status:', error);
        return false;
    }
}

// 取得 Email 通知清單
async function getEmailList() {
    try {
        return await readJsonFile(EMAILS_FILE_ID);
    } catch (error) {
        console.error('Error getting email list:', error);
        return [];
    }
}

// 更新 Email 通知清單
async function updateEmailList(emails) {
    try {
        await updateJsonFile(EMAILS_FILE_ID, emails);
        return true;
    } catch (error) {
        console.error('Error updating email list:', error);
        return false;
    }
}

// 傳送通知 Email
async function sendNotificationEmail(result) {
    try {
        // 取得 Email 清單
        const emails = await getEmailList();
        const enabledEmails = emails.filter(email => email.enabled);
        
        if (enabledEmails.length === 0) {
            console.log('No enabled emails to notify');
            return true;
        }
        
        // 在此處，您可以實現實際的 Email 傳送邏輯
        // 由於這需要後端服務，我們在此僅模擬此功能
        console.log(`Notification would be sent to: ${enabledEmails.map(e => e.email).join(', ')}`);
        console.log(`Notification content: New questionnaire completed for Topic ${result.topicId}`);
        
        return true;
    } catch (error) {
        console.error('Error sending notification email:', error);
        return false;
    }
}