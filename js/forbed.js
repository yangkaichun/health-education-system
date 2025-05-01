// @charset "UTF-8";

// 衛教影片觀看頁面功能

let topics = []; 
let selectedTopic = null; 
let currentQuestionnaire = null; 
let isInitialized = false; 
let bedTopicMapping = []; // 存儲床號與題組的對應關係

// 當 GitHub API 認證完成時 
function onAuthenticated() { 
    // 避免重複初始化 
    if (isInitialized) return; 
    isInitialized = true;

    console.log("認證成功，初始化影片觀看頁面");

    initializeGitHubStorage().then(success => { 
        if (success) { 
            // 先載入床號與題組的對應關係 
            loadBedTopicMapping().then(() => { 
                loadTopics(); 
                setupEventListeners(); 
            }); 
        } else { 
            // 如果初始化存儲失敗，顯示錯誤 
            showNotification('初始化儲存失敗，請檢查 GitHub 連接', 'error'); 
        } 
    }).catch(error => { 
        console.error('初始化存儲錯誤:', error); 
        showNotification('初始化存儲時發生錯誤: ' + error.message, 'error'); 
    }); 
}

// 載入床號與題組的對應關係 
async function loadBedTopicMapping() { 
    try { 
        // 從GitHub存儲中載入床號與題組對應關係 
        const mappingData = await fetchFileFromGitHub('data/bed-topic-mapping.json');

        if (mappingData) {
            bedTopicMapping = mappingData;
            console.log("載入床號與題組映射：", bedTopicMapping);
        } else {
            bedTopicMapping = [];
            console.log("沒有找到床號映射，使用空映射");
        }
        return true;
    } catch (error) {
        console.error('載入床號題組映射錯誤:', error);
        showNotification('載入床號題組映射時發生錯誤: ' + error.message, 'error');
        return false;
    }
}

// 載入所有衛教主題
async function loadTopics() {
    try {
        const topicsData = await fetchFileFromGitHub('data/topics.json');
        
        if (topicsData) {
            topics = topicsData;
            console.log("載入衛教主題：", topics);
        } else {
            showNotification('無法載入衛教主題', 'error');
        }
    } catch (error) {
        console.error('載入主題錯誤:', error);
        showNotification('載入主題時發生錯誤: ' + error.message, 'error');
    }
}

// 設置事件監聽器
function setupEventListeners() {
    // 掃描 QR Code 按鈕
    const scanQrBtn = document.getElementById('scan-qr-btn');
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', handleQRCodeScan);
    }

    // 床號輸入框回車事件
    const bedQrInput = document.getElementById('bed-qr-input');
    if (bedQrInput) {
        bedQrInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleQRCodeScan();
            }
        });
    }

    // 提交問卷按鈕
    const submitBtn = document.getElementById('submit-questionnaire');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitQuestionnaire);
    }
}

// 處理 QR Code 掃描
function handleQRCodeScan() {
    const input = document.getElementById('bed-qr-input');
    if (!input) return;

    const bedNumber = input.value.trim();
    if (!bedNumber) {
        showNotification('請輸入或掃描病床 QR Code', 'error');
        return;
    }

    // 根據床號加載對應的題組
    loadTopicsForBed(bedNumber);
}

// 根據床號加載對應的題組
function loadTopicsForBed(bedNumber) {
    // 在床號映射中查找對應的題組
    const bedSetting = bedTopicMapping.find(item => item.bedNumber === bedNumber);

    if (!bedSetting) {
        showNotification(`床號 ${bedNumber} 尚未設定衛教題組`, 'error');
        return;
    }

    // 獲取該床號對應的題組ID
    const topicIds = bedSetting.topicIds;
    
    // 過濾出對應的題組
    const matchedTopics = topics.filter(topic => topicIds.includes(topic.id));
    
    if (matchedTopics.length === 0) {
        showNotification(`床號 ${bedNumber} 的題組設定無效或已被刪除`, 'error');
        return;
    }

    // 顯示該床號對應的題組
    displayTopics(matchedTopics);
}

