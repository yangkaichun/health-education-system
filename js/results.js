let results = [];
let emails = [];
let countdownInterval;

// 當 GitHub API 認證完成時
function onAuthenticated() {
    initializeGitHubStorage().then(success => {
        if (success) {
            loadResults();
            loadEmailList();
            startCountdown();
        }
    });
}

// 載入問卷結果
async function loadResults() {
    try {
        results = await getAllResults();
        
        // 按時間排序（從新到舊）
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        renderResultsTable();
    } catch (error) {
        console.error('Error loading results:', error);
        showError('載入問卷結果時發生錯誤');
    }
}

// 渲染結果表格
function renderResultsTable() {
    const tableBody = document.getElementById('results-body');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (results.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 7;
        emptyCell.textContent = '尚無問卷結果';
        emptyCell.style.textAlign = 'center';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }
    
    results.forEach(result => {
        const row = document.createElement('tr');
        
        // QR Code 代碼
        const qrCodeCell = document.createElement('td');
        qrCodeCell.textContent = result.qrCode;
        row.appendChild(qrCodeCell);
        
        // 衛教主題
        const topicCell = document.createElement('td');
        topicCell.textContent = result.topicName;
        row.appendChild(topicCell);
        
        // 影片觀看狀態
        const statusCell = document.createElement('td');
        statusCell.textContent = result.status === 'viewing' ? '觀看中' : '已觀看';
        statusCell.className = result.status === 'viewing' ? 'status-viewing' : 'status-completed';
        row.appendChild(statusCell);
        
        // 問卷分數
        const scoreCell = document.createElement('td');
        scoreCell.textContent = `${result.score} / ${result.maxScore}`;
        row.appendChild(scoreCell);
        
        // 護理師已知曉
        const nurseAckCell = document.createElement('td');
        const nurseCheckbox = document.createElement('input');
        nurseCheckbox.type = 'checkbox';
        nurseCheckbox.className = 'nurse-checkbox';
        nurseCheckbox.checked = result.nurseAcknowledged;
        nurseCheckbox.addEventListener('change', () => updateNurseAcknowledgement(result.id, nurseCheckbox.checked));
        nurseAckCell.appendChild(nurseCheckbox);
        row.appendChild(nurseAckCell);
        
        // 觀看時間
        const timeCell = document.createElement('td');
        timeCell.textContent = formatDateTime(result.timestamp);
        row.appendChild(timeCell);
        
        // 操作
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-button delete-button';
        deleteButton.textContent = '刪除';
        deleteButton.addEventListener('click', () => deleteResultItem(result.id));
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        
        tableBody.appendChild(row);
    });
}

// 格式化日期時間
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 更新護理師已知曉狀態
async function updateNurseAcknowledgement(resultId, acknowledged) {
    try {
        const success = await updateNurseAcknowledged(resultId, acknowledged);
        
        if (success) {
            // 更新本地結果資料
            const resultIndex = results.findIndex(r => r.id === resultId);
            if (resultIndex !== -1) {
                results[resultIndex].nurseAcknowledged = acknowledged;
            }
        } else {
            alert('更新護理師已知曉狀態時發生錯誤');
            
            // 還原勾選狀態
            const checkbox = document.querySelector(`input[type="checkbox"][data-id="${resultId}"]`);
            if (checkbox) {
                checkbox.checked = !acknowledged;
            }
        }
    } catch (error) {
        console.error('Error updating nurse acknowledgement:', error);
        showError('更新護理師已知曉狀態時發生錯誤');
    }
}

// 刪除結果項目
async function deleteResultItem(resultId) {
    if (!confirm('確定要刪除此結果嗎？此操作無法復原。')) {
        return;
    }
    
    try {
        const success = await deleteResult(resultId);
        
        if (success) {
            // 從本地結果資料中移除
            results = results.filter(r => r.id !== resultId);
            renderResultsTable();
        } else {
            alert('刪除結果時發生錯誤');
        }
    } catch (error) {
        console.error('Error deleting result:', error);
        showError('刪除結果時發生錯誤');
    }
}

// 開始倒數計時
function startCountdown() {
    let seconds = 30;
    const countdownElement = document.getElementById('countdown');
    
    // 清除之前的計時器
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // 設置新的計時器
    countdownInterval = setInterval(() => {
        seconds--;
        
        if (countdownElement) {
            countdownElement.textContent = seconds;
        }
        
        if (seconds <= 0) {
            loadResults(); // 重新載入結果
            seconds = 30; // 重設倒數時間
        }
    }, 1000);
}

