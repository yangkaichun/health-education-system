// @charset "UTF-8";
// QR Code 掃描功能

let html5QrCode = null;
let currentCameraId = null;
let cameraList = [];

// 初始化 QR Code 掃描器
function initQrScanner() {
    document.addEventListener('DOMContentLoaded', function() {
        const scanButton = document.getElementById('scan-button');
        const closeButton = document.getElementById('close-scanner');
        const scannerDiv = document.getElementById('qrcode-scanner');
        
        // 創建切換相機按鈕
        createSwitchCameraButton();
        
        if (scanButton) {
            scanButton.addEventListener('click', startScanner);
        }
        
        if (closeButton) {
            closeButton.addEventListener('click', stopScanner);
        }
    });
}

// 創建切換相機按鈕
function createSwitchCameraButton() {
    // 檢查按鈕是否已存在
    if (document.getElementById('switch-camera')) {
        return;
    }
    
    const scannerDiv = document.getElementById('qrcode-scanner');
    if (!scannerDiv) return;
    
    // 創建切換相機按鈕
    const switchButton = document.createElement('button');
    switchButton.id = 'switch-camera';
    switchButton.textContent = '切換相機';
    switchButton.className = 'scanner-btn';
    switchButton.style.position = 'absolute';
    switchButton.style.bottom = '20px';
    switchButton.style.left = '50%';
    switchButton.style.transform = 'translateX(-50%)';
    switchButton.style.padding = '10px 15px';
    switchButton.style.backgroundColor = '#4CAF50';
    switchButton.style.color = 'white';
    switchButton.style.border = 'none';
    switchButton.style.borderRadius = '5px';
    switchButton.style.zIndex = '1000';
    switchButton.style.display = 'none'; // 初始隱藏
    
    // 添加點擊事件
    switchButton.addEventListener('click', switchCamera);
    
    // 添加到掃描區域
    scannerDiv.appendChild(switchButton);
}

// 切換相機
function switchCamera() {
    if (!html5QrCode || cameraList.length <= 1) return;
    
    // 停止當前掃描
    stopScanner();
    
    // 計算下一個相機索引
    const currentIndex = cameraList.findIndex(camera => camera.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % cameraList.length;
    
    // 啟動新相機
    setTimeout(() => {
        startScannerWithCamera(cameraList[nextIndex].id);
    }, 300);
}

// 啟動掃描器
function startScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    
    if (!scannerDiv) {
        console.error('Scanner element not found in DOM');
        return;
    }
    
    // 顯示掃描區域
    scannerDiv.style.display = 'block';
    
    try {
        // 檢查 HTML5-QRCode 庫是否已載入
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('HTML5-QRCode 函式庫未載入，請檢查網路連接');
        }
        
        // 建立 HTML5 QR 代碼掃描器實例
        html5QrCode = new Html5Qrcode("preview");
        
        // 獲取相機列表
        Html5Qrcode.getCameras()
            .then(devices => {
                cameraList = devices;
                console.log('相機列表:', devices);
                
                if (devices && devices.length > 0) {
                    // 顯示切換相機按鈕（如果有多個相機）
                    const switchButton = document.getElementById('switch-camera');
                    if (switchButton && devices.length > 1) {
                        switchButton.style.display = 'block';
                    }
                    
                    // 優先使用後置相機（environment）
                    startScannerWithFacingMode('environment');
                } else {
                    if (typeof showNotification === 'function') {
                        showNotification('未找到相機設備！', 'error');
                    } else {
                        alert('未找到相機設備！');
                    }
                    scannerDiv.style.display = 'none';
                }
            })
            .catch(err => {
                console.error('獲取相機列表失敗:', err);
                // 如果無法獲取相機列表，則嘗試直接使用後置相機
                startScannerWithFacingMode('environment');
            });
    } catch (error) {
        console.error('啟動掃描器時發生錯誤:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('啟動掃描器時發生錯誤: ' + error.message, 'error');
        } else {
            alert('啟動掃描器時發生錯誤: ' + error.message);
        }
        
        const scannerDiv = document.getElementById('qrcode-scanner');
        if (scannerDiv) {
            scannerDiv.style.display = 'none';
        }
    }
}

