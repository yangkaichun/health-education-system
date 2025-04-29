// @charset "UTF-8";
// 衛教影片觀看頁面功能

let topics = [];
let selectedTopic = null;
let currentQuestionnaire = null;
let isInitialized = false;

// 當 GitHub API 認證完成時
function onAuthenticated() {
    // 避免重複初始化
    if (isInitialized) return;
    isInitialized = true;
    
    console.log("認證成功，初始化影片觀看頁面");
    
    initializeGitHubStorage().then(success => {
        if (success) {
            loadTopics();
            setupEventListeners();
        } else {
            // 如果初始化存儲失敗，顯示錯誤
            showNotification('初始化儲存失敗，請檢查 GitHub 連接', 'error');
        }
    }).catch(error => {
        console.error('初始化存儲錯誤:', error);
        showNotification('初始化存儲時發生錯誤: ' + error.message, 'error');
    });
}

// 設置事件監聽器
function setupEventListeners() {
    // 送出主題按鈕
    const submitTopicBtn = document.getElementById('submit-topic');
    if (submitTopicBtn) {
        submitTopicBtn.addEventListener('click', loadVideoAndQuestionnaire);
    }
    
    // 送出問卷按鈕
    const submitQuestionnaireBtn = document.getElementById('submit-questionnaire');
    if (submitQuestionnaireBtn) {
        submitQuestionnaireBtn.addEventListener('click', submitQuestionnaire);
    }
    
    // 返回主頁按鈕
    const returnHomeBtn = document.getElementById('return-home');
    if (returnHomeBtn) {
        returnHomeBtn.addEventListener('click', returnToHome);
    }
}

// 載入衛教主題
async function loadTopics() {
    try {
        topics = await getAllTopics();
        
        if (!Array.isArray(topics) || topics.length === 0) {
            console.warn('Empty or invalid topics data, initializing defaults');
            topics = Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                name: `衛教主題 ${i + 1}`,
                youtubeUrl: ''
            }));
        }
        
        renderTopics();
    } catch (error) {
        console.error('Error loading topics:', error);
        showNotification('載入衛教主題時發生錯誤: ' + error.message, 'error');
    }
}

// 渲染衛教主題列表
function renderTopics() {
    const topicList = document.getElementById('topic-list');
    
    if (!topicList) return;
    
    topicList.innerHTML = '';
    
    topics.forEach(topic => {
        const topicElement = document.createElement('div');
        topicElement.className = 'topic-item';
        topicElement.dataset.id = topic.id;
        topicElement.textContent = topic.name || `衛教主題 ${topic.id}`;
        
        topicElement.addEventListener('click', () => selectTopic(topic));
        
        topicList.appendChild(topicElement);
    });
}

