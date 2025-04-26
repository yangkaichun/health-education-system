// @charset "UTF-8";
// 影片播放器功能

let videoEnded = false;
let currentVideo = null;

// 初始化影片播放器
function initVideoPlayer() {
    document.addEventListener('DOMContentLoaded', function() {
        const video = document.getElementById('education-video');
        const replayButton = document.getElementById('replay-video');
        
        if (video) {
            // 禁止快轉
            video.addEventListener('timeupdate', preventSkipping);
            
            // 影片結束時的處理
            video.addEventListener('ended', onVideoEnded);
            
            // 重播按鈕
            if (replayButton) {
                replayButton.addEventListener('click', function() {
                    replayVideo();
                });
            }
        }
    });
}

// 防止快轉
function preventSkipping(e) {
    const video = e.target;
    
    if (currentVideo && video.currentTime > currentVideo.lastTime) {
        // 允許正常播放
        currentVideo.lastTime = video.currentTime;
    } else if (currentVideo && video.currentTime < currentVideo.lastTime) {
        // 允許倒退 (使用者可以回看內容)
        currentVideo.lastTime = video.currentTime;
    }
}

// 加載影片
function loadVideo(youtubeUrl) {
    const videoContainer = document.querySelector('.video-container');
    
    if (!videoContainer) {
        console.error('Video container not found in DOM');
        return false;
    }
    
    try {
        // 從 YouTube URL 獲取影片 ID
        const videoId = extractYoutubeVideoId(youtubeUrl);
        
        if (videoId) {
            // 更新影片來源 - 使用 iframe 嵌入
            videoContainer.innerHTML = `
                <iframe 
                    id="youtube-player" 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/${videoId}?enablejsapi=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
            
            // 追蹤影片狀態
            currentVideo = {
                id: videoId,
                lastTime: 0
            };
            
            // 初始化 YouTube API
            initYouTubeAPI(videoId);
            
            // 重設播放結束狀態
            videoEnded = false;
            
            // 隱藏問卷區塊
            const questionnaireSection = document.getElementById('questionnaire-section');
            if (questionnaireSection) {
                questionnaireSection.style.display = 'none';
            }
            
            return true;
        } else {
            console.error('無效的 YouTube URL:', youtubeUrl);
            
            if (typeof showNotification === 'function') {
                showNotification('無效的 YouTube URL', 'error');
            } else {
                alert('無效的 YouTube URL');
            }
            
            return false;
        }
    } catch (error) {
        console.error('Error loading video:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('載入影片時發生錯誤: ' + error.message, 'error');
        } else {
            alert('載入影片時發生錯誤: ' + error.message);
        }
        
        return false;
    }
}

// 初始化 YouTube API
function initYouTubeAPI(videoId) {
    // 檢查是否已經載入 YouTube API
    if (typeof YT === 'undefined' || !YT.Player) {
        // 如果還沒載入，設置載入完成時的回調
        window.onYouTubeIframeAPIReady = function() {
            createYouTubePlayer(videoId);
        };
        
        // 載入 YouTube API
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        // 如果已經載入，直接創建播放器
        createYouTubePlayer(videoId);
    }
}

// 創建 YouTube 播放器
function createYouTubePlayer(videoId) {
    try {
        window.youtubePlayer = new YT.Player('youtube-player', {
            videoId: videoId,
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    } catch (error) {
        console.error('Error creating YouTube player:', error);
    }
}

// 播放器狀態變化事件
function onPlayerStateChange(event) {
    // 當影片結束時 (狀態 = 0)
    if (event.data === YT.PlayerState.ENDED) {
        onVideoEnded();
    }
}

// 從 YouTube URL 提取影片 ID
function extractYoutubeVideoId(url) {
    // 處理多種 YouTube URL 格式
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// 影片結束時的處理
function onVideoEnded() {
    videoEnded = true;
    
    // 顯示問卷區塊
    const questionnaireSection = document.getElementById('questionnaire-section');
    if (questionnaireSection) {
        questionnaireSection.style.display = 'block';
    }
    
    // 觸發自訂事件，通知頁面影片已結束
    const event = new Event('videoEnded');
    document.dispatchEvent(event);
}

// 重播影片
function replayVideo() {
    try {
        if (window.youtubePlayer && typeof window.youtubePlayer.seekTo === 'function') {
            window.youtubePlayer.seekTo(0);
            window.youtubePlayer.playVideo();
        } else {
            const iframe = document.querySelector('#youtube-player');
            if (iframe) {
                // 如果 API 未初始化，刷新 iframe
                const src = iframe.src;
                iframe.src = src;
            }
        }
        
        videoEnded = false;
        
        // 隱藏問卷區塊
        const questionnaireSection = document.getElementById('questionnaire-section');
        if (questionnaireSection) {
            questionnaireSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error replaying video:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('重播影片時發生錯誤', 'error');
        }
    }
}

// 檢查影片是否已播放完畢
function isVideoEnded() {
    return videoEnded;
}

// 初始化影片播放器
initVideoPlayer();
