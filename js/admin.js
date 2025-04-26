// 管理設定頁面功能

let topics = [];
let currentQuestionnaireData = null;
let currentTopicId = null;

// 當 GitHub API 認證完成時
function onAuthenticated() {
    initializeGitHubStorage().then(success => {
        if (success) {
            loadTopics();
        } else {
            showError('初始化儲存失敗，請檢查 GitHub 連接');
        }
    }).catch(error => {
        console.error('Authentication error:', error);
        showError('認證過程中發生錯誤: ' + error.message);
    });
}

// 載入衛教主題
async function loadTopics() {
    try {
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
        renderTopicsTable();
    } catch (error) {
        console.error('Error loading topics:', error);
        showError('載入衛教主題時發生錯誤: ' + error.message);
    }
}

// 渲染主題表格
function renderTopicsTable() {
    const tableBody = document.getElementById('topics-body');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    topics.forEach(topic => {
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
            urlCell.textContent = urlText;
            urlCell.title = topic.youtubeUrl;
            
            // 添加可點擊的 URL
            urlCell.style.cursor = 'pointer';
            urlCell.style.color = '#3498db';
            urlCell.addEventListener('click', () => {
                window.open(topic.youtubeUrl, '_blank');
            });
        } else {
            urlCell.textContent = '未設定';
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
        editButton.textContent = '編輯主題';
        editButton.addEventListener('click', () => showTopicEditModal(topic));
        actionCell.appendChild(editButton);
        
        // 編輯問卷按鈕
        const questionnaireButton = document.createElement('button');
        questionnaireButton.className = 'action-button questionnaire-button';
        questionnaireButton.textContent = '編輯問卷';
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
            countCell.textContent = questionsCount;
            
            // 添加視覺提示
            if (questionsCount === 0) {
                countCell.style.color = '#e74c3c';
                countCell.title = '此主題尚未設定問卷';
            } else {
                countCell.style.color = '#27ae60';
                countCell.title = `此主題有 ${questionsCount} 個問卷題目`;
            }
        }
    } catch (error) {
        console.error(`Error getting question count for topic ${topicId}:`, error);
        const countCell = document.querySelector(`#topics-body td[data-topic-id="${topicId}"]`);
        if (countCell) {
            countCell.textContent = '錯誤';
            countCell.style.color = '#e74c3c';
            countCell.title = '獲取問卷數據時發生錯誤';
        }
    }
}

// 顯示主題編輯模態框
function showTopicEditModal(topic) {
    const modal = document.getElementById('topic-modal');
    const closeBtn = modal.querySelector('.close');
    const form = document.getElementById('topic-form');
    const topicIdInput = document.getElementById('topic-id');
    const topicNameInput = document.getElementById('topic-name');
    const topicUrlInput = document.getElementById('topic-url');
    
    // 填充表單資料
    topicIdInput.value = topic.id;
    topicNameInput.value = topic.name || '';
    topicUrlInput.value = topic.youtubeUrl || '';
    
    // 顯示模態框
    modal.style.display = 'block';
    
    // 聚焦名稱輸入框
    setTimeout(() => topicNameInput.focus(), 100);
    
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
    
    // 表單提交事件
    form.onsubmit = function(e) {
        e.preventDefault();
        saveTopic(parseInt(topicIdInput.value), topicNameInput.value, topicUrlInput.value);
    };
}

