// 衛教影片觀看頁面功能

let topics = [];
let selectedTopic = null;
let currentQuestionnaire = null;

// 當 Google API 認證完成時
function onAuthenticated() {
    initializeDriveFiles().then(success => {
        if (success) {
            loadTopics();
        }
    });
}

// 載入衛教主題
async function loadTopics() {
    try {
        topics = await getAllTopics();
        renderTopics();
    } catch (error) {
        console.error('Error loading topics:', error);
        alert('載入衛教主題時發生錯誤。請重新整理頁面再試。');
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
        topicElement.textContent = topic.name;
        
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
        alert('請選擇一個衛教主題');
        return;
    }
    
    try {
        // 顯示影片區段
        document.getElementById('topic-selection').style.display = 'none';
        document.getElementById('video-section').style.display = 'block';
        
        // 設置標題
        document.getElementById('video-title').textContent = `衛教影片: ${selectedTopic.name}`;
        
        // 載入影片
        const success = loadVideo(selectedTopic.youtubeUrl);
        
        if (!success) {
            alert('無法載入影片，可能是 URL 無效或是影片不存在');
            document.getElementById('topic-selection').style.display = 'block';
            document.getElementById('video-section').style.display = 'none';
            return;
        }
        
        // 載入問卷
        currentQuestionnaire = await getQuestionnaire(selectedTopic.id);
    } catch (error) {
        console.error('Error loading video and questionnaire:', error);
        alert('載入影片和問卷時發生錯誤');
    }
}

// 渲染問卷
function renderQuestionnaire() {
    const form = document.getElementById('questionnaire-form');
    
    if (!form || !currentQuestionnaire) return;
    
    form.innerHTML = '';
    
    if (currentQuestionnaire.questions.length === 0) {
        form.innerHTML = '<p>此主題尚未設定問卷題目。</p>';
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
        alert('請先觀看完整部影片');
        return;
    }
    
    const form = document.getElementById('questionnaire-form');
    
    // 檢查是否填寫完整
    if (!form.checkValidity()) {
        alert('請填寫所有問題');
        return;
    }
    
    try {
        // 計算分數
        let totalScore = 0;
        let maxScore = 0;
        // 衛教影片觀看頁面功能

let topics = [];
let selectedTopic = null;
let currentQuestionnaire = null;

// 當 Google API 認證完成時
function onAuthenticated() {
    initializeDriveFiles().then(success => {
        if (success) {
            loadTopics();
        }
    });
}

// 載入衛教主題
async function loadTopics() {
    try {
        topics = await getAllTopics();
        renderTopics();
    } catch (error) {
        console.error('Error loading topics:', error);
        alert('載入衛教主題時發生錯誤。請重新整理頁面再試。');
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
        topicElement.textContent = topic.name;
        
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
        alert('請選擇一個衛教主題');
        return;
    }
    
    try {
        // 顯示影片區段
        document.getElementById('topic-selection').style.display = 'none';
        document.getElementById('video-section').style.display = 'block';
        
        // 設置標題
        document.getElementById('video-title').textContent = `衛教影片: ${selectedTopic.name}`;
        
        // 載入影片
        const success = loadVideo(selectedTopic.youtubeUrl);
        
        if (!success) {
            alert('無法載入影片，可能是 URL 無效或是影片不存在');
            document.getElementById('topic-selection').style.display = 'block';
            document.getElementById('video-section').style.display = 'none';
            return;
        }
        
        // 載入問卷
        currentQuestionnaire = await getQuestionnaire(selectedTopic.id);
    } catch (error) {
        console.error('Error loading video and questionnaire:', error);
        alert('載入影片和問卷時發生錯誤');
    }
}

// 渲染問卷
function renderQuestionnaire() {
    const form = document.getElementById('questionnaire-form');
    
    if (!form || !currentQuestionnaire) return;
    
    form.innerHTML = '';
    
    if (currentQuestionnaire.questions.length === 0) {
        form.innerHTML = '<p>此主題尚未設定問卷題目。</p>';
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
        alert('請先觀看完整部影片');
        return;
    }
    
    const form = document.getElementById('questionnaire-form');
    
    // 檢查是否填寫完整
    if (!form.checkValidity()) {
        alert('請填寫所有問題');
        return;
    }
    
    try {
        // 計算分數
        let totalScore = 0;
        let maxScore = 0;
        currentQuestionnaire.questions.forEach((question, index) => {
            const answer = document.querySelector(`input[name="question_${index}"]:checked`).value;
            maxScore += question.score;
            
            if (question.type === 'yesno') {
                if (answer === question.correctAnswer) {
                    totalScore += question.score;
                }
            } else if (question.type === 'choice') {
                if (parseInt(answer) === question.correctOptionIndex) {
                    totalScore += question.score;
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
            // 傳送通知 Email
            await sendNotificationEmail(result);
            
            // 顯示完成訊息
            document.getElementById('video-section').style.display = 'none';
            document.getElementById('completion-message').style.display = 'block';
        } else {
            alert('提交問卷時發生錯誤，請再試一次');
        }
    } catch (error) {
        console.error('Error submitting questionnaire:', error);
        alert('提交問卷時發生錯誤');
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
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
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
    
    // 顯示影片結束時的問卷
    document.addEventListener('videoEnded', function() {
        renderQuestionnaire();
    });
});
