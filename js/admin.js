// 管理設定頁面功能

let topics = [];
let currentQuestionnaireData = null;
let currentTopicId = null;
let filteredTopics = [];

// 當 GitHub API 認證完成時
function onAuthenticated() {
    // 初始化儲存庫結構
    initializeRepositoryStructure().then(result => {
        if (result.success) {
            // 如果初始化成功，載入資料
            initializeGitHubStorage().then(success => {
                if (success) {
                    loadTopics();
                    setupEventListeners();
                    showNotification('資料載入成功', 'success');
                } else {
                    showNotification('初始化儲存失敗，請檢查 GitHub 連接', 'error');
                }
            }).catch(error => {
                console.error('Storage initialization error:', error);
                showNotification('儲存初始化錯誤: ' + error.message, 'error');
            });
        } else {
            showNotification(result.message, 'error');
        }
    }).catch(error => {
        console.error('Repository structure initialization error:', error);
        showNotification('儲存庫結構初始化錯誤: ' + error.message, 'error');
    });
}

// 設置事件監聽器
function setupEventListeners() {
    // 主題過濾功能
    const topicFilter = document.getElementById('topic-filter');
    if (topicFilter) {
        topicFilter.addEventListener('input', filterTopics);
    }
    
    // 主題狀態過濾
    const statusFilter = document.getElementById('topic-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterTopics);
    }
    
    // 清除緩存按鈕
    const clearCacheBtn = document.getElementById('clear-cache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if (confirm('確定要清除本地緩存嗎？這將重新從 GitHub 載入所有資料。')) {
                invalidateCache();
                showNotification('快取已清除，重新載入資料', 'info');
                loadTopics();
            }
        });
    }
    
    // 問卷編輯標籤切換
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有活動標籤
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // 隱藏所有內容
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // 顯示選定標籤和內容
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
            
            // 如果切換到預覽標籤，渲染預覽
            if (tabId === 'preview-tab') {
                renderQuestionnairePreview();
            }
        });
    });
}

// 過濾主題
function filterTopics() {
    const filterText = document.getElementById('topic-filter').value.toLowerCase();
    const statusFilter = document.getElementById('topic-status-filter').value;
    
    // 應用過濾器
    filteredTopics = topics.filter(topic => {
        // 文字過濾
        const matchesText = topic.name.toLowerCase().includes(filterText) || 
                           (topic.youtubeUrl && topic.youtubeUrl.toLowerCase().includes(filterText));
        
        // 狀態過濾
        let matchesStatus = true;
        if (statusFilter !== 'all') {
            const hasVideo = topic.youtubeUrl && topic.youtubeUrl.trim() !== '';
            const hasQuestions = async () => {
                const questionnaire = await getQuestionnaire(topic.id);
                return questionnaire && questionnaire.questions && questionnaire.questions.length > 0;
            };
            
            switch (statusFilter) {
                case 'with-video':
                    matchesStatus = hasVideo;
                    break;
                case 'without-video':
                    matchesStatus = !hasVideo;
                    break;
                case 'with-questions':
                    matchesStatus = hasQuestions();
                    break;
                case 'without-questions':
                    matchesStatus = !hasQuestions();
                    break;
            }
        }
        
        return matchesText && matchesStatus;
    });
    
    renderTopicsTable();
}

// 載入衛教主題
async function loadTopics() {
    try {
        // 顯示載入中訊息
        const tableBody = document.getElementById('topics-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="loading-message">載入中...</td></tr>';
        }
        
        topics = await getAllTopics();
        if (!topics || !Array.isArray(topics) || topics.length === 0) {
            console.warn('Topics data is empty or invalid, initializing defaults');
            topics = Array.from({ length: 30 }, (_, i) => ({
                id: i + 1,
                name: `衛教主題 ${i + 1}`,
                youtubeUrl: ''
            }));
            await updateTopics(topics);
        }
        
        // 初始化過濾後的主題列表
        filteredTopics = [...topics];
        
        renderTopicsTable();
    } catch (error) {
        console.error('Error loading topics:', error);
        showNotification('載入衛教主題時發生錯誤: ' + error.message, 'error');
        
        // 顯示錯誤訊息
        const tableBody = document.getElementById('topics-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="error-message">載入失敗: ${error.message}</td></tr>`;
        }
    }
}