// 儲存主題
async function saveTopic(id, name, url) {
    try {
        // 基本驗證
        if (!name || name.trim() === '') {
            alert('主題名稱不能為空');
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
                
                // 重新渲染表格
                renderTopicsTable();
                
                showSuccess('主題已成功更新');
            } else {
                alert('更新主題時發生錯誤');
            }
        } else {
            alert('找不到指定 ID 的主題');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error saving topic:', error);
        showError('儲存主題時發生錯誤: ' + error.message);
        
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

// 顯示問卷編輯模態框
async function showQuestionnaireEditModal(topic) {
    try {
        const modal = document.getElementById('questionnaire-modal');
        const closeBtn = modal.querySelector('.close');
        const topicNameSpan = document.getElementById('current-topic-name');
        
        // 顯示載入中效果
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'questionnaire-loading';
        loadingIndicator.textContent = '載入問卷資料...';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.style.padding = '2rem';
        
        const questionsContainer = document.getElementById('questions-container');
        questionsContainer.innerHTML = '';
        questionsContainer.appendChild(loadingIndicator);
        
        // 設置當前主題
        currentTopicId = topic.id;
        topicNameSpan.textContent = topic.name;
        
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
        
        // 新增是非題按鈕事件
        document.getElementById('add-yes-no').onclick = addYesNoQuestion;
        
        // 新增選擇題按鈕事件
        document.getElementById('add-multiple-choice').onclick = addMultipleChoiceQuestion;
        
        // 儲存問卷按鈕事件
        document.getElementById('save-questionnaire').onclick = saveQuestionnaire;
        
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
                <div class="error-message" style="text-align:center; padding:1rem; color:#e74c3c;">
                    載入問卷資料失敗：${dataError.message}<br>
                    <button id="retry-load-questionnaire" style="margin-top:1rem;">重試</button>
                </div>
            `;
            
            document.getElementById('retry-load-questionnaire').addEventListener('click', () => {
                showQuestionnaireEditModal(topic);
            });
        }
    } catch (error) {
        console.error('Error showing questionnaire edit modal:', error);
        showError('開啟問卷編輯視窗時發生錯誤: ' + error.message);
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
            <p>此主題尚未設定問卷題目。</p>
            <p>請使用下方的按鈕新增是非題或選擇題。</p>
        `;
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.padding = '2rem';
        emptyMsg.style.color = '#7f8c8d';
        container.appendChild(emptyMsg);
        return;
    }
    
    currentQuestionnaireData.questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.dataset.index = index;
        
        // 問題編號
        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        questionNumber.textContent = `問題 ${index + 1}`;
        questionNumber.style.fontWeight = 'bold';
        questionNumber.style.marginBottom = '0.5rem';
        questionNumber.style.color = '#3498db';
        questionCard.appendChild(questionNumber);
        
        // 刪除按鈕
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-question';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = '刪除此問題';
        deleteBtn.onclick = function() {
            if (confirm(`確定要刪除問題 ${index + 1} 嗎？`)) {
                currentQuestionnaireData.questions.splice(index, 1);
                renderQuestions();
            }
        };
        questionCard.appendChild(deleteBtn);
        
        // 問題內容
        const questionContent = document.createElement('div');
        questionContent.className = 'question-content';
        
        const questionLabel = document.createElement('label');
        questionLabel.textContent = '問題：';
        questionLabel.htmlFor = `question_text_${index}`;
        questionContent.appendChild(questionLabel);
        
        const questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.id = `question_text_${index}`;
        questionInput.value = question.text || '';
        questionInput.placeholder = '請輸入問題內容';
        questionInput.required = true;
        questionInput.oninput = function() {
            currentQuestionnaireData.questions[index].text = this.value;
        };
        questionContent.appendChild(questionInput);
        
        questionCard.appendChild(questionContent);
        
        // 題型標籤
        const typeLabel = document.createElement('div');
        typeLabel.className = 'question-type-label';
        typeLabel.textContent = question.type === 'yesno' ? '是非題' : '選擇題';
        typeLabel.style.display = 'inline-block';
        typeLabel.style.padding = '0.25rem 0.5rem';
        typeLabel.style.borderRadius = '4px';
        typeLabel.style.fontSize = '0.8rem';
        typeLabel.style.marginTop = '0.5rem';
        typeLabel.style.marginBottom = '0.5rem';
        
        if (question.type === 'yesno') {
            typeLabel.style.backgroundColor = '#f39c12';
            typeLabel.style.color = 'white';
        } else {
            typeLabel.style.backgroundColor = '#9b59b6';
            typeLabel.style.color = 'white';
        }
        
        questionCard.appendChild(typeLabel);
        
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
            const correctAnswer = document.createElement('div');
            correctAnswer.className = 'correct-answer';
            
            const correctLabel = document.createElement('label');
            correctLabel.textContent = '正確答案：';
            correctAnswer.appendChild(correctLabel);
            
            const yesInput = document.createElement('input');
            yesInput.type = 'radio';
            yesInput.name = `correct_${index}`;
            yesInput.value = '是';
            yesInput.id = `correct_${index}_yes`;
            yesInput.checked = question.correctAnswer === '是';
            yesInput.onchange = function() {
                if (this.checked) {
                    currentQuestionnaireData.questions[index].correctAnswer = '是';
                }
            };
            
            const yesLabel = document.createElement('label');
            yesLabel.htmlFor = `correct_${index}_yes`;
            yesLabel.textContent = '是';
            
            const noInput = document.createElement('input');
            noInput.type = 'radio';
            noInput.name = `correct_${index}`;
            noInput.value = '否';
            noInput.id = `correct_${index}_no`;
            noInput.checked = question.correctAnswer === '否';
            noInput.onchange = function() {
                if (this.checked) {
                    currentQuestionnaireData.questions[index].correctAnswer = '否';
                }
            };
            
            const noLabel = document.createElement('label');
            noLabel.htmlFor = `correct_${index}_no`;
            noLabel.textContent = '否';
            
            correctAnswer.appendChild(yesInput);
            correctAnswer.appendChild(yesLabel);
            correctAnswer.appendChild(noInput);
            correctAnswer.appendChild(noLabel);
            
            questionCard.appendChild(correctAnswer);
        } else if (question.type === 'choice') {
            // 選擇題
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';
            
            const optionsLabel = document.createElement('label');
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
            question.options.forEach((option, optIndex) => {
                const optionRow = document.createElement('div');
                optionRow.className = 'option-row';
                
                const correctInput = document.createElement('input');
                correctInput.type = 'radio';
                correctInput.name = `option_correct_${index}`;
                correctInput.id = `option_correct_${index}_${optIndex}`;
                correctInput.checked = optIndex === question.correctOptionIndex;
                correctInput.onchange = function() {
                    if (this.checked) {
                        currentQuestionnaireData.questions[index].correctOptionIndex = optIndex;
                    }
                };
                optionRow.appendChild(correctInput);
                
                // 為正確答案加標籤
                const correctLabel = document.createElement('label');
                correctLabel.htmlFor = `option_correct_${index}_${optIndex}`;
                correctLabel.textContent = '';
                correctLabel.title = '選擇為正確答案';
                optionRow.appendChild(correctLabel);
                
                const optionInput = document.createElement('input');
                optionInput.type = 'text';
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
                    removeButton.textContent = '移除';
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
                    const infoSpan = document.createElement('span');
                    infoSpan.textContent = '(至少需要2個選項)';
                    infoSpan.style.color = '#7f8c8d';
                    infoSpan.style.fontSize = '0.8rem';
                    infoSpan.style.marginLeft = '0.5rem';
                    optionRow.appendChild(infoSpan);
                }
                
                optionsContainer.appendChild(optionRow);
            });
            
            // 新增選項按鈕
            const addOptionButton = document.createElement('button');
            addOptionButton.className = 'add-option';
            addOptionButton.textContent = '新增選項';
            addOptionButton.onclick = function(e) {
                e.preventDefault();
                currentQuestionnaireData.questions[index].options.push(`選項 ${question.options.length + 1}`);
                renderQuestions();
            };
            optionsContainer.appendChild(addOptionButton);
            
            questionCard.appendChild(optionsContainer);
        }
        
        container.appendChild(questionCard);
    });
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
        document.getElementById(`question_text_${lastIndex}`).focus();
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
        document.getElementById(`question_text_${lastIndex}`).focus();
    }, 100);
}

