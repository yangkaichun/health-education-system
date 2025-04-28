// @charset "UTF-8";
// QR Code 掃描功能

let scanner = null;
let currentCameraIndex = 0;
let availableCameras = [];
let iosConstraints = { facingMode: "environment" }; // iOS 後置相機約束預設值
let isScanning = false; // 防止重複掃描的標誌

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

// 判斷是否為 iOS 裝置
function isIOSDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
}

// 判斷是否為行動裝置
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// 切換相機 - iOS 特定版本
function switchCamera() {
    if (!scanner || isScanning) return; // 防止掃描中切換相機
    
    if (isIOSDevice()) {
        // iOS 裝置特定處理
        console.log('iOS 裝置: 當前相機模式:', iosConstraints.facingMode);
        
        // 切換 facingMode 來切換前後相機
        if (iosConstraints.facingMode === "environment") {
            iosConstraints.facingMode = "user"; // 切換至前置相機
            console.log('iOS 裝置: 切換到前置相機');
        } else {
            iosConstraints.facingMode = "environment"; // 切換至後置相機
            console.log('iOS 裝置: 切換到後置相機');
        }
        
        // 停止當前相機
        scanner.stop();
        
        // 重新啟動掃描器，用新的相機約束
        startScannerWithConstraints(iosConstraints);
        
        // 顯示通知
        const cameraType = (iosConstraints.facingMode === "user") ? '前置' : '後置';
        if (typeof showNotification === 'function') {
            showNotification('已切換到' + cameraType + '相機', 'info');
        }
    } else {
        // 非 iOS 裝置使用原有方法
        if (availableCameras.length <= 1) return;
        
        // 切換到下一個相機
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        
        // 停止當前相機
        scanner.stop();
        
        // 啟動新相機
        scanner.start(availableCameras[currentCameraIndex]);
        
        // 顯示通知
        const cameraName = availableCameras[currentCameraIndex].name.toLowerCase();
        const cameraType = (cameraName.includes('front') || cameraName.includes('user')) ? '前置' : '後置';
        if (typeof showNotification === 'function') {
            showNotification('已切換到' + cameraType + '相機', 'info');
        }
    }
}

// 使用指定相機約束啟動掃描器
function startScannerWithConstraints(constraints) {
    if (!scanner) {
        console.error('掃描器尚未初始化');
        return;
    }
    
    const preview = document.getElementById('preview');
    if (!preview) {
        console.error('找不到預覽元素');
        return;
    }
    
    isScanning = true; // 設置掃描中的標誌
    
    // 使用 getUserMedia 直接控制相機
    navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false
    }).then(function(stream) {
        // 將視訊流設定到預覽元素
        if ('srcObject' in preview) {
            preview.srcObject = stream;
        } else {
            // 舊版瀏覽器兼容
            preview.src = URL.createObjectURL(stream);
        }
        
        // 啟動掃描器
        scanner.mirror = constraints.facingMode === "user";
        scanner.stream = stream;
        scanner.active = true;
        
        console.log('掃描器已啟動，使用相機模式:', constraints.facingMode);
    }).catch(function(error) {
        console.error('無法存取相機:', error);
        isScanning = false; // 重置掃描中標誌
        if (typeof showNotification === 'function') {
            showNotification('無法存取相機：' + error.message, 'error');
        } else {
            alert('無法存取相機：' + error.message);
        }
    });
}

