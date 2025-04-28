
// @charset "UTF-8";
// QR Code 掃描功能

let scanner = null;
let currentCameraIndex = 0;
let availableCameras = [];

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
    if (!scanner || availableCameras.length <= 1) return;
    
    // 切換到下一個相機
    currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
    
    // 停止當前相機
    scanner.stop();
    
    // 啟動新相機
    scanner.start(availableCameras[currentCameraIndex]);
    
    // 顯示當前使用的相機
    console.log('已切換到相機:', availableCameras[currentCameraIndex].name);
    
    // 顯示通知
    if (typeof showNotification === 'function') {
        showNotification('已切換相機', 'info');
    }
}

// 判斷設備類型
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
        return 'ios';
    } else if (/Android/i.test(ua)) {
        return 'android';
    } else {
        return 'other';
    }
}

// 啟動掃描器
function startScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    const preview = document.getElementById('preview');
    const switchButton = document.getElementById('switch-camera');
    
    if (!scannerDiv || !preview) {
        console.error('Scanner elements not found in DOM');
        return;
    }
    
    // 顯示掃描區域
    scannerDiv.style.display = 'block';
    
    try {
        // 檢查 Instascan 是否已載入
        if (typeof Instascan === 'undefined') {
            throw new Error('Instascan 函式庫未載入，請檢查網路連接');
        }
        
        // 創建掃描器實例，不設置鏡像以確保畫面正確
        scanner = new Instascan.Scanner({ 
            video: preview,
            mirror: false,
            captureImage: false,  // 關閉圖像捕獲以提高性能
            backgroundScan: false // 關閉背景掃描以省電
        });
        
        // 掃描到 QR Code 時的處理
        scanner.addListener('scan', function(content) {
            document.getElementById('qrcode-result').value = content;
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
        });
        
        // 獲取設備類型
        const deviceType = getDeviceType();
        console.log('設備類型:', deviceType);
        
        // 使用 MediaDevices API 獲取相機，更可靠
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    console.log('可用設備:', devices);
                    // 過濾出視頻輸入設備
                    const videoDevices = devices.filter(device => device.kind === 'videoinput');
                    console.log('視頻設備:', videoDevices);
                    
                    // 然後使用 Instascan 獲取相機
                    return Instascan.Camera.getCameras();
                })
                .then(function(cameras) {
                    console.log('Instascan 相機列表:', cameras.map(c => c.name));
                    
                    if (cameras.length > 0) {
                        // 儲存所有可用相機
                        availableCameras = cameras;
                        
                        // 根據設備類型選擇後置相機
                        let backCameraIndex = findBackCamera(cameras, deviceType);
                        console.log('選擇的後置相機索引:', backCameraIndex);
                        
                        // 設定當前相機索引
                        currentCameraIndex = backCameraIndex;
                        
                        console.log('啟動相機:', cameras[currentCameraIndex].name);
                        
                        // 啟動所選相機
                        scanner.start(cameras[currentCameraIndex])
                            .then(() => {
                                console.log('相機啟動成功');
                                
                                // 如果有多個相機，顯示切換按鈕
                                if (cameras.length > 1 && switchButton) {
                                    switchButton.style.display = 'block';
                                }
                            })
                            .catch(err => {
                                console.error('相機啟動失敗:', err);
                                // 如果後置相機啟動失敗，嘗試前置相機
                                if (currentCameraIndex !== 0 && cameras.length > 1) {
                                    console.log('嘗試啟動前置相機');
                                    currentCameraIndex = 0;
                                    return scanner.start(cameras[0]);
                                }
                                throw err;
                            });
                    } else {
                        if (typeof showNotification === 'function') {
                            showNotification('未找到相機設備！', 'error');
                        } else {
                            alert('未找到相機設備！');
                        }
                        scannerDiv.style.display = 'none';
                    }
                })
                .catch(function(error) {
                    console.error('Error accessing cameras:', error);
                    
                    if (typeof showNotification === 'function') {
                        showNotification('無法存取相機：' + error.message, 'error');
                    } else {
                        alert('無法存取相機：' + error.message);
                    }
                    
                    scannerDiv.style.display = 'none';
                });
        } else {
            // 舊方法，僅作為備用
            Instascan.Camera.getCameras()
                .then(function(cameras) {
                    if (cameras.length > 0) {
                        // 儲存所有可用相機
                        availableCameras = cameras;
                        
                        // 根據設備類型選擇後置相機
                        let backCameraIndex = findBackCamera(cameras, deviceType);
                        
                        // 設定當前相機索引
                        currentCameraIndex = backCameraIndex;
                        
                        // 啟動所選相機
                        scanner.start(cameras[currentCameraIndex]);
                        
                        // 如果有多個相機，顯示切換按鈕
                        if (cameras.length > 1 && switchButton) {
                            switchButton.style.display = 'block';
                        }
                    } else {
                        if (typeof showNotification === 'function') {
                            showNotification('未找到相機設備！', 'error');
                        } else {
                            alert('未找到相機設備！');
                        }
                        scannerDiv.style.display = 'none';
                    }
                })
                .catch(function(error) {
                    console.error('Error accessing cameras:', error);
                    
                    if (typeof showNotification === 'function') {
                        showNotification('無法存取相機：' + error.message, 'error');
                    } else {
                        alert('無法存取相機：' + error.message);
                    }
                    
                    scannerDiv.style.display = 'none';
                });
        }
    } catch (error) {
        console.error('啟動掃描器時發生錯誤:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('啟動掃描器時發生錯誤: ' + error.message, 'error');
        } else {
            alert('啟動掃描器時發生錯誤: ' + error.message);
        }
        
        scannerDiv.style.display = 'none';
    }
}

