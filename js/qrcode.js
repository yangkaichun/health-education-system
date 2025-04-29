// @charset "UTF-8";
// QR Code 掃描功能 - 使用 HTML5-QRCode 庫

let html5QrScanner = null;
let currentCameraId = null;
let availableCameras = [];
let selectedCamera = { id: null, label: '' };
let isScanning = false;

// 初始化 QR Code 掃描器
function initQrScanner() {
    document.addEventListener('DOMContentLoaded', function() {
        const scanButton = document.getElementById('scan-button');
        const closeButton = document.getElementById('close-scanner');
        const scannerDiv = document.getElementById('qrcode-scanner');
        const qrcodeResult = document.getElementById('qrcode-result');
        const submitTopicBtn = document.getElementById('submit-topic');

        // 檢查掃描按鈕是否存在
        if (scanButton) {
            scanButton.addEventListener('click', function() {
                // 確保掃描器區域顯示
                if (scannerDiv) {
                    scannerDiv.style.display = 'block';
                }
                startScanner();
            });
        }

        // 檢查關閉按鈕是否存在
        if (closeButton) {
            closeButton.addEventListener('click', stopScanner);
        }
        
        // 監聽 qrcode-result 輸入欄位的變化，有值時啟用送出按鈕
        if (qrcodeResult && submitTopicBtn) {
            qrcodeResult.addEventListener('input', function() {
                submitTopicBtn.disabled = !qrcodeResult.value.trim();
            });
        }

        // 創建切換相機按鈕
        createSwitchCameraButton();
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

// 顯示系統訊息
function showSystemMessage(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    
    const systemMessages = document.getElementById('system-messages');
    if (!systemMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type + '-message';
    messageDiv.innerHTML = `
        ${message}
        <button onclick="this.parentNode.remove();" class="close-message">關閉</button>
    `;
    systemMessages.appendChild(messageDiv);
    
    // 自動消失
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// 獲取可用相機列表
async function getAvailableCameras() {
    try {
        if (!Html5Qrcode.isScanning) {
            availableCameras = await Html5Qrcode.getCameras();
            console.log('找到相機數量:', availableCameras.length);
            
            if (availableCameras.length > 0) {
                availableCameras.forEach((camera, index) => {
                    console.log(`相機 ${index}: ID=${camera.id}, 名稱=${camera.label}`);
                });
                return availableCameras;
            } else {
                showSystemMessage('未找到相機設備', 'error');
                return [];
            }
        }
    } catch (error) {
        console.error('獲取相機列表失敗:', error);
        showSystemMessage('獲取相機列表失敗: ' + error.message, 'error');
        return [];
    }
}

// 選擇後置相機
async function selectBackCamera() {
    const cameras = await getAvailableCameras();
    if (cameras.length === 0) return null;
    
    // 預設使用第一個相機
    let selectedCameraIndex = 0;
    
    if (cameras.length > 1) {
        // 嘗試識別後置相機
        for (let i = 0; i < cameras.length; i++) {
            const label = cameras[i].label.toLowerCase();
            // 檢查是否是後置相機
            if (label.includes('environmentback') || 
                label.includes('rear') || 
                label.includes('rear') || 
                (!label.includes('front') && !label.includes('facetime'))) {
                selectedCameraIndex = i;
                console.log('找到疑似後置相機:', cameras[i].label);
                break;
            }
        }
    }
    
    console.log('選擇相機:', cameras[selectedCameraIndex].label);
    return cameras[selectedCameraIndex];
}

// 切換相機
async function switchCamera() {
    if (isScanning) {
        // 停止當前掃描
        await stopScanner();
    }
    
    const cameras = await getAvailableCameras();
    if (cameras.length <= 1) {
        showSystemMessage('只有一個相機可用，無法切換', 'info');
        return;
    }
    
    // 找到當前相機的索引
    let currentIndex = cameras.findIndex(camera => camera.id === selectedCamera.id);
    if (currentIndex === -1) currentIndex = 0;
    
    // 切換到下一個相機
    const nextIndex = (currentIndex + 1) % cameras.length;
    selectedCamera = cameras[nextIndex];
    
    console.log('切換到相機:', selectedCamera.label);
    showSystemMessage('已切換到相機: ' + selectedCamera.label, 'info');
    
    // 重新啟動掃描器
    startScanner();
}

// 啟動掃描器
async function startScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    const preview = document.getElementById('preview');
    const switchButton = document.getElementById('switch-camera');
    const qrcodeReader = document.getElementById('qrcode-reader');
    
    if (!scannerDiv) {
        console.error('找不到掃描器區域元素');
        return;
    }
    
    // 確保掃描器區域顯示
    scannerDiv.style.display = 'block';
    
    try {
        // 檢查 Html5Qrcode 是否已載入
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Html5Qrcode 函式庫未載入，請檢查網路連接');
        }
        
        // 清理舊的視頻元素
        if (preview && preview.parentNode) {
            preview.style.display = 'none';
        }
        
        // 如果沒有 qrcode-reader 元素，創建一個
        if (!qrcodeReader) {
            const readerDiv = document.createElement('div');
            readerDiv.id = 'qrcode-reader';
            readerDiv.style.width = '100%';
            readerDiv.style.maxWidth = '500px';
            readerDiv.style.margin = '0 auto';
            scannerDiv.appendChild(readerDiv);
        } else {
            qrcodeReader.innerHTML = '';
            qrcodeReader.style.display = 'block';
        }
        
        // 如果還沒有選擇相機，選擇一個後置相機
        if (!selectedCamera.id) {
            selectedCamera = await selectBackCamera() || { id: null, label: '默認相機' };
        }
        
        // 掃描器配置
        const config = {
            fps: 10,
            qrbox: {
                width: 250,
                height: 250
            },
            aspectRatio: 1.0,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2
        };
        
        // 創建 HTML5 QR 掃描器實例
        html5QrScanner = new Html5Qrcode('qrcode-reader');
        
        isScanning = true;
        
        // 掃描成功回調函數
        const onScanSuccess = (decodedText, decodedResult) => {
            console.log('掃描成功!', decodedText);
            console.log('掃描結果:', decodedResult);
            
            // 將掃描結果寫入輸入欄位
            const resultInput = document.getElementById('qrcode-result');
            if (resultInput) {
                resultInput.value = decodedText;
                
                // 觸發 input 事件，以便啟用送出按鈕
                const inputEvent = new Event('input', { bubbles: true });
                resultInput.dispatchEvent(inputEvent);
                
                console.log('掃描結果已寫入到欄位:', decodedText);
            } else {
                console.error('找不到 id="qrcode-result" 的欄位');
            }
            
            // 停止掃描
            stopScanner();
            
            // 顯示成功訊息
            showSystemMessage('QR Code 掃描成功', 'success');
        };
        
        // 掃描錯誤回調函數
        const onScanFailure = (error) => {
            // 持續掃描錯誤不需要顯示訊息
            console.debug('掃描未成功:', error);
        };
        
        // 啟動相機並開始掃描
        if (selectedCamera.id) {
            console.log('使用指定相機ID啟動掃描器:', selectedCamera.id);
            html5QrScanner.start(
                { deviceId: selectedCamera.id },
                config,
                onScanSuccess,
                onScanFailure
            ).then(() => {
                console.log('掃描器啟動成功，使用相機:', selectedCamera.label);
                
                // 顯示切換相機按鈕（如果有多個相機）
                if (availableCameras.length > 1 && switchButton) {
                    switchButton.style.display = 'block';
                }
            }).catch((err) => {
                console.error('使用指定相機啟動掃描器失敗:', err);
                showSystemMessage('啟動掃描器失敗，嘗試使用系統默認相機', 'error');
                
                // 嘗試使用系統選擇的默認相機
                startWithDefaultCamera(config, onScanSuccess, onScanFailure);
            });
        } else {
            // 使用系統選擇的默認相機
            startWithDefaultCamera(config, onScanSuccess, onScanFailure);
        }
    } catch (error) {
        console.error('啟動掃描器過程中發生錯誤:', error);
        showSystemMessage('啟動掃描器時發生錯誤: ' + error.message, 'error');
        scannerDiv.style.display = 'none';
    }
}

// 使用默認相機啟動掃描器
function startWithDefaultCamera(config, onScanSuccess, onScanFailure) {
    if (!html5QrScanner) return;
    
    html5QrScanner.start(
        { facingMode: "environment" }, // 嘗試使用後置相機
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        console.log('掃描器使用默認後置相機啟動成功');
        
        // 嘗試更新所選相機信息
        html5QrScanner.getRunningTrackCapabilities()
            .then(capabilities => {
                console.log('當前相機能力:', capabilities);
            })
            .catch(err => console.error('獲取相機能力失敗:', err));
        
        // 顯示切換相機按鈕（如果有多個相機）
        const switchButton = document.getElementById('switch-camera');
        if (availableCameras.length > 1 && switchButton) {
            switchButton.style.display = 'block';
        }
    }).catch((err) => {
        console.error('使用默認相機啟動掃描器失敗:', err);
        
        // 最後嘗試 - 使用任何可用相機
        html5QrScanner.start(
            { facingMode: "user" }, // 嘗試使用前置相機
            config,
            onScanSuccess,
            onScanFailure
        ).then(() => {
            console.log('掃描器使用前置相機啟動成功');
        }).catch((err) => {
            console.error('啟動掃描器完全失敗:', err);
            showSystemMessage('無法啟動相機，請確認您已允許瀏覽器使用相機權限', 'error');
            
            const scannerDiv = document.getElementById('qrcode-scanner');
            if (scannerDiv) {
                scannerDiv.style.display = 'none';
            }
        });
    });
}

// 停止掃描器
async function stopScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    const switchButton = document.getElementById('switch-camera');
    const qrcodeReader = document.getElementById('qrcode-reader');
    
    if (html5QrScanner) {
        try {
            if (html5QrScanner.isScanning) {
                await html5QrScanner.stop();
                console.log('掃描器已停止');
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
    
    if (qrcodeReader) {
        qrcodeReader.style.display = 'none';
    }
    
    isScanning = false;
}

// 初始化掃描器
initQrScanner();