// 渲染主題表格
function renderTopicsTable() {
    const tableBody = document.getElementById('topics-body');
    
    if (!tableBody) return;
    
    if (filteredTopics.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-message">沒有符合條件的主題</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    filteredTopics.forEach(topic => {
        const row = document.createElement('tr');
        
        // 編號
        const idCell = document.createElement('td');
        idCell.textContent = topic.id;
        row.appendChild(idCell);
        
        // 主題名稱
        const nameCell = document.createElement('td');
        nameCell.textContent = topic.name || '未設定';
        row.appendChild(nameCell);
        
        // YouTube URL
        const urlCell = document.createElement('td');
        if (topic.youtubeUrl) {
            const urlText = topic.youtubeUrl.length > 30 
                ? topic.youtubeUrl.substring(0, 27) + '...' 
                : topic.youtubeUrl;
            
            // 創建可點擊的鏈接
            const urlLink = document.createElement('a');
            urlLink.href = topic.youtubeUrl;
            urlLink.target = '_blank';
            urlLink.textContent = urlText;
            urlLink.title = topic.youtubeUrl;
            urlLink.className = 'url-link';
            
            urlCell.appendChild(urlLink);
        } else {
            urlCell.textContent = '未設定';
            urlCell.className = 'not-set';
        }
        row.appendChild(urlCell);
        
        // 問卷題數
        const questionCountCell = document.createElement('td');
        questionCountCell.textContent = '載入中...';
        questionCountCell.dataset.topicId = topic.id;
        row.appendChild(questionCountCell);
        
        // 操作
        const actionCell = document.createElement('td');
        
        // 編輯主題按鈕
        const editButton = document.createElement('button');
        editButton.className = 'action-button edit-button';
        editButton.innerHTML = '<span class="icon">✏️</span> 編輯主題';
        editButton.addEventListener('click', () => showTopicEditModal(topic));
        actionCell.appendChild(editButton);
        
        // 編輯問卷按鈕
        const questionnaireButton = document.createElement('button');
        questionnaireButton.className = 'action-button questionnaire-button';
        questionnaireButton.innerHTML = '<span class="icon">📝</span> 編輯問卷';
        questionnaireButton.addEventListener('click', () => showQuestionnaireEditModal(topic));
        actionCell.appendChild(questionnaireButton);
        
        row.appendChild(actionCell);
        
        tableBody.appendChild(row);
        
        // 獲取問卷題數
        getQuestionCount(topic.id);
    });
}

// 獲取問卷題數
async function getQuestionCount(topicId) {
    try {
        const questionnaire = await getQuestionnaire(topicId);
        const countCell = document.querySelector(`#topics-body td[data-topic-id="${topicId}"]`);
        
        if (countCell) {
            const questionsCount = questionnaire && questionnaire.questions ? questionnaire.questions.length : 0;
            
            // 建立含有標籤的顯示內容
            const badge = document.createElement('span');
            badge.className = `badge ${questionsCount > 0 ? 'success' : 'warning'}`;
            badge.textContent = questionsCount;
            
            // 清空單元格並添加標籤
            countCell.innerHTML = '';
            countCell.appendChild(badge);
            
            // 添加視覺提示
            if (questionsCount === 0) {
                countCell.title = '此主題尚未設定問卷';
            } else {
                countCell.title = `此主題有 ${questionsCount} 個問卷題目`;
            }
        }
    } catch (error) {
        console.error(`Error getting question count for topic ${topicId}:`, error);
        const countCell = document.querySelector(`#topics-body td[data-topic-id="${topicId}"]`);
        if (countCell) {
            countCell.textContent = '錯誤';
            countCell.className = 'error-text';
            countCell.title = '獲取問卷數據時發生錯誤';
        }
    }
}

// 顯示主題編輯模態框
function showTopicEditModal(topic) {
    const modal = document.getElementById('topic-modal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-topic-edit');
    const form = document.getElementById('topic-form');
    const topicIdInput = document.getElementById('topic-id');
    const topicNameInput = document.getElementById('topic-name');
    const topicUrlInput = document.getElementById('topic-url');
    const urlPreview = document.getElementById('url-preview');
    
    // 填充表單資料
    topicIdInput.value = topic.id;
    topicNameInput.value = topic.name || '';
    topicUrlInput.value = topic.youtubeUrl || '';
    
    // 更新預覽
    updateUrlPreview(topic.youtubeUrl);
    
    // URL 輸入事件
    topicUrlInput.addEventListener('input', function() {
        updateUrlPreview(this.value);
    });
    
    // 顯示模態框
    modal.style.display = 'block';
    
    // 聚焦名稱輸入框
    setTimeout(() => topicNameInput.focus(), 100);
    
    // 關閉按鈕事件
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // 取消按鈕事件
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // 點擊模態框外部關閉
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // 表單提交事件
        form.onsubmit = function(e) {
        e.preventDefault();
        saveTopic(parseInt(topicIdInput.value), topicNameInput.value, topicUrlInput.value);
    };
}