// 顯示題組列表
function displayTopics(topicsToDisplay) {
    const container = document.getElementById('topics-container');
    if (!container) return;

    container.innerHTML = '';

    if (topicsToDisplay.length === 0) {
        container.innerHTML = '<p>此床號尚未設定任何衛教題組</p>';
        return;
    }

    // 創建題組列表
    topicsToDisplay.forEach(topic => {
        const topicElement = document.createElement('div');
        topicElement.className = 'topic-item';
        topicElement.setAttribute('data-id', topic.id);
        
        const topicName = document.createElement('h3');
        topicName.textContent = topic.name;
        topicElement.appendChild(topicName);
        
        // 題組被點擊時的事件
        topicElement.addEventListener('click', () => selectTopic(topic));
        
        container.appendChild(topicElement);
    });
}

// 選擇題組
function selectTopic(topic) {
    selectedTopic = topic;
    console.log("選擇題組：", topic);

    // 顯示影片部分
    const videoSection = document.getElementById('video-section');
    if (videoSection) {
        videoSection.style.display = 'block';
    }

    // 隱藏題組選擇部分
    const topicSection = document.getElementById('topic-selection');
    if (topicSection) {
        topicSection.style.display = 'none';
    }

    // 載入影片
    loadVideo(topic);
}

// 載入影片
function loadVideo(topic) {
    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) return;

    videoContainer.innerHTML = '';

    if (!topic.youtubeUrl) {
        videoContainer.innerHTML = '<p>此主題尚未設定影片連結</p>';
        
        // 直接顯示問卷
        showQuestionnaire();
        return;
    }

    // 從 YouTube URL 中提取影片 ID
    const videoId = extractYouTubeVideoId(topic.youtubeUrl);
    
    if (!videoId) {
        videoContainer.innerHTML = '<p>無效的 YouTube 影片連結</p>';
        
        // 直接顯示問卷
      showQuestionnaire();
        return;
    }

    // 創建 YouTube 嵌入式播放器
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '450';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    iframe.title = topic.name;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    
    videoContainer.appendChild(iframe);
    
    // 視頻播放完畢後顯示問卷
    // 由於無法直接偵測 YouTube 播放完畢，改為添加按鈕
    const continueButton = document.createElement('button');
    continueButton.className = 'primary-button';
    continueButton.textContent = '影片觀看完畢，進入問卷';
    continueButton.style.marginTop = '20px';
    continueButton.addEventListener('click', showQuestionnaire);
    
    videoContainer.appendChild(continueButton);
}

