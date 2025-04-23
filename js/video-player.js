// 影片播放控制
let selectedTopic = null;
const videoPlayer = document.getElementById('video-player');
let lastKnownTime = 0;
let isWatchingCompleted = false;

// 初始化頁面
document.addEventListener('DOMContentLoaded', function() {
    generateTopicButtons();
    initializeVideoPlayer();
});

// 生成主題按鈕
function generateTopicButtons() {
    const topicContainer = document.getElementById('topic-container');
    
    for (let i = 1; i <= 30; i++) {
        const button = document.createElement('button');
        button.className = 'topic-button';
        button.setAttribute('data-topic', i);
        button.textContent = `主題 ${i}`;
        button.onclick = function() {
            selectTopic(i);
        };
        topicContainer.appendChild(button);
    }
}

// 選擇主題
function selectTopic(topicNumber) {
    // 清除之前選中的主題
    const topicButtons = document.querySelectorAll('.topic-button');
    topicButtons.forEach(button => {
        button.classList.remove('selected');
    });
    
    // 標記選中的主題
    document.querySelector(`.topic-button[data-topic="${topicNumber}"]`).classList.add('selected');
    selectedTopic = topicNumber;
    
    // 顯示影片區域
    document.getElementById('video-section').style.display = 'block';
    document.getElementById('video-title').textContent = `衛教影片播放 - 主題 ${topicNumber}`;
    
    // 隱藏問卷區域
    document.getElementById('survey-section').style.display = 'none';
    
    // 隱藏問卷按鈕
    document.getElementById('survey-button').style.display = 'none';
    
    // 設置影片來源
    videoPlayer.src = `videos/topic${topicNumber}.mp4`;
    // 備註：實際部署時，請確保 videos 目錄中有相應的影片檔案
    // 如果沒有實際影片，可以使用以下測試影片
    // videoPlayer.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
    
    // 重置影片播放狀態
    isWatchingCompleted = false;
    lastKnownTime = 0;
    
    // 自動播放影片
    videoPlayer.load();
    videoPlayer.play();
    
    // 滾動到影片區域
    document.getElementById('video-section').scrollIntoView({ behavior: 'smooth' });
    
    // 存儲用戶選擇
    saveUserSelection(topicNumber);
}

// 初始化影片播放器
function initializeVideoPlayer() {
    // 禁止快轉
    videoPlayer.addEventListener('timeupdate', function() {
        // 如果當前時間比上次記錄的時間大很多，可能是用戶嘗試快進
        if (videoPlayer.currentTime > lastKnownTime + 1.5 && !isNaN(videoPlayer.duration)) {
            videoPlayer.currentTime = lastKnownTime;
        } else {
            lastKnownTime = videoPlayer.currentTime;
        }
        
        // 儲存觀看狀態
        saveWatchingStatus();
    });
    
    // 影片結束事件
    videoPlayer.addEventListener('ended', function() {
        isWatchingCompleted = true;
        document.getElementById('survey-button').style.display = 'block';
        
        // 存儲觀看完成狀態
        saveWatchingCompleted();
    });
}

// 重新播放影片
function replayVideo() {
    videoPlayer.currentTime = 0;
    videoPlayer.play();
}

// 顯示問卷
function showSurvey() {
    if (!isWatchingCompleted) {
        alert('請先完整觀看影片後再填寫問卷！');
        return;
    }
    
    // 生成問卷
    generateSurvey(selectedTopic);
    
    // 顯示問卷區域
    document.getElementById('survey-section').style.display = 'block';
    
    // 滾動到問卷區域
    document.getElementById('survey-section').scrollIntoView({ behavior: 'smooth' });
}

// 保存用戶選擇
function saveUserSelection(topicNumber) {
    // 存儲當前用戶的選擇和狀態
    const qrCode = document.getElementById('qr-code').value;
    if (!qrCode) {
        alert('請先掃描 QR Code 或輸入代碼！');
        return false;
    }
    
    // 存儲數據到 localStorage
    const userData = {
        qrCode: qrCode,
        topic: topicNumber,
        watchStatus: 'watching',
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('currentUserData', JSON.stringify(userData));
    
    // 更新或添加到結果列表
    const results = JSON.parse(localStorage.getItem('surveyResults') || '[]');
    const existingIndex = results.findIndex(item => item.qrCode === qrCode && item.topic === topicNumber);
    
    if (existingIndex >= 0) {
        results[existingIndex].watchStatus = 'watching';
        results[existingIndex].timestamp = userData.timestamp;
    } else {
        results.push(userData);
    }
    
    localStorage.setItem('surveyResults', JSON.stringify(results));
    return true;
}

// 儲存觀看狀態
function saveWatchingStatus() {
    if (!selectedTopic) return;
    
    const userData = JSON.parse(localStorage.getItem('currentUserData') || '{}');
    const qrCode = userData.qrCode;
    if (!qrCode) return;
    
    // 更新結果列表中的觀看狀態
    const results = JSON.parse(localStorage.getItem('surveyResults') || '[]');
    const existingIndex = results.findIndex(item => item.qrCode === qrCode && item.topic === selectedTopic);
    
    if (existingIndex >= 0) {
        results[existingIndex].watchStatus = 'watching';
        results[existingIndex].progress = Math.floor((lastKnownTime / videoPlayer.duration) * 100) || 0;
        localStorage.setItem('surveyResults', JSON.stringify(results));
    }
}

// 儲存觀看完成狀態
function saveWatchingCompleted() {
    if (!selectedTopic) return;
    
    const userData = JSON.parse(localStorage.getItem('currentUserData') || '{}');
    const qrCode = userData.qrCode;
    if (!qrCode) return;
    
    // 更新結果列表中的觀看狀態
    const results = JSON.parse(localStorage.getItem('surveyResults') || '[]');
    const existingIndex = results.findIndex(item => item.qrCode === qrCode && item.topic === selectedTopic);
    
    if (existingIndex >= 0) {
        results[existingIndex].watchStatus = 'completed';
        results[existingIndex].progress = 100;
        localStorage.setItem('surveyResults', JSON.stringify(results));
    }
}