// 儲存問卷
async function saveQuestionnaire() {
    if (!currentQuestionnaireData || !currentTopicId) {
        alert('無法儲存問卷，資料不完整');
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
            alert(errorMessage);
            return;
        }
        
        // 顯示儲存中提示
        const saveBtn = document.getElementById('save-questionnaire');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '儲存中...';
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
            
            showSuccess('問卷已成功更新');
        } else {
            alert('更新問卷時發生錯誤');
        }
    } catch (error) {
        console.error('Error saving questionnaire:', error);
        showError('儲存問卷時發生錯誤: ' + error.message);
        
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
        saveBtn.textContent = '儲存中...';
        saveBtn.disabled = true;
        
        const success = await updateTopics(topics);
        
        // 恢復按鈕狀態
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
        if (success) {
            showSuccess('所有設定已儲存');
        } else {
            alert('儲存設定時發生錯誤');
        }
    } catch (error) {
        console.error('Error saving all settings:', error);
        showError('儲存所有設定時發生錯誤: ' + error.message);
        
        // 恢復按鈕狀態
        const saveBtn = document.getElementById('save-topics');
        if (saveBtn) {
            saveBtn.textContent = '儲存所有設定';
            saveBtn.disabled = false;
        }
    }
}

// 顯示錯誤訊息
function showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.style.backgroundColor = '#ffebee';
    errorContainer.style.color = '#c62828';
    errorContainer.style.padding = '1rem';
    errorContainer.style.borderRadius = '4px';
    errorContainer.style.margin = '1rem 0';
    errorContainer.style.textAlign = 'center';
    errorContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    errorContainer.innerHTML = `<strong>錯誤:</strong> ${message}`;
    
    // 顯示到頁面上
    const mainElement = document.querySelector('main');
    if (mainElement) {
        // 檢查是否已有相同錯誤訊息
        const existingErrors = mainElement.querySelectorAll('.error-message');
        for (let i = 0; i < existingErrors.length; i++) {
            if (existingErrors[i].innerHTML === errorContainer.innerHTML) {
                return; // 避免重複顯示相同錯誤
            }
        }
        
        mainElement.prepend(errorContainer);
        
        // 自動移除錯誤訊息
        setTimeout(() => {
            errorContainer.style.opacity = '0';
            errorContainer.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                errorContainer.remove();
            }, 500);
        }, 5000);
    }
}

