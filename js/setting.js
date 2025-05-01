// @charset "UTF-8";

// 衛教設定頁面功能

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
        saveSettingsBtn.addEventListener('click', saveBedSetting);
    }

    // 清除選擇按鈕
    const clearSelectionBtn = document.getElementById('clear-selection');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearTopicSelection);
    }

    // 題組選擇器變更事件
    const topicSelector = document.getElementById('topic-selector');
    if (topicSelector) {
        topicSelector.addEventListener('change', updateSelectedTopics);
    }

    // 搜尋床號輸入框
    const searchBedInput = document.getElementById('search-bed');
    if (searchBedInput) {
        searchBedInput.addEventListener('input', filterBedSettings);
    }

    // 取消確認按鈕
    const cancelConfirmBtn = document.getElementById('cancel-confirm');
    if (cancelConfirmBtn) {
        cancelConfirmBtn.addEventListener('click', hideConfirmationDialog);
    }
}

// 載入所有題組
async function loadTopics() {
    try {
        const topicsData = await fetchFileFromGitHub('data/topics.json');
        if (topicsData) {
            topics = topicsData;
            populateTopicSelector();
        } else {
            showNotification('無法載入題組資料', 'error');
        }
    } catch (error) {
        console.error('載入題組錯誤:', error);
        showNotification('載入題組時發生錯誤: ' + error.message, 'error');
    }
}

// 填充題組選擇器
function populateTopicSelector() {
    const selector = document.getElementById('topic-selector');
    if (!selector) return;

    selector.innerHTML = '';
    
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic.id;
        option.textContent = topic.name;
        selector.appendChild(option);
    });
}

// 更新已選擇的題組顯示
function updateSelectedTopics() {
    const selector = document.getElementById('topic-selector');
    const container = document.getElementById('selected-topics-container');
    const noTopicsMsg = document.getElementById('no-topics-selected');
    
    if (!selector || !container) return;
    
    // 獲取選中的選項
    const selectedOptions = Array.from(selector.selectedOptions);
    
    if (selectedOptions.length === 0) {
        // 沒有選擇任何題組
        if (noTopicsMsg) {
            noTopicsMsg.style.display = 'block';
        } else {
            container.innerHTML = '<p id="no-topics-selected">尚未選擇任何題組</p>';
        }
        return;
    }
    
    // 有選擇題組，隱藏提示訊息
    if (noTopicsMsg) {
        noTopicsMsg.style.display = 'none';
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 添加選中的題組
    selectedOptions.forEach(option => {
        const topicId = parseInt(option.value);
        const topic = topics.find(t => t.id === topicId);
        
        if (topic) {
            const topicElement = document.createElement('div');
            topicElement.className = 'selected-topic';
            topicElement.setAttribute('data-id', topic.id);
            topicElement.textContent = topic.name;
            
            // 添加刪除按鈕
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-topic';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                // 從選擇器中取消選擇
                option.selected = false;
                updateSelectedTopics();
            });
            
            topicElement.appendChild(removeBtn);
            container.appendChild(topicElement);
        }
    });
}

// 清除題組選擇
function clearTopicSelection() {
    const selector = document.getElementById('topic-selector');
    if (!selector) return;
    
    // 取消所有選擇
    Array.from(selector.options).forEach(option => {
        option.selected = false;
    });
    
    updateSelectedTopics();
}

// 儲存床號設定
async function saveBedSetting() {
    const bedNumberInput = document.getElementById('bed-number');
    const topicSelector = document.getElementById('topic-selector');
    
    if (!bedNumberInput || !topicSelector) return;
    
    const bedNumber = bedNumberInput.value.trim();
    
    if (!bedNumber) {
        showNotification('請輸入床號', 'error');
        return;
    }
    
    // 獲取選中的題組 ID
    const selectedTopicIds = Array.from(topicSelector.selectedOptions)
        .map(option => parseInt(option.value));
    
    if (selectedTopicIds.length === 0) {
        showNotification('請至少選擇一個題組', 'error');
        return;
    }
    
    try {
        // 載入現有的床號設定
        let mappings = await fetchFileFromGitHub('data/bed-topic-mapping.json') || [];
        
        // 檢查是否已存在該床號
        const existingIndex = mappings.findIndex(item => item.bedNumber === bedNumber);
        const now = new Date().toISOString();
        
        if (existingIndex !== -1) {
            // 更新現有設定
            mappings[existingIndex].topicIds = selectedTopicIds;
            mappings[existingIndex].updatedAt = now;
        } else {
            // 新增設定
            mappings.push({
                bedNumber: bedNumber,
                topicIds: selectedTopicIds,
                createdAt: now,
                updatedAt: now
            });
        }
        
        // 儲存更新的設定
        const result = await saveFileToGitHub('data/bed-topic-mapping.json', JSON.stringify(mappings, null, 2));
        
        if (result) {
            showNotification('床號設定已儲存', 'success');
            // 重新載入床號設定
            loadBedSettings();
            // 清空輸入
            bedNumberInput.value = '';
            clearTopicSelection();
        } else {
            showNotification('儲存設定失敗', 'error');
        }
    } catch (error) {
        console.error('儲存設定錯誤:', error);
        showNotification('儲存設定時發生錯誤: ' + error.message, 'error');
    }
}

// 載入床號設定
async function loadBedSettings() {
    try {
        const mappings = await fetchFileFromGitHub('data/bed-topic-mapping.json');
        if (mappings) {
            bedSettings = mappings;
            displayBedSettings();
        } else {
            bedSettings = [];
            displayBedSettings();
        }
    } catch (error) {
        console.error('載入床號設定錯誤:', error);
        showNotification('載入床號設定時發生錯誤: ' + error.message, 'error');
    }
}

