// Firebase 初始化
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_DOMAIN.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_BUCKET.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 獲取資料庫和認證服務
const database = firebase.database();
const auth = firebase.auth();

// 儲存設定到 Firebase
function saveSettingsToFirebase(settings) {
    // 檢查用戶是否已登入
    const user = auth.currentUser;
    if (!user) {
        // 顯示登入界面
        showLoginUI();
        return;
    }
    
    // 儲存設定
    database.ref('settings/' + user.uid).set(settings)
        .then(() => {
            showSuccessMessage('設定已成功儲存到雲端');
        })
        .catch((error) => {
            alert('儲存到雲端失敗: ' + error.message);
        });
}

// 從 Firebase 載入設定
function loadSettingsFromFirebase() {
    // 檢查用戶是否已登入
    const user = auth.currentUser;
    if (!user) {
        return Promise.resolve(false);
    }
    
    return database.ref('settings/' + user.uid).once('value')
        .then(snapshot => {
            const settings = snapshot.val();
            if (settings) {
                localStorage.setItem('topicSettings', JSON.stringify(settings));
                loadTopicSettings();
                return true;
            }
            return false;
        })
        .catch(error => {
            console.error('從雲端載入設定失敗:', error);
            return false;
        });
}

// 顯示登入界面
function showLoginUI() {
    // 創建模態登入窗口
    const loginModal = document.createElement('div');
    loginModal.className = 'modal';
    loginModal.id = 'login-modal';
    loginModal.style.display = 'flex';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>登入雲端同步</h3>
            <span class="close-modal" onclick="closeLoginModal()">&times;</span>
        </div>
        <div class="modal-body">
            <p>請登入以將設定儲存到雲端，實現跨設備同步。</p>
            <div class="login-buttons">
                <button id="login-google" class="google-login-btn">
                    <i class="fab fa-google"></i> 使用 Google 登入
                </button>
            </div>
        </div>
    `;
    
    loginModal.appendChild(modalContent);
    document.body.appendChild(loginModal);
    
    // 添加登入事件
    document.getElementById('login-google').addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(() => {
                closeLoginModal();
                saveSettingsToFirebase(JSON.parse(localStorage.getItem('topicSettings') || '[]'));
            })
            .catch(error => {
                alert('登入失敗: ' + error.message);
            });
    });
}

// 關閉登入窗口
function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

// 修改儲存設定函數
function saveAllSettings() {
    const topicSettings = JSON.parse(localStorage.getItem('topicSettings') || '[]');
    // 更新設定的程式碼保持不變...
    
    // 儲存到本地
    localStorage.setItem('topicSettings', JSON.stringify(topicSettings));
    
    // 儲存到 Firebase
    saveSettingsToFirebase(topicSettings);
    
    // 顯示成功訊息
    document.getElementById('save-success-message').style.display = 'flex';
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', function() {
    // 設置 Firebase 認證狀態監聽
    auth.onAuthStateChanged(user => {
        if (user) {
            // 用戶已登入，嘗試從 Firebase 載入設定
            loadSettingsFromFirebase().then(loaded => {
                if (!loaded) {
                    // 如果沒有雲端設定，使用本地設定
                    initializeDefaultSettings();
                }
            });
        } else {
            // 用戶未登入，使用本地設定
            initializeDefaultSettings();
        }
    });
});

// 初始化默認設定
function initializeDefaultSettings() {
    if (!localStorage.getItem('topicSettings')) {
        const defaultSettings = [];
        for (let i = 1; i <= 30; i++) {
            defaultSettings.push({
                id: i,
                name: `衛教主題 ${i}`,
                youtubeUrl: ''
            });
        }
        localStorage.setItem('topicSettings', JSON.stringify(defaultSettings));
    }
    loadTopicSettings();
}
