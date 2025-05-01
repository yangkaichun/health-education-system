document.addEventListener('DOMContentLoaded', function() {
    // GitHub 令牌 - 用於保存設定到 GitHub (注意：在實際環境中，不應該在前端暴露令牌)

    
    // 初始化
    loadTopics();
    loadGroupSettings();
    
    // 表單提交事件
    document.getElementById('groupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveGroupSettings();
    });
    
    // 取消編輯按鈕
    document.getElementById('cancelEdit').addEventListener('click', function() {
        resetForm();
    });
    
    // 載入所有題組
    async function loadTopics() {
        try {
            // 從 localStorage 或 API 獲取所有題組資料
            // 這裡假設我們從本地儲存中獲取
            const topics = await getTopicsFromStorage();
            
            const topicSelectionContainer = document.getElementById('topicSelection');
            topicSelectionContainer.innerHTML = '';
            
            topics.forEach(topic => {
                const checkbox = document.createElement('div');
                checkbox.className = 'form-check';
                checkbox.innerHTML = `
                    <input class="form-check-input topic-checkbox" type="checkbox" value="${topic.id}" id="topic_${topic.id}">
                    <label class="form-check-label" for="topic_${topic.id}">
                        ${topic.title}
                    </label>
                `;
                topicSelectionContainer.appendChild(checkbox);
            });
        } catch (error) {
            console.error('載入題組失敗:', error);
            alert('載入題組失敗，請重新整理頁面再試。');
        }
    }
    
    // 從儲存中取得題組
    async function getTopicsFromStorage() {
        // 這裡應該與原系統獲取題組的方式保持一致
        // 為了示範，我假設題組存儲在 localStorage 中
        const topicsJSON = localStorage.getItem('topics');
        if (topicsJSON) {
            return JSON.parse(topicsJSON);
        } else {
            // 如果沒有現有數據，可以返回一些示例數據或從 API 獲取
            const topics = await fetchTopicsFromAPI();
            return topics;
        }
    }
    
    // 從 API 獲取題組 (這應該與原系統保持一致)
    async function fetchTopicsFromAPI() {
        // 示例：從 GitHub 或其他 API 獲取題組數據
        // 實際實現應根據原系統獲取題組的方式來實現
        return []; // 返回空陣列作為預設值
    }
    
    // 載入群組設定
    async function loadGroupSettings() {
        try {
            const groups = await getGroupSettingsFromStorage();
            
            const groupListContainer = document.getElementById('groupList');
            groupListContainer.innerHTML = '';
            
            if (groups.length === 0) {
                groupListContainer.innerHTML = '<div class="text-muted">尚未有任何設定</div>';
                return;
            }
            
            groups.forEach(group => {
                const groupItem = document.createElement('div');
                groupItem.className = 'list-group-item';
                
                // 顯示病床號碼
                const bedNumbersText = group.bedNumbers.length > 0 
                    ? `適用病床: ${group.bedNumbers.join(', ')}` 
                    : '未設定病床';
                
                // 顯示題組
                const topicsText = group.topicIds.length > 0
                    ? `包含 ${group.topicIds.length} 個題組`
                    : '無題組';
                
                groupItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">${group.name}</h5>
                            <p class="mb-1">${bedNumbersText}</p>
                            <small class="text-muted">${topicsText}</small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-primary edit-group" data-id="${group.id}">編輯</button>
                            <button class="btn btn-sm btn-outline-danger delete-group" data-id="${group.id}">刪除</button>
                        </div>
                    </div>
                `;
                
                groupListContainer.appendChild(groupItem);
            });
            
            // 添加編輯和刪除事件
            document.querySelectorAll('.edit-group').forEach(button => {
                button.addEventListener('click', function() {
                    const groupId = this.getAttribute('data-id');
                    editGroup(groupId);
                });
            });
            
            document.querySelectorAll('.delete-group').forEach(button => {
                button.addEventListener('click', function() {
                    const groupId = this.getAttribute('data-id');
                    deleteGroup(groupId);
                });
            });
            
        } catch (error) {
            console.error('載入群組設定失敗:', error);
            alert('載入群組設定失敗，請重新整理頁面再試。');
        }
    }
    
    // 從儲存中獲取群組設定
    async function getGroupSettingsFromStorage() {
        const groupsJSON = localStorage.getItem('topicGroups');
        if (groupsJSON) {
            return JSON.parse(groupsJSON);
        } else {
            return [];
        }
    }
    
    // 保存群組設定
    async function saveGroupSettings() {
        try {
            const groupName = document.getElementById('groupName').value;
            const bedNumbersInput = document.getElementById('bedNumbers').value;
            const editingId = document.getElementById('editingId').value;
            
            // 獲取選擇的題組ID
            const selectedTopicIds = Array.from(document.querySelectorAll('.topic-checkbox:checked'))
                .map(checkbox => checkbox.value);
            
            // 處理病床號碼 (分割並清理空白)
            const bedNumbers = bedNumbersInput.split(',')
                .map(bed => bed.trim())
                .filter(bed => bed !== '');
            
            // 獲取現有設定
            let groups = await getGroupSettingsFromStorage();
            
            if (editingId) {
                // 更新現有群組
                const groupIndex = groups.findIndex(g => g.id === editingId);
                if (groupIndex !== -1) {
                    groups[groupIndex] = {
                        ...groups[groupIndex],
                        name: groupName,
                        bedNumbers: bedNumbers,
                        topicIds: selectedTopicIds
                    };
                }
            } else {
                // 新增群組
                const newGroup = {
                    id: Date.now().toString(), // 使用時間戳作為唯一 ID
                    name: groupName,
                    bedNumbers: bedNumbers,
                    topicIds: selectedTopicIds
                };
                
                groups.push(newGroup);
            }
            
            // 保存到本地存儲
            localStorage.setItem('topicGroups', JSON.stringify(groups));
            
            // 如果可能，同步到 GitHub
            await syncSettingsToGitHub(groups);
            
            // 重新載入並重置表單
            resetForm();
            loadGroupSettings();
            
            alert('設定已保存！');
            
        } catch (error) {
            console.error('保存設定失敗:', error);
            alert('保存設定失敗，請再試一次。');
        }
    }
    
    // 編輯群組
    async function editGroup(groupId) {
        try {
            const groups = await getGroupSettingsFromStorage();
            const group = groups.find(g => g.id === groupId);
            
            if (!group) {
                alert('找不到該群組');
                return;
            }
            
            // 填充表單
            document.getElementById('groupName').value = group.name;
            document.getElementById('bedNumbers').value = group.bedNumbers.join(', ');
            document.getElementById('editingId').value = group.id;
            
            // 勾選題組
            document.querySelectorAll('.topic-checkbox').forEach(checkbox => {
                checkbox.checked = group.topicIds.includes(checkbox.value);
            });
            
            // 顯示取消編輯按鈕
            document.getElementById('cancelEdit').classList.remove('d-none');
            
            // 滾動到表單位置
            document.getElementById('groupForm').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('編輯群組失敗:', error);
            alert('無法載入群組資料，請重試。');
        }
    }
    
    // 刪除群組
    async function deleteGroup(groupId) {
        if (!confirm('確定要刪除此群組嗎？此操作無法撤銷。')) {
            return;
        }
        
        try {
            let groups = await getGroupSettingsFromStorage();
            groups = groups.filter(g => g.id !== groupId);
            
            // 保存到本地存儲
            localStorage.setItem('topicGroups', JSON.stringify(groups));
            
            // 同步到 GitHub
            await syncSettingsToGitHub(groups);
            
            // 重新載入
            loadGroupSettings();
            
            alert('群組已刪除！');
            
        } catch (error) {
            console.error('刪除群組失敗:', error);
            alert('刪除群組失敗，請重試。');
        }
    }
    
    // 重置表單
    function resetForm() {
        document.getElementById('groupForm').reset();
        document.getElementById('editingId').value = '';
        document.getElementById('cancelEdit').classList.add('d-none');
        
        // 取消所有勾選
        document.querySelectorAll('.topic-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    // 將設定同步到 GitHub 儲存庫
    async function syncSettingsToGitHub(settings) {
        // 注意：這只是一個示例實現，實際上應該通過後端 API 執行這個操作
        // 在前端直接操作 GitHub API 可能會導致令牌暴露的安全風險
        try {
            // 由於安全考量，此功能在實際生產環境中應該通過後端實現
            console.log('設定資料已準備好同步到 GitHub');
            // 實際項目中應該使用安全的後端 API 來處理
        } catch (error) {
            console.error('同步到 GitHub 失敗:', error);
            // 這裡我們只記錄錯誤，但仍然保留在本地儲存中的成功保存
        }
    }
});
