// @charset "UTF-8";
// 問卷結果列表頁面功能

let results = [];
let emails = [];
let countdownInterval;
let isInitialized = false;

// 當 GitHub API 認證完成時
function onAuthenticated() {
    // 避免重複初始化
    if (isInitialized) return;
    isInitialized = true;
    
    console.log("認證成功，初始化結果列表頁面");
    
    initializeGitHubStorage().then(success => {
        if (success) {
            loadResults();
            loadEmailList();
            startCountdown();
        } else {
            showNotification('初始化儲存失敗，請檢查 GitHub 連接', 'error');
        }
    }).catch(error => {
        console.error('初始化存儲錯誤:', error);
        showNotification('初始化存儲時發生錯誤: ' + error.message, 'error');
    });
}

// 載入問卷結果
async function loadResults() {
    try {
        // 顯示載入中
        const resultsBody = document.getElementById('results-body');
        if (resultsBody) {
            resultsBody.innerHTML = '<tr><td colspan="7" class="loading-message">載入中...</td></tr>';
        }
        
        const noResultsDiv = document.getElementById('no-results');
        if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }
        
        results = await getAllResults();
        
        if (!Array.isArray(results)) {
            results = [];
        }
        
        // 按時間排序（從新到舊）
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        renderResultsTable();
    } catch (error) {
        console.error('Error loading results:', error);
        showNotification('載入問卷結果時發生錯誤: ' + error.message, 'error');
        
        // 顯示錯誤訊息
        const resultsBody = document.getElementById('results-body');
        if (resultsBody) {
            resultsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="error-message">
                        載入結果時發生錯誤: ${error.message}
                        <button onclick="loadResults()" class="reload-button">重試</button>
                    </td>
                </tr>
            `;
        }
    }
}

// 渲染結果表格
function renderResultsTable() {
    const tableBody = document.getElementById('results-body');
    const noResultsDiv = document.getElementById('no-results');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (results.length === 0) {
        if (noResultsDiv) {
            noResultsDiv.style.display = 'block';
        }
        
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-message">尚無問卷結果</td></tr>';
        return;
    }
    
    if (noResultsDiv) {
        noResultsDiv.style.display = 'none';
    }
    
    results.forEach(result => {
        const row = document.createElement('tr');
        
        // QR Code 代碼
        const qrCodeCell = document.createElement('td');
        qrCodeCell.textContent = result.qrCode || '未記錄';
        row.appendChild(qrCodeCell);
        
        // 衛教主題
        const topicCell = document.createElement('td');
        topicCell.textContent = result.topicName || `主題 ${result.topicId}`;
        row.appendChild(topicCell);
        
        // 影片觀看狀態
        const statusCell = document.createElement('td');
        if (result.status === 'viewing') {
            statusCell.innerHTML = '<span class="status-viewing">觀看中</span>';
        } else {
            statusCell.innerHTML = '<span class="status-completed">已完成</span>';
        }
        row.appendChild(statusCell);
        
        // 問卷分數
        const scoreCell = document.createElement('td');
        if (result.status === 'completed') {
            scoreCell.textContent = `${result.score} / ${result.maxScore}`;
            
            // 根據分數顯示不同顏色
            const scorePercentage = (result.score / (result.maxScore || 1)) * 100;
            if (scorePercentage >= 80) {
                scoreCell.style.color = '#27ae60'; // 綠色 - 良好
            } else if (scorePercentage >= 60) {
                scoreCell.style.color = '#f39c12'; // 橙色 - 一般
            } else {
                scoreCell.style.color = '#e74c3c'; // 紅色 - 較差
            }
        } else {
            scoreCell.textContent = '未完成';
            scoreCell.style.color = '#7f8c8d';
        }
        row.appendChild(scoreCell);
        
        // 護理師已知曉
        const nurseAckCell = document.createElement('td');
        const nurseCheckbox = document.createElement('input');
        nurseCheckbox.type = 'checkbox';
        nurseCheckbox.className = 'nurse-checkbox';
        nurseCheckbox.checked = result.nurseAcknowledged || false;
        nurseCheckbox.dataset.id = result.id;
        nurseCheckbox.addEventListener('change', () => updateNurseAcknowledgement(result.id, nurseCheckbox.checked));
        nurseAckCell.appendChild(nurseCheckbox);
        row.appendChild(nurseAckCell);
        
        // 觀看時間
        const timeCell = document.createElement('td');
        timeCell.textContent = formatDateTime(result.timestamp);
        timeCell.title = result.timestamp; // 完整時間作為提示
        row.appendChild(timeCell);
        
        // 操作
        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-button delete-button';
        deleteButton.innerHTML = '<span class="icon">🗑️</span> 刪除';
        deleteButton.addEventListener('click', () => deleteResultItem(result.id));
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        
        tableBody.appendChild(row);
    });
    
    // 如果有新結果，顯示通知
    if (results.length > 0 && results[0].timestamp) {
        const lastCheckTime = localStorage.getItem('last_check_time');
        const newestResultTime = new Date(results[0].timestamp).getTime();
        
        if (lastCheckTime && newestResultTime > parseInt(lastCheckTime)) {
            showNotification('有新的問卷結果!', 'info');
        }
        
        // 更新最後檢查時間
        localStorage.setItem('last_check_time', Date.now().toString());
    }
}

// 格式化日期時間
function formatDateTime(timestamp) {
    if (!timestamp) return '未知時間';
    
    try {
        const date = new Date(timestamp);
        
        // 檢查日期是否有效
        if (isNaN(date.getTime())) {
            return '無效時間';
        }
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '時間格式錯誤';
    }
}

// 更新護理師已知曉狀態
async function updateNurseAcknowledgement(resultId, acknowledged) {
    try {
        // 顯示更新中的視覺反饋
        const checkbox = document.querySelector(`input[data-id="${resultId}"]`);
        if (checkbox) {
            checkbox.disabled = true;
        }
        
        const success = await updateNurseAcknowledged(resultId, acknowledged);
        
        if (success) {
            // 更新本地結果資料
            const resultIndex = results.findIndex(r => r.id === resultId);
            if (resultIndex !== -1) {
                results[resultIndex].nurseAcknowledged = acknowledged;
            }
            
            if (acknowledged) {
                showNotification('已標記為護理師已知曉', 'success');
            } else {
                showNotification('已取消護理師已知曉標記', 'info');
            }
        } else {
            showNotification('更新護理師已知曉狀態時發生錯誤', 'error');
            
            // 還原勾選狀態
            if (checkbox) {
                checkbox.checked = !acknowledged;
            }
        }
        
        // 恢復勾選框狀態
        if (checkbox) {
            checkbox.disabled = false;
        }
    } catch (error) {
        console.error('Error updating nurse acknowledgement:', error);
        showNotification('更新護理師已知曉狀態時發生錯誤: ' + error.message, 'error');
        
        // 還原勾選框狀態
        const checkbox = document.querySelector(`input[data-id="${resultId}"]`);
        if (checkbox) {
            checkbox.disabled = false;
            checkbox.checked = !acknowledged;
        }
    }
}

// 刪除結果項目
async function deleteResultItem(resultId) {
    if (!confirm('確定要刪除此結果嗎？此操作無法復原。')) {
        return;
    }
    
    try {
        // 顯示刪除中狀態
        const row = document.querySelector(`input[data-id="${resultId}"]`).closest('tr');
        if (row) {
            row.classList.add('deleting');
        }
        
        const success = await deleteResult(resultId);
        
        if (success) {
            // 從本地結果資料中移除
            results = results.filter(r => r.id !== resultId);
            showNotification('結果已成功刪除', 'success');
            
            // 使用動畫移除行
            if (row) {
                row.style.transition = 'opacity 0.5s';
                row.style.opacity = '0';
                setTimeout(() => {
                    renderResultsTable();
                }, 500);
            } else {
                renderResultsTable();
            }
        } else {
            showNotification('刪除結果時發生錯誤', 'error');
            
            // 移除刪除中狀態
            if (row) {
                row.classList.remove('deleting');
            }
        }
    } catch (error) {
        console.error('Error deleting result:', error);
        showNotification('刪除結果時發生錯誤: ' + error.message, 'error');
        
        // 移除刪除中狀態
        const row = document.querySelector(`input[data-id="${resultId}"]`).closest('tr');
        if (row) {
            row.classList.remove('deleting');
        }
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
            
            // 變更顏色提示
            if (seconds <= 5) {
                countdownElement.style.color = '#e74c3c';
            } else if (seconds <= 10) {
                countdownElement.style.color = '#f39c12';
            } else {
                countdownElement.style.color = '#4a89dc';
            }
        }
        
        if (seconds <= 0) {
            loadResults(); // 重新載入結果
            seconds = 30; // 重設倒數時間
            
            // 重設顏色
            if (countdownElement) {
                countdownElement.style.color = '#4a89dc';
            }
        }
    }, 1000);
    
    // 儲存計時器 ID 在全局變量中，便於在需要時停止
    window.countdownInterval = countdownInterval;
}

// 載入 Email 通知清單
async function loadEmailList() {
    try {
        emails = await getEmailList();
        
        if (!Array.isArray(emails)) {
            emails = [];
        }
    } catch (error) {
        console.error('Error loading email list:', error);
        showNotification('載入 Email 通知清單時發生錯誤: ' + error.message, 'error');
    }
}

// 渲染 Email 列表
function renderEmailList() {
    const emailList = document.getElementById('email-list');
    
    if (!emailList) return;
    
    emailList.innerHTML = '';
    
    if (emails.length === 0) {
        emailList.innerHTML = '<div class="empty-email-list">尚未設定 Email 通知</div>';
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
        removeButton.innerHTML = '<span class="icon">🗑️</span>';
        removeButton.title = '移除此 Email';
        removeButton.addEventListener('click', () => {
            emails.splice(index, 1);
            renderEmailList();
        });
        
        emailActions.appendChild(removeButton);
        emailItem.appendChild(emailActions);
        
        emailList.appendChild(emailItem);
    });
}

// 儲存 Email 設定
async function saveEmailSettings() {
    try {
        // 顯示儲存中狀態
        const saveButton = document.getElementById('save-emails');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="spinner small"></span> 儲存中...';
        }
        
        const success = await updateEmailList(emails);
        
        // 恢復按鈕狀態
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '儲存設定';
        }
        
        if (success) {
            // 關閉模態框
            const emailModal = document.getElementById('email-modal');
            if (emailModal) {
                emailModal.style.display = 'none';
            }
            
            showNotification('Email 設定已儲存', 'success');
        } else {
            showNotification('儲存 Email 設定時發生錯誤', 'error');
        }
    } catch (error) {
        console.error('Error saving email settings:', error);
        showNotification('儲存 Email 設定時發生錯誤: ' + error.message, 'error');
        
        // 恢復按鈕狀態
        const saveButton = document.getElementById('save-emails');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '儲存設定';
        }
    }
}

// 新增 Email
function addEmail() {
    const emailInput = document.getElementById('new-email');
    const email = emailInput.value.trim();
    
    if (email) {
        if (isValidEmail(email)) {
            // 檢查是否已存在
            const exists = emails.some(e => e.email.toLowerCase() === email.toLowerCase());
            
            if (exists) {
                showNotification('此 Email 已在列表中', 'warning');
                return;
            }
            
            emails.push({
                email: email,
                enabled: true
            });
            
            renderEmailList();
            emailInput.value = '';
            showNotification('已新增 Email', 'success');
        } else {
            showNotification('請輸入有效的 Email 地址', 'error');
        }
    } else {
        showNotification('請輸入 Email 地址', 'warning');
    }
}

// 驗證 Email 格式
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

// 設定 Email 通知
function setupEmailNotification() {
    // 渲染 Email 列表
    renderEmailList();
    
    // 設定新增 Email 按鈕事件
    const addEmailBtn = document.getElementById('add-email');
    if (addEmailBtn) {
        addEmailBtn.addEventListener('click', addEmail);
    }
    
    // 設定儲存按鈕事件
    const saveEmailsBtn = document.getElementById('save-emails');
    if (saveEmailsBtn) {
        saveEmailsBtn.addEventListener('click', saveEmailSettings);
    }
    
    // Email 輸入框回車事件
    const emailInput = document.getElementById('new-email');
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // 防止表單提交
                addEmail();
            }
        });
    }
}

// 停止倒數計時
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.textContent = '已停止';
            countdownElement.style.color = '#e74c3c';
        }
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果已經認證，初始化頁面
    if (typeof isUserAuthenticated === 'function' && isUserAuthenticated()) {
        onAuthenticated();
    }
    
    // 手動刷新按鈕
    const manualRefreshBtn = document.getElementById('manual-refresh');
    if (manualRefreshBtn) {
        manualRefreshBtn.addEventListener('click', () => {
            loadResults();
            
            // 重設倒數
            clearInterval(countdownInterval);
            startCountdown();
            
            showNotification('已重新載入結果', 'info');
        });
    }
    
    // Email 設定按鈕
    const emailSettingsButton = document.getElementById('email-settings-button');
    if (emailSettingsButton) {
        emailSettingsButton.addEventListener('click', () => {
            // 載入 Email 設定
            setupEmailNotification();
            
            // 顯示 Email 設定模態框
            const emailModal = document.getElementById('email-modal');
            if (emailModal) {
                emailModal.style.display = 'block';
            }
        });
    }
    
    // 當視窗關閉時清除計時器
    window.addEventListener('beforeunload', () => {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
    });
});

                   