// 顯示床號設定
function displayBedSettings(filteredSettings = null) {
    const container = document.getElementById('bed-settings-container');
    const noSettingsMsg = document.getElementById('no-settings-message');
    
    if (!container) return;
    
    const settingsToDisplay = filteredSettings || bedSettings;
    
    // 清空容器
    container.innerHTML = '';
    
    if (settingsToDisplay.length === 0) {
        container.innerHTML = '<p id="no-settings-message">尚未有任何床號設定</p>';
        return;
    }
    
    // 創建床號設定卡片
    settingsToDisplay.forEach(setting => {
        const card = document.createElement('div');
        card.className = 'bed-setting-card';
        
        // 床號標題
        const title = document.createElement('h3');
        title.textContent = `床號: ${setting.bedNumber}`;
        card.appendChild(title);
        
        // 題組列表
        const topicsList = document.createElement('div');
        topicsList.className = 'topics-list';
        
        // 找出每個題組名稱
        const selectedTopics = setting.topicIds.map(id => {
            const topic = topics.find(t => t.id === id);
            return topic ? topic.name : `未知題組(ID: ${id})`;
        });
        
        if (selectedTopics.length > 0) {
            selectedTopics.forEach(topicName => {
                const topicItem = document.createElement('span');
                topicItem.className = 'topic-tag';
                topicItem.textContent = topicName;
                topicsList.appendChild(topicItem);
            });
        } else {
            const noTopics = document.createElement('p');
            noTopics.textContent = '尚未選擇任何題組';
            topicsList.appendChild(noTopics);
        }
        
        card.appendChild(topicsList);
        
        // 設定更新時間
        const updateTime = document.createElement('p');
        updateTime.className = 'update-time';
        const date = new Date(setting.updatedAt);
        updateTime.textContent = `上次更新: ${date.toLocaleString()}`;
        card.appendChild(updateTime);
        
        // 操作按鈕
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        
        // 編輯按鈕
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '編輯';
        editBtn.addEventListener('click', () => editBedSetting(setting));
        actions.appendChild(editBtn);
        
        // 刪除按鈕
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '刪除';
        deleteBtn.addEventListener('click', () => showDeleteConfirmation(setting.bedNumber));
        actions.appendChild(deleteBtn);
        
        card.appendChild(actions);
        
        container.appendChild(card);
    });
}

// 編輯床號設定
function editBedSetting(setting) {
    const bedNumberInput = document.getElementById('bed-number');
    const topicSelector = document.getElementById('topic-selector');
    
    if (!bedNumberInput || !topicSelector) return;
    
    // 設置床號
    bedNumberInput.value = setting.bedNumber;
    
    // 選擇對應的題組
    Array.from(topicSelector.options).forEach(option => {
        const topicId = parseInt(option.value);
        option.selected = setting.topicIds.includes(topicId);
    });
    
    // 更新選擇的題組顯示
    updateSelectedTopics();
    
    // 滾動到設定區域
    document.getElementById('bed-topic-config').scrollIntoView({ behavior: 'smooth' });
}

// 顯示刪除確認對話框
function showDeleteConfirmation(bedNumber) {
    const dialog = document.getElementById('confirmation-dialog');
    const message = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirm-action');
    
    if (!dialog || !message || !confirmBtn) return;
    
    message.textContent = `確定要刪除床號 ${bedNumber} 的設定嗎？此操作無法撤銷。`;
    
    // 設置確認按鈕動作
    confirmBtn.onclick = () => deleteBedSetting(bedNumber);
    
    // 顯示對話框
    dialog.style.display = 'flex';
}

// 隱藏確認對話框
function hideConfirmationDialog() {
    const dialog = document.getElementById('confirmation-dialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
}

// 刪除床號設定
async function deleteBedSetting(bedNumber) {
    try {
        // 隱藏對話框
        hideConfirmationDialog();
        
        // 載入現有設定
        let mappings = await fetchFileFromGitHub('data/bed-topic-mapping.json') || [];
        
        // 過濾掉要刪除的設定
        mappings = mappings.filter(item => item.bedNumber !== bedNumber);
        
        // 儲存更新後的設定
        const result = await saveFileToGitHub('data/bed-topic-mapping.json', JSON.stringify(mappings, null, 2));
        
        if (result) {
            showNotification(`床號 ${bedNumber} 的設定已刪除`, 'success');
            // 重新載入床號設定
            loadBedSettings();
        } else {
            showNotification('刪除設定失敗', 'error');
        }
    } catch (error) {
        console.error('刪除設定錯誤:', error);
        showNotification('刪除設定時發生錯誤: ' + error.message, 'error');
    }
}

// 過濾床號設定
function filterBedSettings() {
    const searchInput = document.getElementById('search-bed');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        // 如果搜尋詞為空，顯示所有設定
        displayBedSettings();
        return;
    }
    
    // 過濾符合搜尋詞的設定
    const filteredSettings = bedSettings.filter(setting => 
        setting.bedNumber.toLowerCase().includes(searchTerm)
    );
    
    displayBedSettings(filteredSettings);
}

// 顯示通知訊息
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    if (!notification || !messageElement) return;
    
    // 設置訊息和類型
    messageElement.textContent = message;
    notification.className = `notification ${type}`;
    
    // 顯示通知
    notification.style.display = 'block';
    
    // 設置自動隱藏
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
