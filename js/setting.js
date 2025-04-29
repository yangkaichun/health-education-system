// setting.js - 衛教設定頁面功能

let bedSettings = []; // 存儲所有床號設定
let topics = []; // 存儲所有主題
let isInitialized = false;

// 當 GitHub API 認證完成時
function onAuthenticated() {
    // 避免重複初始化
    if (isInitialized) return;
    isInitialized = true;
    
    console.log("認證成功，初始化設定頁面");
    
    initializeGitHubStorage().then(success => {
        if (success) {
            loadTopics();
            loadBedSettings();
            setupEventListeners();
        } else {
            showNotification('初始化儲存失敗，請檢查 GitHub 連接', 'error');
        }
    }).catch(error => {
        console.error('初始化存儲錯誤:', error);
        showNotification('初始化存儲時發生錯誤: ' + error.message, 'error');
    });
}

// 設置事件監聽器
function setupEventListeners() {
    // 新增床號按鈕
    const addBedBtn = document.getElementById('add-bed-button');
    if (addBedBtn) {
        addBedBtn.addEventListener('click', addBedSetting);
    }
    
    // 儲存設定按鈕
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveAllSettings);
    }
}

// 載入衛教主題
async function loadTopics() {
    try {
        topics = await getAllTopics();
        
        if (!Array.isArray(topics) || topics.length === 0) {
            console.warn('Empty or invalid topics data, initializing defaults');
            topics = Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                name: `衛教主題 ${i + 1}`,
                youtubeUrl: ''
            }));
        }
        
        renderTopicSelections();
    } catch (error) {
        console.error('Error loading topics:', error);
        showNotification('載入衛教主題時發生錯誤: ' + error.message, 'error');
    }
}

// 載入床號設定
async function loadBedSettings() {
    try {
        // 嘗試從GitHub讀取床號設定檔
        const settings = await getFileFromGitHub('data/bed-settings.json');
        
        if (settings) {
            try {
                bedSettings = JSON.parse(settings);
                renderBedSettings();
            } catch (parseError) {
                console.error('Error parsing bed settings:', parseError);
                showNotification('解析床號設定檔案時發生錯誤', 'error');
                bedSettings = [];
            }
        } else {
            console.log('No existing bed settings found, starting with empty list');
            bedSettings = [];
        }
    } catch (error) {
        console.error('Error loading bed settings:', error);
        showNotification('載入床號設定時發生錯誤: ' + error.message, 'error');
        bedSettings = [];
    }
    
    // 無論如何都要渲染床號設定列表
    renderBedSettings();
}

// 渲染主題選擇列表
function renderTopicSelections() {
    // 為每個床號設定更新主題選擇
    const bedItems = document.querySelectorAll('.bed-item');
    
    bedItems.forEach(bedItem => {
        const topicSelector = bedItem.querySelector('.topic-selector');
        if (topicSelector) {
            renderTopicSelectorOptions(topicSelector);
        }
    });
}

// 為主題選擇器新增選項
function renderTopicSelectorOptions(topicSelector) {
    // 保存已選擇的主題
    const selectedTopics = [...topicSelector.querySelectorAll('input:checked')].map(
        input => parseInt(input.value)
    );
    
    // 清空選擇器
    topicSelector.innerHTML = '';
    
    // 新增所有主題選項
    topics.forEach(topic => {
        const topicDiv = document.createElement('div');
        topicDiv.className = 'topic-option';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `topic-${topicSelector.dataset.bedId}-${topic.id}`;
        checkbox.value = topic.id;
        checkbox.checked = selectedTopics.includes(topic.id);
        
        const label = document.createElement('label');
        label.htmlFor = `topic-${topicSelector.dataset.bedId}-${topic.id}`;
        label.textContent = topic.name || `衛教主題 ${topic.id}`;
        
        topicDiv.appendChild(checkbox);
        topicDiv.appendChild(label);
        topicSelector.appendChild(topicDiv);
    });
}

