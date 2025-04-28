// @charset "UTF-8";
// QR Code 掃描功能

let scanner = null;

// 初始化 QR Code 掃描器
function initQrScanner() {
    document.addEventListener('DOMContentLoaded', function() {
        const scanButton = document.getElementById('scan-button');
        const closeButton = document.getElementById('close-scanner');
        const scannerDiv = document.getElementById('qrcode-scanner');
        
        if (scanButton) {
            scanButton.addEventListener('click', startScanner);
        }
        
        if (closeButton) {
            closeButton.addEventListener('click', stopScanner);
        }
    });
}

// 啟動掃描器
function startScanner() {
    const scannerDiv = document.getElementById('qrcode-scanner');
    const preview = document.getElementById('preview');
    
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
                    // 在行動裝置上優先使用後置相機
                    let selectedCamera = cameras[0]; // 預設前置相機
                    
                    // 找尋後置相機
                    for (let camera of cameras) {
                        if (!camera.name.toLowerCase().includes('front')) {
                            selectedCamera = camera;
                            break;
                        }
                    }
                    
                    scanner.start(selectedCamera);
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
}

// 初始化掃描器
initQrScanner();
