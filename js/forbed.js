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
            bedTopicMapping = JSON.parse(mappingData);
            console.log('床號與題組對應關係載入成功:', bedTopicMapping);
        } else {
            console.warn('未找到床號與題組對應關係，使用空數組');
            bedTopicMapping = [];
        }
    } catch (error) {
        console.error('載入床號與題組對應關係錯誤:', error);
        showNotification('載入床號與題組對應關係時發生錯誤', 'error');
        bedTopicMapping = [];
    }
}

// 根據床號獲取對應的題組ID列表
function getTopicIdsByBedNumber(bedNumber) {
    const mapping = bedTopicMapping.find(item => item.bedNumber === bedNumber);
    return mapping ? mapping.topicIds : null;
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
    
    // QR Code 掃描完成後重新載入主題列表
    const qrCodeResult = document.getElementById('qrcode-result');
    if (qrCodeResult) {
        qrCodeResult.addEventListener('change', function() {
            filterTopicsByBedNumber(this.value);
        });
    }
}

// 根據床號過濾顯示對應的題組
function filterTopicsByBedNumber(bedNumber) {
    if (!bedNumber) return;
    
    console.log('過濾床號:', bedNumber);
    const topicIds = getTopicIdsByBedNumber(bedNumber);
    
    if (!topicIds || topicIds.length === 0) {
        console.log('未找到該床號對應的題組設定，顯示所有主題');
        renderTopics(topics);
        return;
    }
    
    console.log('找到床號對應的題組:', topicIds);
    // 過濾出床號對應的題組
    const filteredTopics = topics.filter(topic => topicIds.includes(topic.id));
    renderTopics(filteredTopics);
    
    // 如果只有一個題組，自動選擇
    if (filteredTopics.length === 1) {
        selectTopic(filteredTopics[0]);
        // 如果是自動選擇的，可以考慮自動載入影片
        // document.getElementById('submit-topic').click();
    }
}

// 載入衛教主題
async function loadTopics() {
    try {
        const allTopics = await getAllTopics();
        
        if (!Array.isArray(allTopics) || allTopics.length === 0) {
            console.warn('Empty or invalid topics data, initializing defaults');
            topics = Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                name: `衛教主題 ${i + 1}`,
                youtubeUrl: ''
            }));
        } else {
            topics = allTopics;
        }
        
        // 檢查是否已掃描QR Code
        const qrCodeResult = document.getElementById('qrcode-result');
        if (qrCodeResult && qrCodeResult.value) {
            // 如果已掃描QR Code，根據床號過濾主題
            filterTopicsByBedNumber(qrCodeResult.value);
        } else {
            // 否則顯示所有主題
            renderTopics(topics);
        }
    } catch (error) {
        console.error('Error loading topics:', error);
        showNotification('載入衛教主題時發生錯誤: ' + error.message, 'error');
    }
}