// 顯示成功訊息
function showSuccess(message) {
    const successContainer = document.createElement('div');
    successContainer.className = 'success-message';
    successContainer.style.backgroundColor = '#e8f5e9';
    successContainer.style.color = '#2e7d32';
    successContainer.style.padding = '1rem';
    successContainer.style.borderRadius = '4px';
    successContainer.style.margin = '1rem 0';
    successContainer.style.textAlign = 'center';
    successContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    successContainer.innerHTML = `<strong>成功:</strong> ${message}`;
    
    // 顯示到頁面上
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.prepend(successContainer);
        
        // 自動移除成功訊息
        setTimeout(() => {
            successContainer.style.opacity = '0';
            successContainer.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                successContainer.remove();
            }, 500);
        }, 3000);
    }
}

// 檢查 GitHub 連接狀態
async function checkGitHubConnection() {
    try {
        const connectionInfo = await window.checkGitHubConnection();
        
        if (connectionInfo.connected) {
            showSuccess(`已成功連接到 GitHub 儲存庫: ${connectionInfo.repoName}`);
        } else {
            showError(`無法連接到 GitHub 儲存庫: ${connectionInfo.error}`);
        }
    } catch (error) {
        console.error('Error checking GitHub connection:', error);
        showError('檢查 GitHub 連接時發生錯誤');
    }
}