// 渲染床號設定列表
function renderBedSettings() {
    const settingsList = document.getElementById('settings-list');
    
    if (!settingsList) return;
    
    // 清空列表
    settingsList.innerHTML = '';
    
    // 如果沒有床號設定，顯示提示
    if (bedSettings.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-settings';
        emptyMessage.textContent = '尚未設定任何床號，請點擊"新增床號"按鈕開始設定。';
        settingsList.appendChild(emptyMessage);
        return;
    }
    
    // 渲染所有床號設定
    bedSettings.forEach((setting, index) => {
        const settingItem = document.createElement('div');
        settingItem.className = 'bed-item';
        
        // 床號標題
        const header = document.createElement('div');
        header.className = 'bed-header';
        
        const title = document.createElement('h3');
        title.textContent = `床號: ${setting.bedNumber}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-bed';
        deleteBtn.textContent = '刪除';
        deleteBtn.addEventListener('click', () => deleteBedSetting(index));
        
        header.appendChild(title);
        header.appendChild(deleteBtn);
        settingItem.appendChild(header);
        
        // 主題選擇器
        const topicSelector = document.createElement('div');
        topicSelector.className = 'topic-selector';
        topicSelector.dataset.bedId = index;
        settingItem.appendChild(topicSelector);
        
        settingsList.appendChild(settingItem);
        
        // 渲染主題選項
        renderTopicSelectorOptions(topicSelector);
        
        // 預選已選擇的主題
        if (setting.topicIds && Array.isArray(setting.topicIds)) {
            setting.topicIds.forEach(topicId => {
                const checkbox = topicSelector.querySelector(`input[value="${topicId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    });
}

// 新增床號設定
function addBedSetting() {
    const bedNumberInput = document.getElementById('bed-number');
    const bedNumber = bedNumberInput.value.trim();
    
    if (!bedNumber) {
        showNotification('請輸入床號', 'warning');
        return;
    }
    
    // 檢查是否已存在相同床號
    const exists = bedSettings.some(setting => setting.bedNumber === bedNumber);
    
    if (exists) {
        showNotification('此床號已存在', 'warning');
        return;
    }
    
    // 新增床號設定
    bedSettings.push({
        bedNumber: bedNumber,
        topicIds: []
    });
    
    // 清空輸入框
    bedNumberInput.value = '';
    
    // 重新渲染床號設定列表
    renderBedSettings();
    
    showNotification(`已新增床號: ${bedNumber}`, 'success');
}

// 刪除床號設定
function deleteBedSetting(index) {
    if (index < 0 || index >= bedSettings.length) return;
    
    const bedNumber = bedSettings[index].bedNumber;
    
    // 確認刪除
    if (confirm(`確定要刪除床號 ${bedNumber} 的設定嗎？`)) {
        bedSettings.splice(index, 1);
        renderBedSettings();
        showNotification(`已刪除床號: ${bedNumber}`, 'success');
    }
}

// 儲存所有設定
async function saveAllSettings() {
    // 更新每個床號的主題選擇
    const bedItems = document.querySelectorAll('.bed-item');
    
    bedItems.forEach((bedItem, index) => {
        const topicSelector = bedItem.querySelector('.topic-selector');
        if (topicSelector) {
            const selectedTopics = [...topicSelector.querySelectorAll('input:checked')].map(
                input => parseInt(input.value)
            );
            
            bedSettings[index].topicIds = selectedTopics;
        }
    });
    
    try {
        // 顯示儲存中
        const saveBtn = document.getElementById('save-settings');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner small"></span> 儲存中...';
        
        // 轉換成 JSON
        const settingsJson = JSON.stringify(bedSettings, null, 2);
        
        // 儲存到 GitHub
        const success = await saveFileToGitHub('data/bed-settings.json', settingsJson);
        
        if (success) {
            showNotification('設定已成功儲存', 'success');
        } else {
            showNotification('儲存設定失敗', 'error');
        }
        
        // 恢復按鈕狀態
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('儲存設定時發生錯誤: ' + error.message, 'error');
        
        // 恢復按鈕狀態
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存設定';
        }
    }
}

// 顯示通知
function showNotification(message, type = 'info') {
    const systemMessages = document.getElementById('system-messages');
    
    if (!systemMessages) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        ${message}
        <button class="close-notification">×</button>
    `;
    
    // 關閉按鈕功能
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('closing');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    systemMessages.appendChild(notification);
    
    // 3秒後自動關閉
    setTimeout(() => {
        notification.classList.add('closing');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果已經認證，初始化頁面
    if (typeof isUserAuthenticated === 'function' && isUserAuthenticated()) {
        onAuthenticated();
    }
});
