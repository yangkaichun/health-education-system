// 後台設定功能

// 初始化頁面
document.addEventListener('DOMContentLoaded', function() {
    // 如果本地儲存中沒有主題設定，初始化默認值
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
    
    loadTopicSettings();
});

// 載入主題設定
function loadTopicSettings() {
    const topicSettings = JSON.parse(localStorage.getItem('topicSettings') || '[]');
    const tableBody = document.getElementById('topics-table-body');
    tableBody.innerHTML = '';
    
    topicSettings.forEach((topic) => {
        const row = document.createElement('tr');
        
        // 主題編號
        const idCell = document.createElement('td');
        idCell.setAttribute('data-label', '主題編號');
        idCell.className = 'topic-number';
        idCell.textContent = topic.id;
        row.appendChild(idCell);
        
        // 主題名稱
        const nameCell = document.createElement('td');
        nameCell.setAttribute('data-label', '主題名稱');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'topic-name-input';
        nameInput.value = topic.name;
        nameInput.setAttribute('data-id', topic.id);
        nameCell.appendChild(nameInput);
        row.appendChild(nameCell);
        
        // YouTube 影片 URL
        const urlCell = document.createElement('td');
        urlCell.setAttribute('data-label', 'YouTube 影片 URL');
        
        const urlContainer = document.createElement('div');
        urlContainer.className = 'url-container';
        
        // 如果有 YouTube URL，顯示縮圖預覽
        if (topic.youtubeUrl) {
            const youtubeId = getYoutubeId(topic.youtubeUrl);
            if (youtubeId) {
                const preview = document.createElement('div');
                preview.className = 'youtube-preview';
                preview.style.backgroundImage = `url(https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg)`;
                urlContainer.appendChild(preview);
            }
        }
        
        const urlInputGroup = document.createElement('div');
        urlInputGroup.className = 'url-input-group';
        
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.className = 'youtube-url-input';
        urlInput.value = topic.youtubeUrl;
        urlInput.setAttribute('data-id', topic.id);
        urlInput.placeholder = '例如: https://www.youtube.com/watch?v=XXXXXXXX';
        urlInput.onchange = function() {
            // 當 URL 變更時更新預覽
            const container = this.closest('.url-container');
            const oldPreview = container.querySelector('.youtube-preview');
            if (oldPreview) {
                oldPreview.remove();
            }
            
            const youtubeId = getYoutubeId(this.value);
            if (youtubeId) {
                const preview = document.createElement('div');
                preview.className = 'youtube-preview';
                preview.style.backgroundImage = `url(https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg)`;
                container.insertBefore(preview, container.firstChild);
            }
        };
        
        urlInputGroup.appendChild(urlInput);
        urlContainer.appendChild(urlInputGroup);
        urlCell.appendChild(urlContainer);
        row.appendChild(urlCell);
        
        // 操作按鈕
        const actionCell = document.createElement('td');
        actionCell.setAttribute('data-label', '操作');
        
        const resetButton = document.createElement('button');
        resetButton.className = 'reset-button';
        resetButton.innerHTML = '<i class="fas fa-undo"></i>';
        resetButton.title = '重置此主題設定';
        resetButton.onclick = function() {
            resetTopic(topic.id);
        };
        
        actionCell.appendChild(resetButton);
        row.appendChild(actionCell);
        
        tableBody.appendChild(row);
    });
}

// 從 YouTube URL 中提取視頻 ID
function getYoutubeId(url) {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
}

// 重置單個主題設定
function resetTopic(topicId) {
    if (!confirm(`確定要重置主題 ${topicId} 的設定嗎？`)) {
        return;
    }
    
    const topicSettings = JSON.parse(localStorage.getItem('topicSettings') || '[]');
    const index = topicSettings.findIndex(topic => topic.id === topicId);
    
    if (index >= 0) {
        topicSettings[index] = {
            id: topicId,
            name: `衛教主題 ${topicId}`,
            youtubeUrl: ''
        };
        
        localStorage.setItem('topicSettings', JSON.stringify(topicSettings));
        loadTopicSettings();
    }
}

// 儲存所有設定
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
    
    // 儲存設定
    localStorage.setItem('topicSettings', JSON.stringify(topicSettings));
    
    // 顯示成功訊息
    document.getElementById('save-success-message').style.display = 'flex';
}

// 關閉成功訊息
function closeSaveSuccessMessage() {
    document.getElementById('save-success-message').style.display = 'none';
}
