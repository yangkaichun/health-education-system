// 郵件設置功能

// 初始化頁面
document.addEventListener('DOMContentLoaded', function() {
    // 如果本地儲存中沒有郵件設置，初始化一個默認值
    if (!localStorage.getItem('nurseEmails')) {
        const defaultEmails = [
            { address: 'nurse1@example.com', enabled: true },
            { address: 'nurse2@example.com', enabled: true }
        ];
        localStorage.setItem('nurseEmails', JSON.stringify(defaultEmails));
    }
});

// 開啟郵件設置彈窗
function openEmailSettings() {
    const emailList = JSON.parse(localStorage.getItem('nurseEmails') || '[]');
    const emailContainer = document.getElementById('email-list-container');
    emailContainer.innerHTML = '';
    
    if (emailList.length === 0) {
        const noEmailMessage = document.createElement('div');
        noEmailMessage.className = 'no-data-message';
        noEmailMessage.textContent = '尚未添加護理師郵件地址';
        emailContainer.appendChild(noEmailMessage);
    } else {
        emailList.forEach((email, index) => {
            const emailRow = document.createElement('div');
            emailRow.className = 'email-row';
            
            const emailText = document.createElement('span');
            emailText.textContent = email.address;
            emailRow.appendChild(emailText);
            
            const statusToggle = document.createElement('select');
            statusToggle.setAttribute('data-index', index);
            
            const enableOption = document.createElement('option');
            enableOption.value = 'enable';
            enableOption.textContent = '啟用';
            
            const disableOption = document.createElement('option');
            disableOption.value = 'disable';
            disableOption.textContent = '禁用';
            
            statusToggle.appendChild(enableOption);
            statusToggle.appendChild(disableOption);
            statusToggle.value = email.enabled ? 'enable' : 'disable';
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.onclick = function() {
                removeEmail(index);
            };
            
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'email-controls';
            controlsContainer.appendChild(statusToggle);
            controlsContainer.appendChild(deleteButton);
            
            emailRow.appendChild(controlsContainer);
            emailContainer.appendChild(emailRow);
        });
    }
    
    document.getElementById('email-settings-modal').style.display = 'flex';
}

// 關閉郵件設置彈窗
function closeEmailSettings() {
    document.getElementById('email-settings-modal').style.display = 'none';
}

// 添加新郵件地址
function addEmail() {
    const emailInput = document.getElementById('new-email');
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('請輸入郵件地址！');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('請輸入有效的郵件地址！');
        return;
    }
    
    const emailList = JSON.parse(localStorage.getItem('nurseEmails') || '[]');
    
    // 檢查是否已存在相同的郵件地址
    if (emailList.some(item => item.address === email)) {
        alert('此郵件地址已存在！');
        return;
    }
    
    // 添加新郵件
    emailList.push({
        address: email,
        enabled: true
    });
    
    localStorage.setItem('nurseEmails', JSON.stringify(emailList));
    
    // 清空輸入框
    emailInput.value = '';
    
    // 重新載入郵件列表
    openEmailSettings();
}

// 移除郵件地址
function removeEmail(index) {
    if (!confirm('確定要刪除此郵件地址嗎？')) {
        return;
    }
    
    const emailList = JSON.parse(localStorage.getItem('nurseEmails') || '[]');
    
    if (index >= 0 && index < emailList.length) {
        emailList.splice(index, 1);
        localStorage.setItem('nurseEmails', JSON.stringify(emailList));
        
        // 重新載入郵件列表
        openEmailSettings();
    }
}

// 儲存郵件設定
function saveEmailSettings() {
    const emailList = JSON.parse(localStorage.getItem('nurseEmails') || '[]');
    const selectElements = document.querySelectorAll('#email-list-container select');
    
    selectElements.forEach(select => {
        const index = parseInt(select.getAttribute('data-index'));
        if (index >= 0 && index < emailList.length) {
            emailList[index].enabled = select.value === 'enable';
        }
    });
    
    localStorage.setItem('nurseEmails', JSON.stringify(emailList));
    
    // 關閉設定彈窗
    closeEmailSettings();
    
    // 顯示保存成功訊息
    document.getElementById('save-success-message').style.display = 'flex';
}

// 關閉保存成功訊息
function closeSaveSuccessMessage() {
    document.getElementById('save-success-message').style.display = 'none';
}

// 驗證郵件地址格式
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