// 渲染衛教主題列表
function renderTopics(topicsToRender) {
    const topicList = document.getElementById('topic-list');
    
    if (!topicList) return;
    
    topicList.innerHTML = '';
    
    if (!topicsToRender || topicsToRender.length === 0) {
        topicList.innerHTML = '<div class="empty-topics">沒有可用的衛教主題</div>';
        return;
    }
    
    topicsToRender.forEach(topic => {
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
    
    // 顯示提交按鈕
    const submitBtn = document.getElementById('submit-questionnaire');
    if (submitBtn) {
        submitBtn.style.display = 'block';
    }
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
    const qrCodeResult = document.getElementById('qrcode-result');
    const bedNumber = qrCodeResult.value;
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
    
    // 根據床號重新過濾題組
    if (bedNumber) {
        filterTopicsByBedNumber(bedNumber);
    } else {
        renderTopics(topics);
    }
    
    // 滾動到頂部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果已經認證，初始化頁面
    if (typeof isUserAuthenticated === 'function' && isUserAuthenticated()) {
        onAuthenticated();
    }
    
    // 顯示影片結束時的問卷
    document.addEventListener('videoEnded', function() {
        // 顯示問卷區域
        const questionnaireSection = document.getElementById('questionnaire-section');
        if (questionnaireSection) {
            questionnaireSection.style.display = 'block';
        }
        
        renderQuestionnaire();
        
        // 滾動到問卷部分
        if (questionnaireSection) {
            questionnaireSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
        
        showNotification('請填寫問卷', 'info');
    });
    
    // 設置QR碼掃描器事件
    const scanButton = document.getElementById('scan-button');
    if (scanButton) {
        scanButton.addEventListener('click', function() {
            const scanner = document.getElementById('qrcode-scanner');
            if (scanner) {
                scanner.style.display = 'block';
                startQRScanner();
            }
        });
    }
    
    const closeScanner = document.getElementById('close-scanner');
    if (closeScanner) {
        closeScanner.addEventListener('click', function() {
            const scanner = document.getElementById('qrcode-scanner');
            if (scanner) {
                scanner.style.display = 'none';
                stopQRScanner();
            }
        });
    }
});

// QR Code 掃描器相關功能
let qrScanner = null;

function startQRScanner() {
    const videoElement = document.getElementById('preview');
    
    if (!videoElement) return;
    
    if (window.Html5Qrcode) {
        qrScanner = new Html5Qrcode("preview");
        
        qrScanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                // 掃描成功後
                document.getElementById('qrcode-result').value = decodedText;
                
                // 觸發change事件以過濾主題
                const event = new Event('change');
                document.getElementById('qrcode-result').dispatchEvent(event);
                
                // 關閉掃描器
                qrScanner.stop().then(() => {
                    document.getElementById('qrcode-scanner').style.display = 'none';
                    showNotification('QR Code 掃描成功: ' + decodedText, 'success');
                }).catch(error => {
                    console.error('關閉掃描器錯誤:', error);
                });
            },
            (errorMessage) => {
                // 掃描錯誤處理
                console.warn('QR掃描錯誤:', errorMessage);
            }
        ).catch((err) => {
            console.error('啟動掃描器錯誤:', err);
            showNotification('無法啟動相機，請確認已授予相機權限', 'error');
        });
    } else if (window.Instascan && window.Instascan.Scanner) {
        // 備用方案使用 Instascan
        qrScanner = new Instascan.Scanner({ video: videoElement });
        
        qrScanner.addListener('scan', function(content) {
            document.getElementById('qrcode-result').value = content;
            
            // 觸發change事件以過濾主題
            const event = new Event('change');
            document.getElementById('qrcode-result').dispatchEvent(event);
            
            // 關閉掃描器
            qrScanner.stop();
            document.getElementById('qrcode-scanner').style.display = 'none';
            showNotification('QR Code 掃描成功: ' + content, 'success');
        });
        
        Instascan.Camera.getCameras().then(function(cameras) {
            if (cameras.length > 0) {
                // 優先使用後置相機
                let selectedCamera = cameras[0];
                for (let camera of cameras) {
                    if (camera.name && camera.name.toLowerCase().includes('back')) {
                        selectedCamera = camera;
                        break;
                    }
                }
                qrScanner.start(selectedCamera);
            } else {
                showNotification('未檢測到相機', 'error');
            }
        }).catch(function(error) {
            console.error('獲取相機列表錯誤:', error);
            showNotification('無法訪問相機，請確認已授予相機權限', 'error');
        });
    } else {
        showNotification('未載入QR碼掃描庫，請重新載入頁面', 'error');
    }
}

function stopQRScanner() {
    if (qrScanner) {
        if (typeof qrScanner.stop === 'function') {
            qrScanner.stop().catch(error => {
                console.error('停止掃描器錯誤:', error);
            });
        }
        qrScanner = null;
    }
}

// GitHub 存儲相關功能擴展

// 獲取床號和題組對應的設定
async function getBedTopicMappings() {
    try {
        const data = await fetchFileFromGitHub('data/bed-topic-mapping.json');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('獲取床號和題組對應設定錯誤:', error);
        return [];
    }
}

// 保存床號和題組對應的設定
async function saveBedTopicMappings(mappings) {
    try {
        const content = JSON.stringify(mappings, null, 2);
        const result = await saveFileToGitHub('data/bed-topic-mapping.json', content);
        return result;
    } catch (error) {
        console.error('保存床號和題組對應設定錯誤:', error);
        throw error;
    }
}