// 根據設備類型找到後置相機
function findBackCamera(cameras, deviceType) {
    // 特殊情況處理
    if (cameras.length === 1) {
        return 0; // 只有一個相機，直接使用
    }
    
    console.log('嘗試尋找後置相機...');
    
    // 對於 iOS 設備
    if (deviceType === 'ios') {
        // iOS 設備通常第一個是前置相機，第二個是後置相機
        if (cameras.length >= 2) {
            return 1; // 使用第二個相機
        }
    }
    
    // 對於 Android 設備
    if (deviceType === 'android') {
        // 先嘗試找名稱含有 back 或 環境 等關鍵詞的相機
        for (let i = 0; i < cameras.length; i++) {
            const cameraName = cameras[i].name.toLowerCase();
            if (
                cameraName.includes('back') || 
                cameraName.includes('環境') || 
                cameraName.includes('後置') ||
                cameraName.includes('0')
            ) {
                return i;
            }
        }
        
        // 如果沒找到明確標記為後置的相機，使用最後一個
        return cameras.length - 1;
    }
    
    // 對於其他設備，嘗試所有可能的方式找後置相機
    
    // 1. 嘗試通過名稱識別
    for (let i = 0; i < cameras.length; i++) {
        const cameraName = cameras[i].name.toLowerCase();
        if (
            cameraName.includes('back') || 
            cameraName.includes('rear') || 
            cameraName.includes('環境') || 
            cameraName.includes('後置')
        ) {
            return i;
        }
    }
    
    // 2. 排除前置相機
    for (let i = 0; i < cameras.length; i++) {
        const cameraName = cameras[i].name.toLowerCase();
        if (
            !cameraName.includes('front') && 
            !cameraName.includes('前置') &&
            !cameraName.includes('facetime')
        ) {
            return i;
        }
    }
    
    // 3. 最後嘗試用索引位置
    // 很多裝置最後一個相機是後置相機
    if (cameras.length > 1) {
        return cameras.length - 1;
    }
    
    // 如果都找不到，預設使用第一個相機
    return 0;
}

// 停止掃描器
function stopScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    const switchButton = document.getElementById('switch-camera');
    
    if (scanner) {
        try {
            scanner.stop();
        } catch (error) {
            console.error('停止掃描器時發生錯誤:', error);
        }
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
