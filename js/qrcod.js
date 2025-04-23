// QR Code 掃描功能
let scanner = null;

// 初始化頁面
document.addEventListener('DOMContentLoaded', function() {
    console.log('QR Code 掃描功能已初始化');
});

// 開始掃描
function startScanner() {
    document.getElementById('scanner-container').style.display = 'flex';
    
    if (scanner) {
        scanner.render(onScanSuccess);
        return;
    }
    
    scanner = new Html5QrcodeScanner("qr-reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true
    });
    
    scanner.render(onScanSuccess);
}

// 掃描成功處理
function onScanSuccess(decodedText) {
    document.getElementById('qr-code').value = decodedText;
    closeScanner();
    
    // 顯示成功訊息
    const successToast = document.createElement('div');
    successToast.className = 'toast success';
    successToast.innerHTML = '<i class="fas fa-check-circle"></i> QR Code 掃描成功！';
    document.body.appendChild(successToast);
    
    setTimeout(() => {
        successToast.remove();
    }, 3000);
}

// 關閉掃描器
function closeScanner() {
    if (scanner) {
        scanner.clear();
    }
    document.getElementById('scanner-container').style.display = 'none';
}

// 添加鍵盤事件監聽
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && document.getElementById('scanner-container').style.display === 'flex') {
        closeScanner();
    }
});
