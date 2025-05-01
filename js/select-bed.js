document.addEventListener('DOMContentLoaded', function() {
    // 初始化
    let html5QrCode = null; // QR 碼掃描器實例
    
    // 綁定表單提交事件
    document.getElementById('bedForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const bedNumber = document.getElementById('bedNumber').value.trim();
        if (bedNumber) {
            loadTopicsByBedNumber(bedNumber);
        }
    });
    
    // 綁定 QR 掃描按鈕
    document.getElementById('scanQRCode').addEventListener('click', function() {
        toggleQRScanner();
    });
    
    // 切換 QR 碼掃描器
    function toggleQRScanner() {
        const qrReaderDiv = document.getElementById('qrReader');
        
        if (qrReaderDiv.classList.contains('d-none')) {
            // 顯示 QR 掃描器
            qrReaderDiv.classList.remove('d-none');
            startQRScanner();
        } else {
            // 隱藏並停止 QR 掃描器
            qrReaderDiv.classList.add('d-none');
            stopQRScanner();
        }
    }
    
    // 啟動 QR 碼掃描器
    function startQRScanner() {
        const qrReaderDiv = document.getElementById('qrReader');
        
        // 確保容器是空的
        qrReaderDiv.innerHTML = '';
        
        // 創建 QR 掃描器
        html5QrCode = new Html5Qrcode('qrReader');
        
        // 定義掃描成功回調
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            // 停止掃描
            stopQRScanner();
            
            // 設定病床號碼輸入框的值
            document.getElementById('bedNumber').value = decodedText;
            
            // 立即載入相應題組
            loadTopicsByBedNumber(decodedText);
        };
        
        // 定義 HTML5 QR 配置
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        // 開始掃描
        html5QrCode.start(
            { facingMode: "environment" }, // 使用後置攝像頭
            config,
            qrCodeSuccessCallback,
            (errorMessage) => {
                // 錯誤處理，但無需顯示給用戶（很多非 QR 框架都會觸發錯誤）
                console.log(errorMessage);
            }
        ).catch((err) => {
            console.error(`無法啟動掃描器: ${err}`);
            alert('無法啟動相機，請確保您已授予相機權限，或直接輸入病床號碼。');
            qrReaderDiv.classList.add('d-none');
        });
    }
    
    // 停止 QR 碼掃描器
    function stopQRScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                console.log('QR 掃描已停止');
                document.getElementById('qrReader').classList.add('d-none');
            }).catch(err => {
                console.error('無法停止掃描:', err);
            });
        }
    }
    
    // 根據病床號碼載入題組
    async function loadTopicsByBedNumber(bedNumber) {
        try {
            // 從設定中尋找該病床對應的題組群組
            const topicGroups = await getGroupSettingsFromStorage();
            
            // 找出所有包含此病床號碼的群組
            const matchingGroups = topicGroups.filter(group => 
                group.bedNumbers.includes(bedNumber)
            );
            
            if (matchingGroups.length === 0) {
                alert(`找不到病床 ${bedNumber} 的相關題組設定。`);
                return;
            }
            
            // 收集所有匹配群組中的題組 ID
            const topicIds = new Set();
            matchingGroups.forEach(group => {
                group.topicIds.forEach(id => topicIds.add(id));
            });
            
            // 如果沒有題組，顯示提示
            if (topicIds.size === 0) {
                alert(`已找到病床 ${bedNumber}，但未設定相關題組。`);
                return;
            }
            
            // 獲取所有題組資料
            const allTopics = await getTopicsFromStorage();
            
            // 過濾出符合 ID 的題組
            const matchingTopics = allTopics.filter(topic => 
                topicIds.has(topic.id)
            );
            
            // 顯示題組內容
            displayTopics(bedNumber, matchingTopics);
            
        } catch (error) {
            console.error('載入題組失敗:', error);
            alert('載入題組失敗，請重新嘗試。');
        }
    }
    
    // 從儲存中獲取群組設定
    async function getGroupSettingsFromStorage() {
        const groupsJSON = localStorage.getItem('topicGroups');
        if (groupsJSON) {
            return JSON.parse(groupsJSON);
        } else {
            return [];
        }
    }
    
    // 從儲存中取得題組
    async function getTopicsFromStorage() {
        // 這裡應該與原系統獲取題組的方式保持一致
        const topicsJSON = localStorage.getItem('topics');
        if (topicsJSON) {
            return JSON.parse(topicsJSON);
        } else {
            // 如果沒有現有數據，可以返回一些示例數據或從 API 獲取
            return []; // 返回空陣列作為預設值
        }
    }
    
    // 顯示題組列表
    function displayTopics(bedNumber, topics) {
        const topicContentDiv = document.getElementById('topicContent');
        const bedTitleEl = document.getElementById('bedTitle');
        const topicListEl = document.getElementById('topicList');
        
        // 設定標題
        bedTitleEl.textContent = `病床 ${bedNumber} 的衛教主題`;
        
        // 清空並準備顯示題組列表
        topicListEl.innerHTML = '';
        
        // 添加題組卡片
        topics.forEach(topic => {
            const topicCard = document.createElement('div');
            topicCard.className = 'col-md-4 mb-3';
            topicCard.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${topic.title}</h5>
                        <p class="card-text">${topic.description || '無描述'}</p>
                        <a href="javascript:void(0)" class="btn btn-primary view-topic" data-id="${topic.id}">查看</a>
                    </div>
                </div>
            `;
            topicListEl.appendChild(topicCard);
        });
        
        // 顯示內容區域
        topicContentDiv.classList.remove('d-none');
        
        // 添加查看題組事件
        document.querySelectorAll('.view-topic').forEach(button => {
            button.addEventListener('click', function() {
                const topicId = this.getAttribute('data-id');
                viewTopic(topicId);
            });
        });
        
        // 滾動到內容區域
        topicContentDiv.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 查看題組內容
    function viewTopic(topicId) {
        // 這裡應該與原系統的題組查看功能保持一致
        // 例如重定向到相應頁面或顯示內容
        window.location.href = `index.html?topic=${topicId}`;
    }
});