// 使用指定的 facingMode 啟動掃描器
function startScannerWithFacingMode(facingMode) {
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: false
    };
    
    // 定義掃描成功的回調函數
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // 設置掃描結果
        document.getElementById('qrcode-result').value = decodedText;
        
        // 停止掃描
        stopScanner();
        
        // 允許選擇主題
        if (document.getElementById('submit-topic')) {
            document.getElementById('submit-topic').disabled = false;
        }
        
        // 顯示成功訊息
        if (typeof showNotification === 'function') {
            showNotification('QR Code 掃描成功', 'success');
        } else {
            alert('QR Code 掃描成功');
        }
    };
    
    // 設置相機參數 - 指定使用後置相機
    const cameraConstraints = {
        facingMode: facingMode  // 'environment' 表示後置相機, 'user' 表示前置相機
    };
    
    // 啟動攝像頭掃描
    html5QrCode.start(
        cameraConstraints, 
        config, 
        qrCodeSuccessCallback,
        (errorMessage) => {
            // 處理錯誤（可選）
            console.log(`QR Code 掃描錯誤: ${errorMessage}`);
        }
    )
    .then(() => {
        console.log(`已啟動 QR 碼掃描器，使用 facingMode: ${facingMode}`);
    })
    .catch((err) => {
        console.error('啟動相機失敗:', err);
        
        // 如果後置相機啟動失敗且當前嘗試使用的是後置相機，則嘗試前置相機
        if (facingMode === 'environment') {
            console.log('嘗試使用前置相機');
            startScannerWithFacingMode('user');
        } else {
            if (typeof showNotification === 'function') {
                showNotification('無法存取相機：' + err, 'error');
            } else {
                alert('無法存取相機：' + err);
            }
            
            const scannerDiv = document.getElementById('qrcode-scanner');
            if (scannerDiv) {
                scannerDiv.style.display = 'none';
            }
        }
    });
}

// 使用指定的相機 ID 啟動掃描器
function startScannerWithCamera(cameraId) {
    currentCameraId = cameraId;
    
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }
    };
    
    // 定義掃描成功的回調函數
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // 設置掃描結果
        document.getElementById('qrcode-result').value = decodedText;
        
        // 停止掃描
        stopScanner();
        
        // 允許選擇主題
        if (document.getElementById('submit-topic')) {
            document.getElementById('submit-topic').disabled = false;
        }
        
        // 顯示成功訊息
        if (typeof showNotification === 'function') {
            showNotification('QR Code 掃描成功', 'success');
        } else {
            alert('QR Code 掃描成功');
        }
    };
    
    // 啟動攝像頭掃描
    html5QrCode.start(
        { deviceId: { exact: cameraId } }, 
        config, 
        qrCodeSuccessCallback,
        (errorMessage) => {
            // 處理錯誤（可選）
            console.log(`QR Code 掃描錯誤: ${errorMessage}`);
        }
    )
    .then(() => {
        console.log(`已啟動 QR 碼掃描器，使用相機 ID: ${cameraId}`);
    })
    .catch((err) => {
        console.error('啟動相機失敗:', err);
        
        if (typeof showNotification === 'function') {
            showNotification('無法存取相機：' + err, 'error');
        } else {
            alert('無法存取相機：' + err);
        }
        
        const scannerDiv = document.getElementById('qrcode-scanner');
        if (scannerDiv) {
            scannerDiv.style.display = 'none';
        }
    });
}

// 停止掃描器
function stopScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    const switchButton = document.getElementById('switch-camera');
    
    if (html5QrCode) {
        html5QrCode.stop()
            .then(() => {
                console.log('QR 掃描器已停止');
            })
            .catch((err) => {
                console.error('停止掃描器時發生錯誤:', err);
            });
    }
    
    if (scannerDiv) {
        scannerDiv.style.display = 'none';
    }
    
    if (switchButton) {
        switchButton.style.display = 'none';
    }
}

// 初始化掃描器
initQrScanner();