// 更新 URL 預覽
function updateUrlPreview(url) {
    const urlPreview = document.getElementById('url-preview');
    
    if (!urlPreview) return;
    
    // 清空預覽區域
    urlPreview.innerHTML = '';
    
    if (!url || url.trim() === '') {
        // 顯示未設定的訊息
        urlPreview.innerHTML = '<div class="preview-placeholder">請輸入 YouTube URL</div>';
        return;
    }
    
    if (isValidYoutubeUrl(url)) {
        // 從 URL 提取影片 ID
        const videoId = extractYoutubeVideoId(url);
        
        if (videoId) {
            // 創建嵌入式預覽
            const iframe = document.createElement('iframe');
            iframe.width = '100%';
            iframe.height = '180';
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
            iframe.title = 'YouTube video player';
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            
            urlPreview.appendChild(iframe);
        } else {
            urlPreview.innerHTML = '<div class="preview-error">無法從 URL 提取影片 ID</div>';
        }
    } else {
        urlPreview.innerHTML = '<div class="preview-error">不是有效的 YouTube URL</div>';
    }
}

// 儲存主題
async function saveTopic(id, name, url) {
    try {
        // 基本驗證
        if (!name || name.trim() === '') {
            showNotification('主題名稱不能為空', 'error');
            return;
        }
        
        // YouTube URL 驗證
        if (url && !isValidYoutubeUrl(url)) {
            if (!confirm('所提供的 URL 似乎不是有效的 YouTube 連結。確定要繼續儲存嗎？')) {
                return;
            }
        }
        
        // 顯示儲存中提示
        const saveBtn = document.querySelector('#topic-form button[type="submit"]');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '儲存中...';
        saveBtn.disabled = true;
        
        // 更新本地資料
        const topicIndex = topics.findIndex(t => t.id === id);
        
        if (topicIndex !== -1) {
            topics[topicIndex].name = name;
            topics[topicIndex].youtubeUrl = url;
            
            // 更新 GitHub 上的資料
            const success = await updateTopics(topics);
            
            // 恢復按鈕狀態
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            
            if (success) {
                // 關閉模態框
                document.getElementById('topic-modal').style.display = 'none';
                
                // 更新過濾後的主題列表
                filteredTopics = filteredTopics.map(t => 
                    t.id === id ? { ...t, name, youtubeUrl: url } : t
                );
                
                // 重新渲染表格
                renderTopicsTable();
                
                showNotification('主題已成功更新', 'success');
            } else {
                showNotification('更新主題時發生錯誤', 'error');
            }
        } else {
            showNotification('找不到指定 ID 的主題', 'error');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error saving topic:', error);
        showNotification('儲存主題時發生錯誤: ' + error.message, 'error');
        
        // 恢復按鈕狀態
        const saveBtn = document.querySelector('#topic-form button[type="submit"]');
        if (saveBtn) {
            saveBtn.textContent = '儲存主題';
            saveBtn.disabled = false;
        }
    }
}

// 驗證 YouTube URL
function isValidYoutubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
}