// 從 YouTube URL 中提取影片 ID
function extractYouTubeVideoId(url) {
    if (!url) return null;
    
    // 支援多種 YouTube URL 格式
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/i,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

// 顯示問卷
async function showQuestionnaire() {
    // 隱藏影片部分
    const videoSection = document.getElementById('video-section');
    if (videoSection) {
        videoSection.style.display = 'none';
    }
    
    // 顯示問卷部分
    const questionnaireSection = document.getElementById('questionnaire-section');
    if (questionnaireSection) {
        questionnaireSection.style.display = 'block';
    }
    
    // 載入問卷
    await loadQuestionnaire();
}

// 載入問卷
async function loadQuestionnaire() {
    const container = document.getElementById('questionnaire-container');
    if (!container || !selectedTopic) return;
    
    try {
        // 從 GitHub 載入問卷資料
        const questionnairePath = `data/questionnaires/topic-${selectedTopic.id}.json`;
        const questionnaire = await fetchFileFromGitHub(questionnairePath);
        
        if (!questionnaire) {
            // 如果找不到問卷，創建預設問卷
            currentQuestionnaire = createDefaultQuestionnaire();
        } else {
            currentQuestionnaire = questionnaire;
        }
        
        // 顯示問卷
        displayQuestionnaire(currentQuestionnaire);
    } catch (error) {
        console.error('載入問卷錯誤:', error);
        showNotification('載入問卷時發生錯誤: ' + error.message, 'error');
        
        // 使用預設問卷
        currentQuestionnaire = createDefaultQuestionnaire();
        displayQuestionnaire(currentQuestionnaire);
    }
}

// 創建預設問卷
function createDefaultQuestionnaire() {
    return {
        topicId: selectedTopic.id,
        title: `${selectedTopic.name} 理解度評估`,
        questions: [
            {
                id: 1,
                text: "您對影片中的內容瞭解程度如何？",
                type: "rating",
                options: [
                    "完全不了解",
                    "稍微了解",
                    "部分了解",
                    "大致了解",
                    "完全了解"
                ]
            },
            {
                id: 2,
                text: "您還有什麼疑問需要護理師解答？",
                type: "text"
            }
        ]
    };
}

// 顯示問卷
function displayQuestionnaire(questionnaire) {
    const container = document.getElementById('questionnaire-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 問卷標題
    const title = document.createElement('h3');
    title.textContent = questionnaire.title;
    container.appendChild(title);
    
    // 問卷說明
    const description = document.createElement('p');
    description.className = 'questionnaire-description';
    description.textContent = '請回答以下問題，完成後點擊提交按鈕';
    container.appendChild(description);
    
    // 問題列表
    questionnaire.questions.forEach(question => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question';
        questionElement.setAttribute('data-id', question.id);
        
        // 問題文字
        const questionText = document.createElement('p');
        questionText.className = 'question-text';
        questionText.textContent = question.text;
        questionElement.appendChild(questionText);
        
        // 根據問題類型創建不同的回答方式
        if (question.type === 'rating') {
            // 評分題
            const ratingContainer = document.createElement('div');
            ratingContainer.className = 'rating-container';
            
            question.options.forEach((option, index) => {
                const label = document.createElement('label');
                label.className = 'rating-option';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `question-${question.id}`;
                input.value = index + 1;
                
                const optionText = document.createElement('span');
                optionText.textContent = option;
                
                label.appendChild(input);
                label.appendChild(optionText);
                ratingContainer.appendChild(label);
            });
            
            questionElement.appendChild(ratingContainer);
        } else if (question.type === 'text') {
            // 文字題
            const textarea = document.createElement('textarea');
            textarea.className = 'question-textarea';
            textarea.name = `question-${question.id}`;
            textarea.placeholder = '請輸入您的答案';
            textarea.rows = 4;
            
            questionElement.appendChild(textarea);
        }
        
        container.appendChild(questionElement);
    });
}

// 提交問卷
async function submitQuestionnaire() {
    if (!currentQuestionnaire || !selectedTopic) {
        showNotification('問卷資料不完整', 'error');
        return;
    }
    
    // 收集問卷答案
    const answers = [];
    
    currentQuestionnaire.questions.forEach(question => {
        let answer = null;
        
        if (question.type === 'rating') {
            // 收集評分題答案
            const selected = document.querySelector(`input[name="question-${question.id}"]:checked`);
            if (selected) {
                answer = parseInt(selected.value);
            }
        } else if (question.type === 'text') {
            // 收集文字題答案
            const textarea = document.querySelector(`textarea[name="question-${question.id}"]`);
            if (textarea) {
                answer = textarea.value.trim();
            }
        }
        
        answers.push({
            questionId: question.id,
            answer: answer
        });
    });
    
    // 檢查是否所有問題都已回答
    const unanswered = answers.find(a => a.answer === null || a.answer === '');
    if (unanswered) {
        showNotification('請回答所有問題', 'error');
        return;
    }
    
    // 取得床號
    const bedNumber = document.getElementById('bed-qr-input').value.trim();
    
    // 創建問卷結果
    const result = {
        topicId: selectedTopic.id,
        topicName: selectedTopic.name,
        bedNumber: bedNumber,
        submittedAt: new Date().toISOString(),
        answers: answers
    };
    
    try {
        // 儲存問卷結果
        const resultsPath = `data/results/${bedNumber}-${selectedTopic.id}-${Date.now()}.json`;
        const saved = await saveFileToGitHub(resultsPath, JSON.stringify(result, null, 2));
        
        if (saved) {
            // 顯示完成訊息
            showNotification('問卷已成功提交', 'success');
            
            // 隱藏問卷部分
            const questionnaireSection = document.getElementById('questionnaire-section');
            if (questionnaireSection) {
                questionnaireSection.style.display = 'none';
            }
            
            // 顯示完成部分
            const completionSection = document.getElementById('completion-section');
            if (completionSection) {
                completionSection.style.display = 'block';
            }
        } else {
            showNotification('問卷提交失敗', 'error');
        }
    } catch (error) {
        console.error('提交問卷錯誤:', error);
        showNotification('提交問卷時發生錯誤: ' + error.message, 'error');
    }
}

// 顯示通知
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    if (!notification || !messageElement) return;
    
    // 設置通知內容和類型
    messageElement.textContent = message;
    notification.className = `notification ${type}`;
    
    // 顯示通知
    notification.style.display = 'block';
    
    // 3秒後自動隱藏
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
