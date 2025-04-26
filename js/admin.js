// 管理設定頁面功能

let topics = [];
let currentQuestionnaireData = null;
let currentTopicId = null;

// 當 GitHub API 認證完成時
function onAuthenticated() {
    initializeGitHubStorage().then(success => {
        if (success) {
            loadTopics();
        }
    });
}

// 載入衛教主題
async function loadTopics() {
    try {
        topics = await getAllTopics();
        renderTopicsTable();
    } catch (error) {
        console.error('Error loading topics:', error);
        showError('載入衛教主題時發生錯誤');
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
        urlCell.textContent = topic.youtubeUrl || '未設定';
        if (topic.youtubeUrl) {
            urlCell.title = topic.youtubeUrl;
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
            countCell.textContent = questionnaire.questions ? questionnaire.questions.length : 0;
        }
    } catch (error) {
        console.error(`Error getting question count for topic ${topicId}:`, error);
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
        // 更新本地資料
        const topicIndex = topics.findIndex(t => t.id === id);
        
        if (topicIndex !== -1) {
            topics[topicIndex].name = name;
            topics[topicIndex].youtubeUrl = url;
            
            // 更新 Drive 上的資料
            const success = await updateTopics(topics);
            
            if (success) {
                // 關閉模態框
                document.getElementById('topic-modal').style.display = 'none';
                
                // 重新渲染表格
                renderTopicsTable();
                
                alert('主題已更新');
            } else {
                alert('更新主題時發生錯誤');
            }
        }
    } catch (error) {
        console.error('Error saving topic:', error);
        showError('儲存主題時發生錯誤');
    }
}

// 顯示問卷編輯模態框
async function showQuestionnaireEditModal(topic) {
    try {
        const modal = document.getElementById('questionnaire-modal');
        const closeBtn = modal.querySelector('.close');
        const topicNameSpan = document.getElementById('current-topic-name');
        
        // 設置當前主題
        currentTopicId = topic.id;
        topicNameSpan.textContent = topic.name;
        
        // 載入問卷資料
        currentQuestionnaireData = await getQuestionnaire(topic.id);
        
        // 渲染問題
        renderQuestions();
        
        // 顯示模態框
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
    } catch (error) {
        console.error('Error showing questionnaire edit modal:', error);
        showError('載入問卷編輯時發生錯誤');
    }
}

// 渲染問題
function renderQuestions() {
    const container = document.getElementById('questions-container');
    
    if (!container || !currentQuestionnaireData) return;
    
    container.innerHTML = '';
    
    if (!currentQuestionnaireData.questions || currentQuestionnaireData.questions.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = '此主題尚未設定問卷題目。';
        emptyMsg.style.textAlign = 'center';
        container.appendChild(emptyMsg);
        return;
    }
    
    currentQuestionnaireData.questions.forEach((question, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.dataset.index = index;
        
        // 刪除按鈕
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-question';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.onclick = function() {
            currentQuestionnaireData.questions.splice(index, 1);
            renderQuestions();
        };
        questionCard.appendChild(deleteBtn);
        
        // 問題內容
        const questionContent = document.createElement('div');
        questionContent.className = 'question-content';
        
        const questionLabel = document.createElement('label');
        questionLabel.textContent = '問題：';
        questionContent.appendChild(questionLabel);
        
        const questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.value = question.text;
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
        scoreContainer.appendChild(scoreLabel);
        
        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.className = 'score-input';
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
            
            // 選項列表
            question.options.forEach((option, optIndex) => {
                const optionRow = document.createElement('div');
                optionRow.className = 'option-row';
                
                const correctInput = document.createElement('input');
                correctInput.type = 'radio';
                correctInput.name = `option_correct_${index}`;
                correctInput.checked = optIndex === question.correctOptionIndex;
                correctInput.onchange = function() {
                    if (this.checked) {
                        currentQuestionnaireData.questions[index].correctOptionIndex = optIndex;
                    }
                };
                optionRow.appendChild(correctInput);
                
                const optionInput = document.createElement('input');
                optionInput.type = 'text';
                optionInput.value = option;
                optionInput.oninput = function() {
                    currentQuestionnaireData.questions[index].options[optIndex] = this.value;
                };
                optionRow.appendChild(optionInput);
                
                const removeButton = document.createElement('button');
                removeButton.className = 'remove-option';
                removeButton.textContent = '移除';
                removeButton.onclick = function(e) {
                    e.preventDefault();
                    currentQuestionnaireData.questions[index].options.splice(optIndex, 1) // 如果刪除了正確選項，將第一個選項設為正確
                    if (question.correctOptionIndex === optIndex) {
                        question.correctOptionIndex = 0;
                    } else if (question.correctOptionIndex > optIndex) {
                        // 調整正確選項索引
                        question.correctOptionIndex--;
                    }
                    
                    renderQuestions();
                };
                optionRow.appendChild(removeButton);
                
                optionsContainer.appendChild(optionRow);
            });
            
            // 新增選項按鈕
            const addOptionButton = document.createElement('button');
            addOptionButton.className = 'add-option';
            addOptionButton.textContent = '新增選項';
            addOptionButton.onclick = function(e) {
                e.preventDefault();
                currentQuestionnaireData.questions[index].options.push('新選項');
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
    if (!currentQuestionnaireData) return;
    
    if (!currentQuestionnaireData.questions) {
        currentQuestionnaireData.questions = [];
    }
    
    currentQuestionnaireData.questions.push({
        type: 'yesno',
        text: '請輸入問題',
        correctAnswer: '是',
        score: 1
    });
    
    renderQuestions();
}

// 新增選擇題
function addMultipleChoiceQuestion() {
    if (!currentQuestionnaireData) return;
    
    if (!currentQuestionnaireData.questions) {
        currentQuestionnaireData.questions = [];
    }
    
    currentQuestionnaireData.questions.push({
        type: 'choice',
        text: '請輸入問題',
        options: ['選項 1', '選項 2', '選項 3'],
        correctOptionIndex: 0,
        score: 1
    });
    
    renderQuestions();
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
        
        // 更新問卷資料
        const success = await updateQuestionnaire(currentQuestionnaireData);
        
        if (success) {
            // 關閉模態框
            document.getElementById('questionnaire-modal').style.display = 'none';
            
            // 更新主題表格中的問卷題數
            getQuestionCount(currentTopicId);
            
            alert('問卷已更新');
        } else {
            alert('更新問卷時發生錯誤');
        }
    } catch (error) {
        console.error('Error saving questionnaire:', error);
        showError('儲存問卷時發生錯誤');
    }
}

// 儲存所有設定
async function saveAllSettings() {
    try {
        const success = await updateTopics(topics);
        
        if (success) {
            alert('所有設定已儲存');
        } else {
            alert('儲存設定時發生錯誤');
        }
    } catch (error) {
        console.error('Error saving all settings:', error);
        showError('儲存所有設定時發生錯誤');
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
    errorContainer.innerHTML = `<strong>錯誤:</strong> ${message}`;
    
    // 顯示到頁面上
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.prepend(errorContainer);
        
        // 自動移除錯誤訊息
        setTimeout(() => {
            errorContainer.remove();
        }, 5000);
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 儲存所有設定按鈕
    const saveTopicsBtn = document.getElementById('save-topics');
    if (saveTopicsBtn) {
        saveTopicsBtn.addEventListener('click', saveAllSettings);
    }
});