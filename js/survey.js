// 問卷功能
const questions = {
    // 為每個主題定義問卷問題
    generateQuestions: function(topicId) {
        // 默認問題
        const defaultQuestions = [
            {
                id: 1,
                question: "您對這個衛教主題的理解程度如何？",
                options: [
                    { id: 'a', text: "非常理解" },
                    { id: 'b', text: "大致理解" },
                    { id: 'c', text: "有些不理解" },
                    { id: 'd', text: "完全不理解" }
                ]
            },
            {
                id: 2,
                question: "這個衛教影片的資訊是否對您有幫助？",
                options: [
                    { id: 'a', text: "非常有幫助" },
                    { id: 'b', text: "有些幫助" },
                    { id: 'c', text: "幫助不大" },
                    { id: 'd', text: "完全沒幫助" }
                ]
            },
            {
                id: 3,
                question: "您會將學到的知識應用到日常生活中嗎？",
                options: [
                    { id: 'a', text: "一定會" },
                    { id: 'b', text: "可能會" },
                    { id: 'c', text: "可能不會" },
                    { id: 'd', text: "一定不會" }
                ]
            }
        ];
        
        // 根據主題 ID 可以定制不同的問題
        // 這裡簡化處理，實際應用中可以根據需要擴展
        if (topicId >= 1 && topicId <= 10) {
            defaultQuestions.push({
                id: 4,
                question: `關於主題 ${topicId} 的專業衛教內容，您是否有更多疑問？`,
                options: [
                    { id: 'a', text: "沒有疑問" },
                    { id: 'b', text: "有些小疑問" },
                    { id: 'c', text: "有許多疑問" },
                    { id: 'd', text: "完全不理解，需要更多說明" }
                ]
            });
        } else if (topicId >= 11 && topicId <= 20) {
            defaultQuestions.push({
                id: 4,
                question: `您覺得主題 ${topicId} 的衛教內容難度如何？`,
                options: [
                    { id: 'a', text: "非常簡單" },
                    { id: 'b', text: "適中" },
                    { id: 'c', text: "有些難" },
                    { id: 'd', text: "非常困難" }
                ]
            });
        } else {
            defaultQuestions.push({
                id: 4,
                question: `您會向他人推薦主題 ${topicId} 的衛教影片嗎？`,
                options: [
                    { id: 'a', text: "一定會" },
                    { id: 'b', text: "可能會" },
                    { id: 'c', text: "可能不會" },
                    { id: 'd', text: "一定不會" }
                ]
            });
        }
        
        return defaultQuestions;
    }
};

// 生成問卷
function generateSurvey(topicId) {
    if (!topicId) return;
    
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = ''; // 清空容器
    
    const topicQuestions = questions.generateQuestions(topicId);
    
    topicQuestions.forEach(question => {
        const questionContainer = document.createElement('div');
        questionContainer.className = 'question-container';
        
        const questionTitle = document.createElement('div');
        questionTitle.className = 'question-title';
        questionTitle.textContent = `${question.id}. ${question.question}`;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';
        
        question.options.forEach(option => {
            const optionItem = document.createElement('div');
            optionItem.className = 'option-item';
            
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = `question_${question.id}`;
            radioInput.id = `q${question.id}_${option.id}`;
            radioInput.value = option.id;
            
            const label = document.createElement('label');
            label.htmlFor = `q${question.id}_${option.id}`;
            label.textContent = option.text;
            
            optionItem.appendChild(radioInput);
            optionItem.appendChild(label);
            optionsContainer.appendChild(optionItem);
        });
        
        questionContainer.appendChild(questionTitle);
        questionContainer.appendChild(optionsContainer);
        questionsContainer.appendChild(questionContainer);
    });
}