// 顯示掃描成功動畫
function showScanSuccessAnimation() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    if (!scannerDiv) return;
    
    // 創建一個覆蓋層來顯示動畫
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '2000';
    
    // 創建成功圖標
    const icon = document.createElement('div');
    icon.innerHTML = '✓';
    icon.style.color = '#4CAF50';
    icon.style.fontSize = '80px';
    icon.style.backgroundColor = 'white';
    icon.style.width = '120px';
    icon.style.height = '120px';
    icon.style.borderRadius = '60px';
    icon.style.display = 'flex';
    icon.style.justifyContent = 'center';
    icon.style.alignItems = 'center';
    icon.style.animation = 'fadeInOut 1s ease-in-out';
    
    // 添加動畫樣式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(icon);
    scannerDiv.appendChild(overlay);
    
    // 完成動畫後移除覆蓋層
    setTimeout(() => {
        scannerDiv.removeChild(overlay);
    }, 1000);
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

        // 創建掃描器實例
        scanner = new Instascan.Scanner({
            video: preview,
            mirror: false, // 對行動裝置來說設為 false 較好
            captureImage: false, // 提高效能
            backgroundScan: false // 提高效能
        });

        // 掃描到 QR Code 時的處理 - 使用防抖動邏輯避免多次觸發
        let scanDebounce = false;
        scanner.addListener('scan', function(content) {
            if (scanDebounce) return; // 防止重複掃描
            scanDebounce = true;
            
            console.log('掃描到 QR Code:', content);
            
            // 顯示掃描成功動畫
            showScanSuccessAnimation();
            
            // 保存掃描結果
            const resultInput = document.getElementById('qrcode-result');
            if (resultInput) {
                resultInput.value = content;
            }
            
            // 允許選擇主題
            const submitTopicBtn = document.getElementById('submit-topic');
            if (submitTopicBtn) {
                submitTopicBtn.disabled = false;
            }
            
            // 停止掃描器，先延遲一下讓使用者看到掃描成功動畫
            setTimeout(() => {
                stopScanner();







                
                // 顯示成功訊息
                if (typeof showNotification === 'function') {
                    showNotification('QR Code 掃描成功', 'success');
                } else {
                    alert('QR Code 掃描成功');
                }
 // 掃描到 QR Code 時的處理
        scanner.addListener('scan', function(content) {
            document.getElementById('qrcode-result').value = content;
            stopScanner();
            
            // 允許選擇主題
            document.getElementById('submit-topic').disabled = false;
            
            // 顯示成功訊息
            if (typeof showNotification === 'function') {
                showNotification('QR Code 掃描成功', 'success');
            } else {
                alert('QR Code 掃描成功');
            }
        });

     // 掃描到 QR Code 時的處理

                
                scanDebounce = false;
            }, 800); // 延遲關閉掃描器，讓使用者看到掃描成功的狀態
        });

        // 檢查裝置類型並進行對應處理
        if (isIOSDevice()) {
            console.log('偵測到 iOS 裝置，使用特殊相機處理邏輯');
            
            // iOS 裝置預設使用後置相機 (environment)
            iosConstraints = { facingMode: "environment" };
            
            // 使用自定義方法啟動掃描器
            startScannerWithConstraints(iosConstraints);
            
            // 顯示切換相機按鈕
            if (switchButton) {
                switchButton.style.display = 'block';
            }
            
            // 在 iOS 上不需要繼續執行下面的相機選擇邏輯
            return;
        }
        
        // 非 iOS 裝置的標準處理
        isScanning = true; // 設置掃描中的標誌
        Instascan.Camera.getCameras()
            .then(function(cameras) {
                if (cameras.length > 0) {
                    // 儲存所有可用相機
                    availableCameras = cameras;
                    console.log('找到相機數量:', cameras.length);
                    console.log('相機列表:', cameras.map(c => c.name));

                    let selectedCameraIndex = 0; // 預設使用第一個相機

                    if (isMobileDevice()) {
                        // 行動裝置優先使用後置相機
                        let backCameraIndex = -1;
                        
                        // 嘗試尋找後置鏡頭
                        for (let i = 0; i < cameras.length; i++) {
                            const cameraName = cameras[i].name.toLowerCase();
                            if (cameraName.includes('back') || 
                                cameraName.includes('rear') || 
                                cameraName.includes('environment')) {
                                backCameraIndex = i;
                                break;
                            }
                        }
                        
                        if (backCameraIndex !== -1) {
                            selectedCameraIndex = backCameraIndex;
                            console.log('找到後置相機，使用索引:', selectedCameraIndex);
                        } else if (cameras.length > 1) {
                            // 如果沒找到明確的後置相機，使用最後一個相機
                            selectedCameraIndex = cameras.length - 1;
                            console.log('未找到明確的後置相機，使用最後一個相機 (索引:', selectedCameraIndex, ')');
                        }
                    }

                    // 設定當前相機索引
                    currentCameraIndex = selectedCameraIndex;
                    console.log('使用相機:', cameras[currentCameraIndex].name);

                    // 啟動所選相機
                    scanner.start(cameras[currentCameraIndex]);

                    // 如果有多個相機，顯示切換按鈕
                    if (cameras.length > 1 && switchButton) {
                        switchButton.style.display = 'block';
                    }
                } else {
                    isScanning = false; // 重置掃描中標誌
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
                isScanning = false; // 重置掃描中標誌

                if (typeof showNotification === 'function') {
                    showNotification('無法存取相機：' + error.message, 'error');
                } else {
                    alert('無法存取相機：' + error.message);
                }

                scannerDiv.style.display = 'none';
            });
    } catch (error) {
        console.error('啟動掃描器時發生錯誤:', error);
        isScanning = false; // 重置掃描中標誌

        if (typeof showNotification === 'function') {
            showNotification('啟動掃描器時發生錯誤: ' + error.message, 'error');
        } else {
            alert('啟動掃描器時發生錯誤: ' + error.message);
        }

        scannerDiv.style.display = 'none';
    }
}

// 停止掃描器
function stopScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    const switchButton = document.getElementById('switch-camera');
    const preview = document.getElementById('preview');

    if (scanner) {
        try {
            scanner.stop();
            
            // 清理視訊流
            if (preview && preview.srcObject) {
                const tracks = preview.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                preview.srcObject = null;
            }
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
    
    isScanning = false; // 重置掃描中標誌
}

// 初始化掃描器
initQrScanner();
