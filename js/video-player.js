// 影片播放控制
let selectedTopic = null;
const videoPlayer = document.getElementById('video-player');
let lastKnownTime = 0;
let isWatchingCompleted = false;
let youtubePlayer = null;

// 初始化頁面
document.addEventListener('DOMContentLoaded', function() {
    generateTopicButtons();
    initializeVideoPlayer();
});

// 生成主題按鈕
function generateTopicButtons() {
    const topicContainer = document.getElementById('topic-container');
    const topicSettings = JSON.parse(localStorage.getItem('topicSettings') || '[]');
    
    topicContainer.innerHTML = ''; // 清空容器
    
    for (let i = 1; i <= 30; i++) {
        const topicSetting = topicSettings.find(topic => topic.id === i) || {
            id: i,
            name: `主題 ${i}`,
            youtubeUrl: ''
        };
        
        const button = document.createElement('button');
        button.className = 'topic-button';
        button.setAttribute('data-topic', i);
        button.textContent = topicSetting.name;
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
    
    // 獲取主題設定
    const topicSettings = JSON.parse(localStorage.getItem('topicSettings') || '[]');
    const topicSetting = topicSettings.find(topic => topic.id === topicNumber) || {
        id: topicNumber,
        name: `主題 ${topicNumber}`,
        youtubeUrl: ''
    };
    
    // 顯示影片區域
    document.getElementById('video-section').style.display = 'block';
    document.getElementById('video-title').textContent = `衛教影片播放 - ${topicSetting.name}`;
    
    // 隱藏問卷區域
    document.getElementById('survey-section').style.display = 'none';
    
    // 隱藏問卷按鈕
    document.getElementById('survey-button').style.display = 'none';
    
    // 重置影片播放狀態
    isWatchingCompleted = false;
    lastKnownTime = 0;
    
    // 檢查是否有 YouTube URL
    const youtubeId = topicSetting.youtubeUrl ? getYoutubeId(topicSetting.youtubeUrl) : null;
    
    // 影片容器
    const videoContainer = document.querySelector('.video-container');
    
    // 移除現有的影片播放器
    if (document.getElementById('video-player')) {
        document.getElementById('video-player').remove();
    }
    
    if (document.getElementById('youtube-player')) {
        document.getElementById('youtube-player').remove();
    }
    
    // 創建新的播放器
    if (youtubeId) {
        // 使用 YouTube 嵌入播放器
        const iframe = document.createElement('iframe');
        iframe.id = 'youtube-player';
        iframe.width = '100%';
        iframe.height = '450';
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&rel=0&modestbranding=1&controls=0`;
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        
        // 插入到視頻容器的最前面
        videoContainer.insertBefore(iframe, videoContainer.firstChild);
        
        // 初始化 YouTube API
        initYouTubePlayer(youtubeId);
    } else {
        // 使用默認 HTML5 播放器
        const video = document.createElement('video');
        video.id = 'video-player';
        video.controls = true;
        
        const source = document.createElement('source');
        source.src = `videos/topic${topicNumber}.mp4`;
        source.type = 'video/mp4';
        
        video.appendChild(source);
        video.appendChild(document.createTextNode('您的瀏覽器不支援影片播放。'));
        
        // 插入到視頻容器的最前面
        videoContainer.insertBefore(video, videoContainer.firstChild);
        
        // 自動播放影片
        video.load();
        video.play();
        
        // 重新綁定事件
        initializeVideoPlayer();
    }
    
    // 滾動到影片區域
    document.getElementById('video-section').scrollIntoView({ behavior: 'smooth' });
    
    // 存儲用戶選擇
    saveUserSelection(topicNumber);
}

// 初始化影片播放器
function initializeVideoPlayer() {
    const videoPlayer = document.getElementById('video-player');
    if (!videoPlayer) return;
    
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

// 從 YouTube URL 中提取視頻 ID
function getYoutubeId(url) {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
}

// 初始化 YouTube 播放器 API
function initYouTubePlayer(videoId) {
    // 如果 YT API 尚未加載，加載它
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = function() {
            createYouTubePlayer(videoId);
        };
    } else {
        createYouTubePlayer(videoId);
    }
}

function createYouTubePlayer(videoId) {
    youtubePlayer = new YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
            'controls': 0,       // 不顯示控制條
            'rel': 0,            // 不顯示相關視頻