// 從 YouTube URL 提取影片 ID
function extractYoutubeVideoId(url) {
    // 匹配多種 YouTube URL 格式
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// 顯示問卷編輯模態框
async function showQuestionnaireEditModal(topic) {
    try {
        const modal = document.getElementById('questionnaire-modal');
        const closeBtn = modal.querySelector('.close');
        const topicNameSpan = document.getElementById('current-topic-name');
        
        // 顯示載入中效果
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'questionnaire-loading';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div><div class="loading-text">載入問卷資料...</div>';
        
        const questionsContainer = document.getElementById('questions-container');
        questionsContainer.innerHTML = '';
        questionsContainer.appendChild(loadingIndicator);
        
        // 設置當前主題
        currentTopicId = topic.id;
        topicNameSpan.textContent = topic.name;
        
        // 重設標籤狀態
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('questions-tab').style.display = 'block';
        document.getElementById('preview-tab').style.display = 'none';
        document.querySelector('[data-tab="questions-tab"]').classList.add('active');
        
        // 顯示模態框 (先顯示，然後再載入資料，給使用者更好的視覺回饋)
        modal.style.display = 'block';
        
        // 關閉按鈕事件
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        // 點擊模態框外部關閉
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        // 載入問卷資料 (非同步)
        try {
            currentQuestionnaireData = await getQuestionnaire(topic.id);
            
            // 修正：確保 currentQuestionnaireData 有效
            if (!currentQuestionnaireData) {
                currentQuestionnaireData = { topicId: topic.id, questions: [] };
            }
            
            // 修正：確保 questions 陣列存在
            if (!currentQuestionnaireData.questions) {
                currentQuestionnaireData.questions = [];
            }
            
            // 移除載入指示器並渲染問題
            questionsContainer.removeChild(loadingIndicator);
            renderQuestions();
        } catch (dataError) {
            console.error('Error loading questionnaire data:', dataError);
            questionsContainer.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">❌</div>
                    <div class="error-text">載入問卷資料失敗：${dataError.message}</div>
                    <button id="retry-load-questionnaire" class="retry-button">重試</button>
                </div>
            `;
            
            document.getElementById('retry-load-questionnaire').addEventListener('click', () => {
                showQuestionnaireEditModal(topic);
            });
        }
    } catch (error) {
        console.error('Error showing questionnaire edit modal:', error);
        showNotification('開啟問卷編輯視窗時發生錯誤: ' + error.message, 'error');
    }
}

// 渲染問題
function renderQuestions() {
    const container = document.getElementById('questions-container');
    
    if (!container || !currentQuestionnaireData) return;
    
    container.innerHTML = '';
    
    if (!currentQuestionnaireData.questions || currentQuestionnaireData.questions.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-questions';
        emptyMsg.innerHTML = `
            <div class="empty-icon">📋</div>
            <h3>此主題尚未設定問卷題目</h3>
            <p>請使用下方的按鈕新增是非題或選擇題。</p>
        `;
        container.appendChild(emptyMsg);
        return;
    }
    
    // 創建題目排序區域
    const sortableContainer = document.createElement('div');
    sortableContainer.className = 'sortable-questions';
    sortableContainer.id = 'sortable-questions';
    container.appendChild(sortableContainer);
    
    currentQuestionnaireData.questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.dataset.index = index;
        
        // 問題標題區域
        const questionHeader = document.createElement('div');
        questionHeader.className = 'question-header';
        
        // 問題編號
        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        questionNumber.textContent = `問題 ${index + 1}`;
        questionHeader.appendChild(questionNumber);
        
        // 題型標籤
        const typeLabel = document.createElement('div');
        typeLabel.className = `question-type-label ${question.type === 'yesno' ? 'type-yesno' : 'type-choice'}`;
        typeLabel.textContent = question.type === 'yesno' ? '是非題' : '選擇題';
        questionHeader.appendChild(typeLabel);
        
        // 刪除按鈕
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-question';
        deleteBtn.innerHTML = '❌';
        deleteBtn.title = '刪除此問題';
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            if (confirm(`確定要刪除問題 ${index + 1} 嗎？`)) {
                currentQuestionnaireData.questions.splice(index, 1);
                renderQuestions();
            }
        };
        questionHeader.appendChild(deleteBtn);
        
        questionCard.appendChild(questionHeader);
        
        // 問題內容
        const questionContent = document.createElement('div');
        questionContent.className = 'question-content';
        
        const questionLabel = document.createElement('label');
        questionLabel.textContent = '問題內容：';
        questionLabel.htmlFor = `question_text_${index}`;
        questionContent.appendChild(questionLabel);
        
        const questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.id = `question_text_${index}`;
        questionInput.className = 'question-input';
        questionInput.value = question.text || '';
        questionInput.placeholder = '請輸入問題內容';
        questionInput.required = true;
        questionInput.oninput = function() {
            currentQuestionnaireData.questions[index].text = this.value;
        };
        questionContent.appendChild(questionInput);
        
        questionCard.appendChild(questionContent);
        
        // 分數設定
        const scoreContainer = document.createElement('div');
        scoreContainer.className = 'score-container';
        
        const scoreLabel = document.createElement('label');
        scoreLabel.textContent = '分數：';
        scoreLabel.htmlFor = `question_score_${index}`;
        scoreContainer.appendChild(scoreLabel);
        
        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.className = 'score-input';
        scoreInput.id = `question_score_${index}`;
        scoreInput.min = 1;
        scoreInput.max = 100;
        scoreInput.value = question.score || 1;
        scoreInput.oninput = function() {
            currentQuestionnaireData.questions[index].score = parseInt(this.value) || 1;
        };
        scoreContainer.appendChild(scoreInput);
        
        questionCard.appendChild(scoreContainer);
        
        // 依問題類型顯示不同的選項
        if (question.type === 'yesno') {
            // 是非題
            renderYesNoOptions(question, index, questionCard);
        } else if (question.type === 'choice') {
            // 選擇題
            renderChoiceOptions(question, index, questionCard);
        }
        
        sortableContainer.appendChild(questionCard);
    });
    
    // 初始化排序功能
    initSortable();
}

// 渲染是非題選項
function renderYesNoOptions(question, index, questionCard) {
    const correctAnswer = document.createElement('div');
    correctAnswer.className = 'correct-answer';
    
    const correctLabel = document.createElement('label');
    correctLabel.textContent = '正確答案：';
    correctAnswer.appendChild(correctLabel);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'radio-options';
    
    const yesOption = createRadioOption(
        `correct_${index}`, 
        '是', 
        `correct_${index}_yes`, 
        question.correctAnswer === '是',
        () => { currentQuestionnaireData.questions[index].correctAnswer = '是'; }
    );
    
    const noOption = createRadioOption(
        `correct_${index}`, 
        '否', 
        `correct_${index}_no`, 
        question.correctAnswer === '否',
        () => { currentQuestionnaireData.questions[index].correctAnswer = '否'; }
    );
    
    optionsContainer.appendChild(yesOption);
    optionsContainer.appendChild(noOption);
    correctAnswer.appendChild(optionsContainer);
    
    questionCard.appendChild(correctAnswer);
}

// 渲染選擇題選項
function renderChoiceOptions(question, index, questionCard) {
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';
    
    const optionsLabel = document.createElement('div');
    optionsLabel.className = 'options-label';
    optionsLabel.textContent = '選項：';
    optionsContainer.appendChild(optionsLabel);
    
    // 確保選項陣列存在
    if (!question.options || !Array.isArray(question.options)) {
        question.options = ['選項 1', '選項 2', '選項 3'];
    }
    
    if (question.options.length === 0) {
        question.options.push('選項 1');
    }
    
    // 確保正確選項索引有效
    if (question.correctOptionIndex === undefined || 
        question.correctOptionIndex < 0 || 
        question.correctOptionIndex >= question.options.length) {
        question.correctOptionIndex = 0;
    }
    
    // 選項列表
    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';
    
    question.options.forEach((option, optIndex) => {
        const optionRow = document.createElement('div');
        optionRow.className = 'option-row';
        
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-container';
        
        const correctInput = document.createElement('input');
        correctInput.type = 'radio';
        correctInput.name = `option_correct_${index}`;
        correctInput.id = `option_correct_${index}_${optIndex}`;
        correctInput.className = 'option-radio';
        correctInput.checked = optIndex === question.correctOptionIndex;
        correctInput.onchange = function() {
            if (this.checked) {
                currentQuestionnaireData.questions[index].correctOptionIndex = optIndex;
            }
        };
        radioContainer.appendChild(correctInput);
        
        // 為正確答案加標籤
        const correctLabel = document.createElement('label');
        correctLabel.htmlFor = `option_correct_${index}_${optIndex}`;
        correctLabel.className = 'radio-label';
        correctLabel.title = '選擇為正確答案';
        radioContainer.appendChild(correctLabel);
        
        optionRow.appendChild(radioContainer);
        
        const optionInput = document.createElement('input');
        optionInput.type = 'text';
        optionInput.className = 'option-input';
        optionInput.value = option || `選項 ${optIndex + 1}`;
        optionInput.placeholder = `選項 ${optIndex + 1}`;
        optionInput.oninput = function() {
            currentQuestionnaireData.questions[index].options[optIndex] = this.value;
        };
        optionRow.appendChild(optionInput);
        
        // 只有超過兩個選項時才允許刪除
        if (question.options.length > 2) {
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-option';
            removeButton.innerHTML = '❌';
            removeButton.title = '移除此選項';
            removeButton.onclick = function(e) {
                e.preventDefault();
                
                // 確認是否要刪除
                if (!confirm(`確定要刪除選項 "${option}" 嗎？`)) {
                    return;
                }
                
                currentQuestionnaireData.questions[index].options.splice(optIndex, 1);
                
                // 如果刪除了正確選項，將第一個選項設為正確
                if (question.correctOptionIndex === optIndex) {
                    question.correctOptionIndex = 0;
                } else if (question.correctOptionIndex > optIndex) {
                    // 調整正確選項索引
                    question.correctOptionIndex--;
                }
                
                renderQuestions();
            };
            optionRow.appendChild(removeButton);
        } else {
            // 顯示提示為何不能刪除
            const infoSpan = document.createElement('div');
            infoSpan.className = 'option-info';
            infoSpan.textContent = '(至少需要2個選項)';
            optionRow.appendChild(infoSpan);
        }
        
        optionsList.appendChild(optionRow);
    });
    
    optionsContainer.appendChild(optionsList);
    
    // 新增選項按鈕
    const addOptionButton = document.createElement('button');
    addOptionButton.className = 'add-option';
    addOptionButton.innerHTML = '<span class="icon">➕</span> 新增選項';
    addOptionButton.onclick = function(e) {
        e.preventDefault();
        currentQuestionnaireData.questions[index].options.push(`選項 ${question.options.length + 1}`);
        renderQuestions();
    };
    optionsContainer.appendChild(addOptionButton);
    
    questionCard.appendChild(optionsContainer);
}

// 創建單選按鈕選項
function createRadioOption(name, text, id, checked, onChange) {
    const container = document.createElement('div');
    container.className = 'radio-option';
    
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.id = id;
    input.checked = checked;
    input.onchange = onChange;
    
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = text;
    
    container.appendChild(input);
    container.appendChild(label);
    
    return container;
}

// 初始化排序功能
function initSortable() {
    // 如果有 Sortable 庫，則使用它來實現拖放排序
    if (typeof Sortable !== 'undefined') {
        new Sortable(document.getElementById('sortable-questions'), {
            animation: 150,
            handle: '.question-header',
            ghostClass: 'question-card-ghost',
            onEnd: function(evt) {
                // 更新問題順序
                const newIndex = evt.newIndex;
                const oldIndex = evt.oldIndex;
                
                if (newIndex !== oldIndex) {
                    // 從陣列中移除項目並在新位置插入
                    const question = currentQuestionnaireData.questions.splice(oldIndex, 1)[0];
                    currentQuestionnaireData.questions.splice(newIndex, 0, question);
                    
                    // 重新渲染問題
                    renderQuestions();
                }
            }
        });
    }
}

// 渲染問卷預覽
function renderQuestionnairePreview() {
    const previewContainer = document.getElementById('questionnaire-preview');
    
    if (!previewContainer || !currentQuestionnaireData) return;
    
    previewContainer.innerHTML = '';
    
    if (!currentQuestionnaireData.questions || currentQuestionnaireData.questions.length === 0) {
        previewContainer.innerHTML = `
            <div class="preview-empty">
                <p>尚未設定任何問題，請先在「問題內容」標籤中新增問題。</p>
            </div>
        `;
        return;
    }
    
    // 創建預覽表單
    const previewForm = document.createElement('div');
    previewForm.className = 'preview-form';
    
    // 標題
    const previewTitle = document.createElement('h3');
    previewTitle.className = 'preview-title';
    previewTitle.textContent = '問卷預覽 (使用者將看到的畫面)';
    previewContainer.appendChild(previewTitle);
    
    // 逐一添加問題
    currentQuestionnaireData.questions.forEach((question, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'preview-question';
        
        // 問題標題
        const questionTitle = document.createElement('h4');
        questionTitle.className = 'preview-question-title';
        questionTitle.textContent = `${index + 1}. ${question.text}`;
        questionItem.appendChild(questionTitle);
        
        // 問題選項
        if (question.type === 'yesno') {
            // 是非題
            const options = document.createElement('div');
            options.className = 'preview-options';
            
            const yesOption = createPreviewRadioOption(`question_${index}`, '是', `preview_${index}_yes`);
            const noOption = createPreviewRadioOption(`question_${index}`, '否', `preview_${index}_no`);
            
            options.appendChild(yesOption);
            options.appendChild(noOption);
            questionItem.appendChild(options);
            
            // 添加正確答案提示
            const answerHint = document.createElement('div');
            answerHint.className = 'preview-answer-hint';
            answerHint.innerHTML = `<strong>正確答案:</strong> ${question.correctAnswer} (${question.score} 分)`;
            questionItem.appendChild(answerHint);
        } else if (question.type === 'choice') {
            // 選擇題
            const options = document.createElement('div');
            options.className = 'preview-options';
            
            question.options.forEach((option, optIndex) => {
                const optionItem = createPreviewRadioOption(
                    `question_${index}`, 
                    option, 
                    `preview_${index}_opt${optIndex}`
                );
                options.appendChild(optionItem);
            });
            
            questionItem.appendChild(options);
            
            // 添加正確答案提示
            const correctOption = question.options[question.correctOptionIndex];
            const answerHint = document.createElement('div');
            answerHint.className = 'preview-answer-hint';
            answerHint.innerHTML = `<strong>正確答案:</strong> ${correctOption} (${question.score} 分)`;
            questionItem.appendChild(answerHint);
        }
        
        previewForm.appendChild(questionItem);
    });
    
    // 添加提交按鈕
    const submitButton = document.createElement('button');
    submitButton.className = 'preview-submit';
    submitButton.textContent = '送出問卷';
    submitButton.disabled = true; // 預覽模式下按鈕不可點擊
    previewForm.appendChild(submitButton);
    
    previewContainer.appendChild(previewForm);
}

// 創建預覽用的單選按鈕
function createPreviewRadioOption(name, text, id) {
    const container = document.createElement('div');
    container.className = 'preview-radio-option';
    
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.id = id;
    input.disabled = true; // 預覽模式下不可點擊
    
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = text;
    
    container.appendChild(input);
    container.appendChild(label);
    
    return container;
}

// 新增是非題
function addYesNoQuestion() {
    if (!currentQuestionnaireData) {
        currentQuestionnaireData = { topicId: currentTopicId, questions: [] };
    }
    
    if (!currentQuestionnaireData.questions) {
        currentQuestionnaireData.questions = [];
    }
    
    const questionNumber = currentQuestionnaireData.questions.length + 1;
    
    currentQuestionnaireData.questions.push({
        type: 'yesno',
        text: `問題 ${questionNumber}`,
        correctAnswer: '是',
        score: 1
    });
    
    renderQuestions();
    
    // 滾動到最後一個問題
    setTimeout(() => {
        const container = document.getElementById('questions-container');
        container.scrollTop = container.scrollHeight;
        
        // 聚焦新問題的輸入框
        const lastIndex = currentQuestionnaireData.questions.length - 1;
        const inputElement = document.getElementById(`question_text_${lastIndex}`);
        if (inputElement) {
            inputElement.focus();
            inputElement.select(); // 選中全部文字方便直接編輯
        }
    }, 100);
}

// 新增選擇題
function addMultipleChoiceQuestion() {
    if (!currentQuestionnaireData) {
        currentQuestionnaireData = { topicId: currentTopicId, questions: [] };
    }
    
    if (!currentQuestionnaireData.questions) {
        currentQuestionnaireData.questions = [];
    }
    
    const questionNumber = currentQuestionnaireData.questions.length + 1;
    
    currentQuestionnaireData.questions.push({
        type: 'choice',
        text: `問題 ${questionNumber}`,
        options: ['選項 1', '選項 2', '選項 3'],
        correctOptionIndex: 0,
        score: 1
    });
    
    renderQuestions();
    
    // 滾動到最後一個問題
    setTimeout(() => {
        const container = document.getElementById('questions-container');
        container.scrollTop = container.scrollHeight;
        
        // 聚焦新問題的輸入框
        const lastIndex = currentQuestionnaireData.questions.length - 1;
        const inputElement = document.getElementById(`question_text_${lastIndex}`);
        if (inputElement) {
            inputElement.focus();
            inputElement.select(); // 選中全部文字方便直接編輯
        }
    }, 100);
}

// 儲存問卷
async function saveQuestionnaire() {
    if (!currentQuestionnaireData || !currentTopicId) {
        showNotification('無法儲存問卷，資料不完整', 'error');
        return;
    }
    
    try {
        // 檢查問題資料是否完整
        let isValid = true;
        let errorMessage = '';
        
        if (currentQuestionnaireData.questions) {
            currentQuestionnaireData.questions.forEach((question, index) => {
                if (!question.text || question.text.trim() === '') {
                    isValid = false;
                    errorMessage = `第 ${index + 1} 題問題內容不可為空`;
                    return;
                }
                
                if (question.type === 'choice') {
                    if (!question.options || question.options.length < 2) {
                        isValid = false;
                        errorMessage = `第 ${index + 1} 題至少需要 2 個選項`;
                        return;
                    }
                    
                    question.options.forEach((option, optIndex) => {
                        if (!option || option.trim() === '') {
                            isValid = false;
                            errorMessage = `第 ${index + 1} 題的第 ${optIndex + 1} 個選項不可為空`;
                            return;
                        }
                    });
                }
            });
        }
        
        if (!isValid) {
            showNotification(errorMessage, 'error');
            return;
        }
        
        // 顯示儲存中提示
        const saveBtn = document.getElementById('save-questionnaire');
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '<span class="spinner small"></span> 儲存中...';
        saveBtn.disabled = true;
        
        // 修正：確保 currentQuestionnaireData 有正確的 topicId
        currentQuestionnaireData.topicId = currentTopicId;
        
        // 更新問卷資料
        const success = await updateQuestionnaire(currentQuestionnaireData);
        
        // 恢復按鈕狀態
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
        if (success) {
            // 關閉模態框
            document.getElementById('questionnaire-modal').style.display = 'none';
            
            // 更新主題表格中的問卷題數
            getQuestionCount(currentTopicId);
            
            showNotification('問卷已成功更新', 'success');
        } else {
            showNotification('更新問卷時發生錯誤', 'error');
        }
    } catch (error) {
        console.error('Error saving questionnaire:', error);
        showNotification('儲存問卷時發生錯誤: ' + error.message, 'error');
        
        // 恢復按鈕狀態
        const saveBtn = document.getElementById('save-questionnaire');
        if (saveBtn) {
            saveBtn.textContent = '儲存問卷';
            saveBtn.disabled = false;
        }
    }
}

// 儲存所有設定
async function saveAllSettings() {
    try {
        // 顯示儲存中提示
        const saveBtn = document.getElementById('save-topics');
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '<span class="spinner small"></span> 儲存中...';
        saveBtn.disabled = true;
        
        const success = await updateTopics(topics);
        
        // 恢復按鈕狀態
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
        if (success) {
            showNotification('所有設定已儲存', 'success');
        } else {
            showNotification('儲存設定時發生錯誤', 'error');
        }
    } catch (error) {
        console.error('Error saving all settings:', error);
        showNotification('儲存所有設定時發生錯誤: ' + error.message, 'error');
        
        // 恢復按鈕狀態
        const saveBtn = document.getElementById('save-topics');
        if (saveBtn) {
            saveBtn.textContent = '儲存所有設定';
            saveBtn.disabled = false;
        }
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 儲存所有設定按鈕
    const saveTopicsBtn = document.getElementById('save-topics');
    if (saveTopicsBtn) {
        saveTopicsBtn.addEventListener('click', saveAllSettings);
    }
    
    // 新增是非題按鈕事件
    const addYesNoBtn = document.getElementById('add-yes-no');
    if (addYesNoBtn) {
        addYesNoBtn.addEventListener('click', addYesNoQuestion);
    }
    
    // 新增選擇題按鈕事件
    const addMultipleChoiceBtn = document.getElementById('add-multiple-choice');
    if (addMultipleChoiceBtn) {
        addMultipleChoiceBtn.addEventListener('click', addMultipleChoiceQuestion);
    }
    
    // 儲存問卷按鈕事件
    const saveQuestionnaireBtn = document.getElementById('save-questionnaire');
    if (saveQuestionnaireBtn) {
        saveQuestionnaireBtn.addEventListener('click', saveQuestionnaire);
    }
    
    // 數據管理功能
    const exportBtn = document.getElementById('export-data');
    if (exportBtn && typeof exportAllData === 'function') {
        exportBtn.addEventListener('click', function() {
            try {
                exportAllData();
            } catch (error) {
                console.error('Error exporting data:', error);
                showNotification('匯出資料時發生錯誤: ' + error.message, 'error');
            }
        });
    }
    
    const importBtn = document.getElementById('import-data');
    const importFile = document.getElementById('import-file');
    
    if (importBtn && importFile && typeof importAllData === 'function') {
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
        
        importFile.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const reader = new FileReader();
                
                reader.onload = async function(e) {
                    if (confirm('確定要匯入這個數據檔案嗎？這將覆蓋所有現有設定。')) {
                        try {
                            importBtn.innerHTML = '<span class="spinner small"></span> 匯入中...';
                            importBtn.disabled = true;
                            
                            const success = await importAllData(e.target.result);
                            
                            if (success) {
                                showNotification('數據匯入成功！頁面將重新載入', 'success');
                                
                                // 短暫延遲後重新載入頁面
                                setTimeout(() => {
                                    location.reload();
                                }, 1500);
                            } else {
                                showNotification('數據匯入失敗！', 'error');
                                importBtn.textContent = '匯入資料';
                                importBtn.disabled = false;
                            }
                        } catch (error) {
                            console.error('Error importing data:', error);
                            showNotification('匯入資料時發生錯誤: ' + error.message, 'error');
                            importBtn.textContent = '匯入資料';
                            importBtn.disabled = false;
                        }
                    }
                    
                    // 清除檔案選擇，以便可以再次選擇同一個檔案
                    importFile.value = '';
                };
                
                reader.onerror = function() {
                    showNotification('讀取檔案時發生錯誤', 'error');
                    importFile.value = '';
                };
                
                reader.readAsText(file);
            }
        });
    }
});
