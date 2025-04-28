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
                    // 在行動裝置上優先使用前置相機
//--                    let selectedCamera = cameras[0]; // 預設前置相機
                    let selectedCamera = null; // 先不預設任何相機
                    // 找尋後置相機
//--                    for (let camera of cameras) {
//--                        if (!camera.name.toLowerCase().includes('front')) {
//--                            selectedCamera = camera;
//--                            break;
//--                        }
//--                    }

for (let camera of cameras) {
                // 檢查相機名稱是否不包含 'front'，且可能包含 'back' 或 'environment'
                if (!camera.name.toLowerCase().includes('front') ||
                    camera.name.toLowerCase().includes('back') ||
                    camera.name.toLowerCase().includes('environment')) {
                    selectedCamera = camera; // 找到後置相機，優先選擇
                    break; // 找到後置相機後就跳出迴圈
                }
            }

            // 如果找到了後置相機，或者只有前置相機，則選擇第一個相機作為備用
            if (selectedCamera === null && cameras.length > 0) {
                selectedCamera = cameras[0]; // 如果沒有找到後置相機，則預設使用第一個相機
            }

            if (selectedCamera) {
                // 在這裡使用 selectedCamera 啟動您的掃描器
                // 假設您已經有一個 Instascan.Scanner 實例叫做 scanner
                // 例如: scanner.start(selectedCamera);
                console.log("Selected Camera:", selectedCamera.name); // 輸出選擇的相機名稱以便檢查
                // 請在這裡加入您的 scanner.start(selectedCamera); 程式碼
                // 例如:
                // let scanner = new Instascan.Scanner({ video: document.getElementById('preview') });
                // scanner.addListener('scan', function (content) {
                //     console.log(content);
                // });
                // scanner.start(selectedCamera);

            } else {
                console.error('No cameras found.');
                alert('找不到相機。');
            }
        } else {
            console.error('No cameras found.');
            alert('找不到相機。');
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