// 收集問卷答案
function collectSurveyAnswers() {
    const answers = {};
    const questionContainers = document.querySelectorAll('.question-container');
    
    questionContainers.forEach((container, index) => {
        const questionId = index + 1;
        const selectedOption = container.querySelector(`input[name="question_${questionId}"]:checked`);
        
        if (selectedOption) {
            answers[questionId] = selectedOption.value;
        } else {
            answers[questionId] = null;
        }
    });
    
    return answers;
}

// 計算問卷分數
function calculateScore(answers) {
    // 這裡簡化處理，根據回答計算分數
    // a=4分, b=3分, c=2分, d=1分
    let totalScore = 0;
    let answeredCount = 0;
    
    for (const questionId in answers) {
        const answer = answers[questionId];
        if (answer === null) continue;
        
        answeredCount++;
        
        switch (answer) {
            case 'a': totalScore += 5; break;
            case 'b': totalScore += 4; break;
            case 'c': totalScore += 2; break;
            case 'd': totalScore += 1; break;
        }
    }
    
    // 計算百分比分數 (滿分 5 * 題目數量)
    const maxPossibleScore = 5 * Object.keys(answers).length;
    const percentageScore = Math.round((totalScore / maxPossibleScore) * 100);
    
    return percentageScore;
}

// 提交問卷
function submitSurvey() {
    // 檢查是否選擇了主題
    if (!selectedTopic) {
        alert('請先選擇衛教主題！');
        return;
    }
    
    // 檢查是否已輸入 QR Code
    const qrCode = document.getElementById('qr-code').value;
    if (!qrCode) {
        alert('請先掃描 QR Code 或輸入代碼！');
        return;
    }
    
    // 收集問卷答案
    const answers = collectSurveyAnswers();
    
    // 檢查是否所有問題都已回答
    let allAnswered = true;
    for (const questionId in answers) {
        if (answers[questionId] === null) {
            allAnswered = false;
            break;
        }
    }
    
    if (!allAnswered) {
        alert('請回答所有問題！');
        return;
    }
    
    // 計算問卷分數
    const score = calculateScore(answers);
    
    // 儲存問卷結果
    const results = JSON.parse(localStorage.getItem('surveyResults') || '[]');
    const existingIndex = results.findIndex(item => item.qrCode === qrCode && item.topic === selectedTopic);
    
    if (existingIndex >= 0) {
        results[existingIndex].watchStatus = 'completed';
        results[existingIndex].score = score;
        results[existingIndex].answers = answers;
        results[existingIndex].nurseAcknowledged = false;
        results[existingIndex].completedTimestamp = new Date().toISOString();
    } else {
        results.push({
            qrCode: qrCode,
            topic: selectedTopic,
            watchStatus: 'completed',
            score: score,
            answers: answers,
            nurseAcknowledged: false,
            timestamp: new Date().toISOString(),
            completedTimestamp: new Date().toISOString()
        });
    }
    
    localStorage.setItem('surveyResults', JSON.stringify(results));
    
    // 模擬發送郵件通知
    sendEmailNotification(qrCode, selectedTopic, score);
    
    // 顯示成功訊息
    document.getElementById('success-message').style.display = 'flex';
}

// 發送郵件通知
function sendEmailNotification(qrCode, topicId, score) {
    // 獲取已啟用的護理師郵件地址
    const nurseEmails = JSON.parse(localStorage.getItem('nurseEmails') || '[]');
    const enabledEmails = nurseEmails.filter(email => email.enabled).map(email => email.address);
    
    // 實際應用中，這裡應該調用後端 API 來發送郵件
    console.log(`模擬發送郵件通知到以下地址：`, enabledEmails);
    console.log(`問卷提交：QR Code: ${qrCode}, 主題: ${topicId}, 分數: ${score}`);
}

// 關閉成功訊息
function closeSuccessMessage() {
    document.getElementById('success-message').style.display = 'none';
    
    // 重置表單
    document.getElementById('survey-form').reset();
    
    // 滾動到頁面頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 隱藏問卷和影片區域，準備下一次選擇
    document.getElementById('survey-section').style.display = 'none';
    document.getElementById('video-section').style.display = 'none';
}