// 清除緩存
function clearCache() {
    if (window.invalidateCache) {
        window.invalidateCache();
        showSuccess('已清除本地緩存，下次操作將重新從 GitHub 載入資料');
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 儲存所有設定按鈕
    const saveTopicsBtn = document.getElementById('save-topics');
    if (saveTopicsBtn) {
        saveTopicsBtn.addEventListener('click', saveAllSettings);
    }
    
    // 數據管理功能
    const exportBtn = document.getElementById('export-data');
    if (exportBtn && typeof exportAllData === 'function') {
        exportBtn.addEventListener('click', function() {
            try {
                exportAllData();
                showSuccess('正在準備下載資料備份檔案');
            } catch (error) {
                console.error('Error exporting data:', error);
                showError('匯出資料時發生錯誤: ' + error.message);
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
                            importBtn.textContent = '匯入中...';
                            importBtn.disabled = true;
                            
                            const success = await importAllData(e.target.result);
                            
                            if (success) {
                                showSuccess('數據匯入成功！頁面將重新載入');
                                
                                // 清除緩存
                                if (window.invalidateCache) {
                                    window.invalidateCache();
                                }
                                
                                // 短暫延遲後重新載入頁面
                                setTimeout(() => {
                                    location.reload();
                                }, 1500);
                            } else {
                                showError('數據匯入失敗！');
                                importBtn.textContent = '匯入資料';
                                importBtn.disabled = false;
                            }
                        } catch (error) {
                            console.error('Error importing data:', error);
                            showError('匯入資料時發生錯誤: ' + error.message);
                            importBtn.textContent = '匯入資料';
                            importBtn.disabled = false;
                        }
                    }
                    
                    // 清除檔案選擇，以便可以再次選擇同一個檔案
                    importFile.value = '';
                };
                
                reader.onerror = function() {
                    showError('讀取檔案時發生錯誤');
                    importFile.value = '';
                };
                
                reader.readAsText(file);
            }
        });
    }
    
    // 添加檢查連接和清除緩存按鈕（如果不存在）
    const dataManagementSection = document.getElementById('data-management');
    if (dataManagementSection) {
        // 檢查是否已有進階操作區域
        let advancedActions = document.querySelector('.advanced-actions');
        
        if (!advancedActions) {
            // 創建進階操作區域
            advancedActions = document.createElement('div');
            advancedActions.className = 'advanced-actions';
            advancedActions.style.marginTop = '1.5rem';
            advancedActions.style.paddingTop = '1rem';
            advancedActions.style.borderTop = '1px dashed #ddd';
            
            const advancedTitle = document.createElement('h3');
            advancedTitle.textContent = '進階操作';
            advancedTitle.style.marginBottom = '1rem';
            advancedTitle.style.fontSize = '1rem';
            advancedTitle.style.color = '#7f8c8d';
            
            advancedActions.appendChild(advancedTitle);
            
            // 創建按鈕容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '1rem';
            
            // 檢查連接按鈕
            if (typeof window.checkGitHubConnection === 'function') {
                const checkConnectionBtn = document.createElement('button');
                checkConnectionBtn.textContent = '檢查 GitHub 連接';
                checkConnectionBtn.style.backgroundColor = '#3498db';
                checkConnectionBtn.addEventListener('click', checkGitHubConnection);
                buttonContainer.appendChild(checkConnectionBtn);
            }
            
            // 清除緩存按鈕
            if (typeof window.invalidateCache === 'function') {
                const clearCacheBtn = document.createElement('button');
                clearCacheBtn.textContent = '清除本地緩存';
                clearCacheBtn.style.backgroundColor = '#7f8c8d';
                clearCacheBtn.addEventListener('click', clearCache);
                buttonContainer.appendChild(clearCacheBtn);
            }
            
            advancedActions.appendChild(buttonContainer);
            dataManagementSection.appendChild(advancedActions);
        }
    }
});