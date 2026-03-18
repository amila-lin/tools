import { appData } from './state.js';
import { openModal } from './modal.js';

export function loadData() {
    try {
        const saved = localStorage.getItem('fatLossAppData');
        if (saved) Object.assign(appData, JSON.parse(saved));
    } catch (e) {
        console.warn('無法讀取本地資料', e);
    }
}

export function saveData() {
    try {
        localStorage.setItem('fatLossAppData', JSON.stringify(appData));
    } catch (e) {
        console.warn('無法儲存資料（可能為私密瀏覽模式）', e);
    }
}

export function exportJSON() {
    const blob = new Blob([JSON.stringify(appData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `減脂備份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            Object.assign(appData, JSON.parse(ev.target.result));
            saveData();
            document.dispatchEvent(new CustomEvent('app:update'));
        } catch (e) {
            alert('匯入失敗');
        }
    };
    reader.readAsText(file);
}

export function confirmClearAll() {
    openModal('⚠️ 警告', '確定要清空所有數據嗎？此操作無法恢復。', () => {
        try {
            localStorage.clear();
        } catch (e) {
            console.warn('無法清除本地資料', e);
        }
        location.reload();
    });
}
