// 結果管理功能
let refreshCountdown = 30;

// 初始化頁面
document.addEventListener('DOMContentLoaded', function() {
    loadSurveyResults();
    startRefreshTimer();
});

// 載入問卷結果
function loadSurveyResults() {
    const results = JSON.parse(localStorage.getItem('surveyResults') || '[]');
    const topicSettings = JSON.parse(localStorage.getItem('topicSettings') || '[]');
    const tableBody = document.getElementById('results-table-body');
    tableBody.innerHTML = '';
    
    if (results.length === 0) {
        const noDataRow = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = 7;
        noDataCell.textContent = '尚無問卷結果';
        noDataCell.className = 'no-data-message';
        noDataRow.appendChild(noDataCell);
        tableBody.appendChild(noDataRow);
        return;
    }
    
    // 按時間倒序排列
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    results.forEach((result, index) => {
        const row = document.createElement('tr');
        
        // QR Code
        const qrCell = document.createElement('td');
        qrCell.setAttribute('data-label', 'QR Code');
        qrCell.textContent = result.qrCode;
        row.appendChild(qrCell);
        
        // 衛教主題
        const topicCell = document.createElement('td');
        topicCell.setAttribute('data-label', '衛教主題');
        
        // 查找主題名稱
        const topicSetting = topicSettings.find(topic => topic.id === result.topic);
        const topicName = topicSetting ? topicSetting.name : `主題 ${result.topic}`;
        
        topicCell.textContent = topicName;
        row.appendChild(topicCell);
        
        // 觀看狀態
        const statusCell = document.createElement('td');
        statusCell.setAttribute('data-label', '觀看狀態');
        const statusSpan = document.createElement('span');
        statusSpan.className = 'watch-status';
        
        switch (result.watchStatus) {
            case 'completed':
                statusSpan.textContent = '已完成';
                statusSpan.classList.add('status-completed');
                break;
            case 'watching':
                statusSpan.textContent = '觀看中';
                statusSpan.classList.add('status-watching');
                break;
            default:
                statusSpan.textContent = '待觀看';
                statusSpan.classList.add('status-pending');
        }
        
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);
        
        // 問卷分數
        const scoreCell = document.createElement('td');
        scoreCell.setAttribute('data-label', '問卷分數');
        if (result.score !== undefined) {
            scoreCell.textContent = `${result.score}分`;
        } else {
            scoreCell.textContent = '尚未填寫';
            scoreCell.style.color = '#999';
        }
        row.appendChild(scoreCell);
        
        // 提交時間
        const timeCell = document.createElement('td');
        timeCell.setAttribute('data-label', '提交時間');
        const submitTime = result.completedTimestamp || result.timestamp;
        timeCell.textContent = formatDateTime(submitTime);
        row.appendChild(timeCell);
        
        // 護理師已知曉
        const ackCell = document.createElement('td');
        ackCell.setAttribute('data-label', '護理師已知曉');
        const ackCheckbox = document.createElement('input');
        ackCheckbox.type = 'checkbox';
        ackCheckbox.checked = result.nurseAcknowledged || false;
        ackCheckbox.onchange = function() {
            updateNurseAcknowledgement(index, this.checked);
        };
        ackCell.appendChild(ackCheckbox);
        row.appendChild(ackCell);
        
        // 刪除按鈕
        const deleteCell = document.createElement('td');
        deleteCell.setAttribute('data-label', '操作');
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = function() {
            deleteResult(index);
        };
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);
        
        tableBody.appendChild(row);
    });
}

// 更新護理師確認狀態
function updateNurseAcknowledgement(index, isAcknowledged) {
    const results = JSON.parse(localStorage.getItem('surveyResults') || '[]');
    if (index >= 0 && index < results.length) {
        results[index].nurseAcknowledged = isAcknowledged;
        localStorage.setItem('surveyResults', JSON.stringify(results));
        
        // 顯示確認狀態更新的提示
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = isAcknowledged 
            ? '<i class="fas fa-check-circle"></i> 已標記為護理師已知曉' 
            : '<i class="fas fa-info-circle"></i> 已取消護理師已知曉標記';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// 刪除結果
function deleteResult(index) {
    if (!confirm('確定要刪除這條記錄嗎？此操作無法恢復。')) {
        return;
    }
    
    const results = JSON.parse(localStorage.getItem('surveyResults') || '[]');
    if (index >= 0 && index < results.length) {
        results.splice(index, 1);
        localStorage.setItem('surveyResults', JSON.stringify(results));
        loadSurveyResults();
        
        // 顯示刪除成功的提示
        const toast = document.createElement('div');
        toast.className = 'toast warning';
        toast.innerHTML = '<i class="fas fa-trash"></i> 記錄已成功刪除';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// 格式化日期時間
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
}

// 補零
function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

// 開始自動刷新計時器
function startRefreshTimer() {
    const timerElement = document.getElementById('refresh-timer');
    
    // 每秒更新倒計時
    setInterval(() => {
        refreshCountdown--;
        
        if (refreshCountdown <= 0) {
            refreshCountdown = 30;
            loadSurveyResults();
        }
        
        timerElement.textContent = refreshCountdown;
    }, 1000);
}