// 選擇衛教主題
function selectTopic(topic) {
    // 移除之前選擇的主題樣式
    const previousSelected = document.querySelector('.topic-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }
    
    // 設置新選擇的主題樣式
    const topicElement = document.querySelector(`.topic-item[data-id="${topic.id}"]`);
    if (topicElement) {
        topicElement.classList.add('selected');
    }
    
    selectedTopic = topic;
    document.getElementById('submit-topic').disabled = false;
}

// 載入影片和問卷
async function loadVideoAndQuestionnaire() {
    if (!selectedTopic) {
        showNotification('請選擇一個衛教主題', 'warning');
        return;
    }
    
    try {
        // 檢查 QR Code 是否已掃描
        const qrCodeResult = document.getElementById('qrcode-result');
        if (!qrCodeResult.value.trim()) {
            showNotification('請先掃描 QR Code', 'warning');
            return;
        }
        
        // 顯示影片區段
        document.getElementById('topic-selection').style.display = 'none';
        document.getElementById('video-section').style.display = 'block';
        
        // 設置標題
        document.getElementById('video-title').textContent = `衛教影片: ${selectedTopic.name}`;
        
        // 檢查是否有 YouTube URL
        if (!selectedTopic.youtubeUrl) {
            showNotification('此主題尚未設定影片，請聯繫管理員', 'error');
            // 顯示錯誤訊息在影片區域
            const videoContainer = document.querySelector('.video-container');
            if (videoContainer) {
                videoContainer.innerHTML = `
                    <div class="video-error">
                        <div class="error-icon">❌</div>
                        <h3>未設定影片</h3>
                        <p>此主題尚未設定 YouTube 影片，請聯繫管理員。</p>
                    </div>
                `;
            }
            return;
        }
        
        // 載入影片
        const success = loadVideo(selectedTopic.youtubeUrl);
        
        if (!success) {
            showNotification('無法載入影片，可能是 URL 無效或是影片不存在', 'error');
            document.getElementById('topic-selection').style.display = 'block';
            document.getElementById('video-section').style.display = 'none';
            return;
        }
        
        // 載入問卷
        currentQuestionnaire = await getQuestionnaire(selectedTopic.id);
        
        // 儲存觀看記錄 (狀態為觀看中)
        const result = {
            id: Date.now().toString(), // 使用時間戳作為唯一 ID
            qrCode: qrCodeResult.value,
            topicId: selectedTopic.id,
            topicName: selectedTopic.name,
            status: 'viewing',
            score: 0,
            maxScore: 0,
            nurseAcknowledged: false,
            timestamp: new Date().toISOString()
        };
        
        try {
            await addResult(result);
        } catch (error) {
            console.error('Error saving viewing record:', error);
            // 不阻止繼續播放影片
        }
    } catch (error) {
        console.error('Error loading video and questionnaire:', error);
        showNotification('載入影片和問卷時發生錯誤: ' + error.message, 'error');
    }
}

// 渲染問卷
function renderQuestionnaire() {
    const form = document.getElementById('questionnaire-form');
    
    if (!form || !currentQuestionnaire) return;
    
    form.innerHTML = '';
    
    if (!currentQuestionnaire.questions || currentQuestionnaire.questions.length === 0) {
        form.innerHTML = '<div class="empty-questionnaire"><p>此主題尚未設定問卷題目。</p></div>';
        // 隱藏提交按鈕
        const submitBtn = document.getElementById('submit-questionnaire');
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }
        return;
    }
    
    currentQuestionnaire.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        
        const questionTitle = document.createElement('h4');
        questionTitle.textContent = `${index + 1}. ${question.text}`;
        questionDiv.appendChild(questionTitle);
        
        if (question.type === 'yesno') {
            // 是非題
            const options = document.createElement('div');
            options.className = 'options';
            
            ['是', '否'].forEach(option => {
                const optionItem = document.createElement('div');
                optionItem.className = 'option-item';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `question_${index}`;
                input.value = option;
                input.id = `q${index}_${option}`;
                input.required = true;
                
                const label = document.createElement('label');
                label.htmlFor = `q${index}_${option}`;
                label.textContent = option;
                
                optionItem.appendChild(input);
                optionItem.appendChild(label);
                options.appendChild(optionItem);
            });
            
            questionDiv.appendChild(options);
        } else if (question.type === 'choice') {
            // 選擇題
            const options = document.createElement('div');
            options.className = 'options';
            
            question.options.forEach((option, optIndex) => {
                const optionItem = document.createElement('div');
                optionItem.className = 'option-item';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `question_${index}`;
                input.value = optIndex.toString();
                input.id = `q${index}_opt${optIndex}`;
                input.required = true;
                
                const label = document.createElement('label');
                label.htmlFor = `q${index}_opt${optIndex}`;
                label.textContent = option;
                
                optionItem.appendChild(input);
                optionItem.appendChild(label);
                options.appendChild(optionItem);
            });
            
            questionDiv.appendChild(options);
        }
        
        form.appendChild(questionDiv);
    });
}