// 載入 Email 通知清單
async function loadEmailList() {
    try {
        emails = await getEmailList();
        
        // 渲染 Email 選擇模態框（若按鈕被點擊）
        const emailSettingsButton = document.getElementById('email-settings-button');
        if (emailSettingsButton) {
            emailSettingsButton.addEventListener('click', showEmailSettings);
        }
    } catch (error) {
        console.error('Error loading email list:', error);
        showError('載入 Email 通知清單時發生錯誤');
    }
}

// 顯示 Email 設定
function showEmailSettings() {
    const modal = document.getElementById('email-modal');
    const closeBtn = modal.querySelector('.close');
    const addEmailBtn = document.getElementById('add-email');
    const saveEmailsBtn = document.getElementById('save-emails');
    
    // 渲染 Email 列表
    renderEmailList();
    
    // 顯示模態框
    modal.style.display = 'block';
    
    // 關閉按鈕事件
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // 點擊模態框外部關閉
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // 新增 Email 按鈕事件
    addEmailBtn.onclick = function() {
        const emailInput = document.getElementById('new-email');
        const email = emailInput.value.trim();
        
        if (email && isValidEmail(email)) {
            emails.push({
                email: email,
                enabled: true
            });
            
            renderEmailList();
            emailInput.value = '';
        } else {
            alert('請輸入有效的 Email 地址');
        }
    };
    
    // 儲存 Email 設定按鈕事件
    saveEmailsBtn.onclick = async function() {
        try {
            const success = await updateEmailList(emails);
            
            if (success) {
                alert('Email 通知設定已儲存');
                modal.style.display = 'none';
            } else {
                alert('儲存 Email 設定時發生錯誤');
            }
        } catch (error) {
            console.error('Error saving email settings:', error);
            showError('儲存 Email 設定時發生錯誤');
        }
    };
}

// 渲染 Email 列表
function renderEmailList() {
    const emailList = document.getElementById('email-list');
    
    if (!emailList) return;
    
    emailList.innerHTML = '';
    
    if (emails.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = '尚未設定 Email 通知';
        emptyMsg.style.textAlign = 'center';
        emailList.appendChild(emptyMsg);
        return;
    }
    
    emails.forEach((email, index) => {
        const emailItem = document.createElement('div');
        emailItem.className = 'email-item';
        
        // Email 地址
        const emailText = document.createElement('span');
        emailText.textContent = email.email;
        emailItem.appendChild(emailText);
        
        // 操作區
        const emailActions = document.createElement('div');
        emailActions.className = 'email-actions';
        
        // 啟用/停用選項
        const statusSelect = document.createElement('select');
        const enabledOption = document.createElement('option');
        enabledOption.value = 'enabled';
        enabledOption.textContent = '啟用';
        const disabledOption = document.createElement('option');
        disabledOption.value = 'disabled';
        disabledOption.textContent = '停用';
        
        statusSelect.appendChild(enabledOption);
        statusSelect.appendChild(disabledOption);
        statusSelect.value = email.enabled ? 'enabled' : 'disabled';
        
        statusSelect.addEventListener('change', () => {
            emails[index].enabled = statusSelect.value === 'enabled';
        });
        
        emailActions.appendChild(statusSelect);
        
        // 移除按鈕
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-email';
        removeButton.textContent = '移除';
        removeButton.addEventListener('click', () => {
            emails.splice(index, 1);
            renderEmailList();
        });
        
        emailActions.appendChild(removeButton);
        emailItem.appendChild(emailActions);
        
        emailList.appendChild(emailItem);
    });
}

// 驗證 Email 格式
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

// 顯示錯誤訊息
function showError(message) {
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
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.prepend(errorContainer);
        
        // 自動移除錯誤訊息
        setTimeout(() => {
            errorContainer.remove();
        }, 5000);
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 手動刷新按鈕
    const manualRefreshBtn = document.getElementById('manual-refresh');
    if (manualRefreshBtn) {
        manualRefreshBtn.addEventListener('click', () => {
            loadResults();
            
            // 重設倒數
            clearInterval(countdownInterval);
            startCountdown();
        });
    }
    
    // 當視窗關閉時清除計時器
    window.addEventListener('beforeunload', () => {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
    });
});
