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

    // 顯示通知
    const cameraType = isFrontCamera(availableCameras[currentCameraIndex]) ? '前置' : '後置';
    if (typeof showNotification === 'function') {
        showNotification('已切換到' + cameraType + '相機', 'info');
    }
}

// 判斷是否為前置相機
function isFrontCamera(camera) {
    if (!camera || !camera.name) return false;
    
    const cameraName = camera.name.toLowerCase();
    return cameraName.includes('front') || 
           cameraName.includes('user') || 
           cameraName.includes('facetime');
}

// 判斷是否為後置相機
function isBackCamera(camera) {
    if (!camera || !camera.name) return false;
    
    const cameraName = camera.name.toLowerCase();
    return cameraName.includes('back') || 
           cameraName.includes('rear') || 
           cameraName.includes('environment');
}

// 判斷是否為行動裝置
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// 判斷是否為 iOS 裝置
function isIOSDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
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
            mirror: false // 對行動裝置來說設為 false 較好
        });

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

        // 啟動相機
        Instascan.Camera.getCameras()
            .then(function(cameras) {
                if (cameras.length > 0) {
                    // 儲存所有可用相機
                    availableCameras = cameras;

                    // 判斷是否為行動裝置
                    const isMobile = isMobileDevice();
                    const isIOS = isIOSDevice();
                    console.log('是否為行動裝置:', isMobile);
                    console.log('是否為iOS裝置:', isIOS);
                    console.log('相機列表:', cameras.map(c => c.name));

                    let selectedCameraIndex = 0; // 預設使用第一個相機

                    if (isIOS) {
                        // iOS 特定處理邏輯
                        let backCameraIndex = -1;
                        
                        // 遍歷相機列表尋找後置相機
                        for (let i = 0; i < cameras.length; i++) {
                            // iOS 後置相機通常包含 "back" 或 "environment" 字眼
                            if (isBackCamera(cameras[i])) {
                                backCameraIndex = i;
                                break;
                            }
                        }
                        
                        // 如果找到後置相機則使用，否則使用第一個相機
                        if (backCameraIndex !== -1) {
                            selectedCameraIndex = backCameraIndex;
                            console.log('iOS裝置: 找到後置相機，使用索引:', selectedCameraIndex);
                        } else {
                            // 沒找到明確的後置相機，嘗試使用最後一個相機
                            // 因為在某些 iOS 裝置上，後置相機可能是列表中的最後一個
                            selectedCameraIndex = cameras.length - 1;
                            console.log('iOS裝置: 未找到明確標示的後置相機，使用最後一個相機 (索引:', selectedCameraIndex, ')');
                        }
                    } else if (isMobile) {
                        // 非 iOS 的移動裝置處理邏輯
                        let backCameraIndex = -1;
                        
                        // 嘗試尋找後置鏡頭
                        for (let i = 0; i < cameras.length; i++) {
                            if (isBackCamera(cameras[i])) {
                                backCameraIndex = i;
                                break;
                            }
                        }
                        
                        if (backCameraIndex !== -1) {
                            selectedCameraIndex = backCameraIndex;
                            console.log('行動裝置: 找到後置相機，使用索引:', selectedCameraIndex);
                        } else {
                            // 如果沒找到明確的後置相機，使用最後一個
                            selectedCameraIndex = cameras.length - 1;
                            console.log('行動裝置: 未找到後置相機，使用最後一個相機 (索引:', selectedCameraIndex, ')');
                        }
                    } else {
                        // 桌面裝置處理邏輯
                        console.log('桌面裝置: 使用預設相機 (索引: 0)');
                    }

                    // 設定當前相機索引
                    currentCameraIndex = selectedCameraIndex;

                    // 顯示相機選擇的資訊
                    console.log('選擇相機:', cameras[currentCameraIndex].name);
                    console.log('相機類型:', isFrontCamera(cameras[currentCameraIndex]) ? '前置' : '後置');

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