// 提交問卷
async function submitQuestionnaire() {
    if (!isVideoEnded()) {
        showNotification('請先觀看完整部影片', 'warning');
        return;
    }
    
    const form = document.getElementById('questionnaire-form');
    
    // 檢查是否填寫完整
    if (!form.checkValidity()) {
        showNotification('請填寫所有問題', 'warning');
        
        // 標記未填寫的題目
        const questions = form.querySelectorAll('.question-item');
        questions.forEach(question => {
            const inputs = question.querySelectorAll('input[type="radio"]');
            let isAnswered = false;
            
            inputs.forEach(input => {
                if (input.checked) {
                    isAnswered = true;
                }
            });
            
            if (!isAnswered) {
                question.classList.add('unanswered');
                
                // 3秒後移除標記
                setTimeout(() => {
                    question.classList.remove('unanswered');
                }, 3000);
            }
        });
        
        return;
    }
    
    try {
        // 顯示提交中狀態
        const submitBtn = document.getElementById('submit-questionnaire');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner small"></span> 提交中...';
        
        // 計算分數
        let totalScore = 0;
        let maxScore = 0;
        
        currentQuestionnaire.questions.forEach((question, index) => {
            const selector = `input[name="question_${index}"]:checked`;
            const selectedInput = document.querySelector(selector);
            
            if (!selectedInput) return; // 跳過未回答的問題
            
            const answer = selectedInput.value;
            maxScore += question.score || 0;
            
            if (question.type === 'yesno') {
                if (answer === question.correctAnswer) {
                    totalScore += question.score || 0;
                }
            } else if (question.type === 'choice') {
                if (parseInt(answer) === question.correctOptionIndex) {
                    totalScore += question.score || 0;
                }
            }
        });
        
        // 創建結果
        const result = {
            id: Date.now().toString(), // 使用時間戳作為唯一 ID
            qrCode: document.getElementById('qrcode-result').value,
            topicId: selectedTopic.id,
            topicName: selectedTopic.name,
            status: 'completed',
            score: totalScore,
            maxScore: maxScore,
            nurseAcknowledged: false,
            timestamp: new Date().toISOString()
        };
        
        // 儲存結果
        const success = await addResult(result);
        
        if (success) {
            // 嘗試傳送通知 Email
            try {
                await sendNotificationEmail(result);
            } catch (emailError) {
                console.warn('Failed to send notification email:', emailError);
                // 繼續處理，不阻塞主流程
            }
            
            // 顯示完成訊息
            document.getElementById('video-section').style.display = 'none';
            document.getElementById('completion-message').style.display = 'block';
            
            // 滾動到頂部
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            showNotification('問卷已成功提交！', 'success');
        } else {
            showNotification('提交問卷時發生錯誤，請再試一次', 'error');
            // 恢復按鈕狀態
            submitBtn.disabled = false;
            submitBtn.textContent = '送出問卷';
        }
    } catch (error) {
        console.error('Error submitting questionnaire:', error);
        showNotification('提交問卷時發生錯誤: ' + error.message, 'error');
        
        // 恢復按鈕狀態
        const submitBtn = document.getElementById('submit-questionnaire');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '送出問卷';
        }
    }
}

// 返回主頁
function returnToHome() {
    // 重設頁面狀態
    document.getElementById('qrcode-result').value = '';
    document.getElementById('submit-topic').disabled = true;
    
    document.getElementById('completion-message').style.display = 'none';
    document.getElementById('video-section').style.display = 'none';
    document.getElementById('topic-selection').style.display = 'block';
    
    // 移除已選擇的主題樣式
    const selectedElement = document.querySelector('.topic-item.selected');
    if (selectedElement) {
        selectedElement.classList.remove('selected');
    }
    
    selectedTopic = null;
    currentQuestionnaire = null;
    
    // 滾動到頂部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
// 在 index.js 中添加下面的代碼，用於處理 QR Code 掃描後的床號匹配

// 獲取床號對應的主題配置
async function getBedTopics(bedNumber) {
    try {
        // 讀取床號配置
        let bedConfigurations = [];
        try {
            const data = await window.readGitHubFile('bed_configurations.json');
            bedConfigurations = JSON.parse(data);
        } catch (error) {
            console.warn('無法讀取床號配置:', error);
            return null;
        }
        
        // 查找匹配的床號配置
        const config = bedConfigurations.find(c => c.bedNumber === bedNumber);
        return config || null;
    } catch (error) {
        console.error('獲取床號主題出錯:', error);
        return null;
    }
}

// 處理 QR Code 掃描結果
async function handleQRCodeScan(qrResult) {
    const qrcodeResult = document.getElementById('qrcode-result');
    qrcodeResult.value = qrResult;
    
    // 根據床號獲取配置的主題列表
    const config = await getBedTopics(qrResult);
    
    if (config && config.topics && config.topics.length > 0) {
        console.log(`為床號 ${qrResult} 找到配置: ${config.groupName}`);
        
        // 根據配置的主題過濾顯示主題列表
        const topicCards = document.querySelectorAll('.topic-card');
        let visibleCount = 0;
        
        topicCards.forEach(card => {
            const topicId = card.dataset.id;
            if (config.topics.includes(topicId)) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // 顯示配置名稱
        const topicSection = document.getElementById('topic-selection');
        topicSection.querySelector('h2').textContent = `請選擇衛教主題 - ${config.groupName}`;
        
        //
// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果已經認證，初始化頁面
    if (typeof isUserAuthenticated === 'function' && isUserAuthenticated()) {
        onAuthenticated();
    }
    
    // 顯示影片結束時的問卷
    document.addEventListener('videoEnded', function() {
        renderQuestionnaire();
        
        // 滾動到問卷部分
        const questionnaireSection = document.getElementById('questionnaire-section');
        if (questionnaireSection) {
            questionnaireSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
        
        showNotification('請填寫問卷', 'info');
    });
});
