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
    
    // 顯示掃描區域
    scannerDiv.style.display = 'block';
    
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
    });
    
    // 啟動相機
    Instascan.Camera.getCameras().then(function(cameras) {
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
            alert('未找到相機設備！');
            scannerDiv.style.display = 'none';
        }
    }).catch(function(error) {
        console.error('Error accessing cameras:', error);
        alert('無法存取相機：' + error);
        scannerDiv.style.display = 'none';
    });
}

// 停止掃描器
function stopScanner() {
    if (scanner) {
        scanner.stop();
    }
    
    document.getElementById('qrcode-scanner').style.display = 'none';
}

// 初始化掃描器
initQrScanner();
