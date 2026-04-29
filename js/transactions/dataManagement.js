import { appData } from './state.js';
import { saveData } from './data.js';
import { openModal } from './ui.js';

export function exportJSON() {
    const json = JSON.stringify(appData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toLocaleDateString('sv').replace(/-/g, '');
    a.href = url;
    a.download = `記帳助理備份_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportCSV() {
    if (!appData.transactions.length) {
        showToast('尚無帳務紀錄可匯出', true);
        return;
    }
    const headers = ['日期', '類型', '金額', '分類', '消費地點', '付款方式', '備註'];
    const rows = appData.transactions.map(tx => [
        tx.date,
        tx.type === 'income' ? '收入' : '支出',
        tx.amount,
        tx.category || '',
        tx.location || '',
        tx.payment === 'card' ? '信用卡' : '現金',
        tx.note || ''
    ]);
    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const bom = '﻿'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toLocaleDateString('sv').replace(/-/g, '');
    a.href = url;
    a.download = `帳務紀錄_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        let parsed;
        try {
            parsed = JSON.parse(e.target.result);
        } catch {
            showToast('讀取失敗，請確認檔案格式正確', true);
            return;
        }
        if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.cards)) {
            showToast('檔案格式不符，請確認是否為本程式匯出的備份', true);
            return;
        }
        openModal(
            '確認匯入',
            `將匯入 ${parsed.transactions.length} 筆帳務紀錄，現有資料將被覆蓋，是否繼續？`,
            () => {
                Object.assign(appData, parsed);
                saveData();
                document.dispatchEvent(new CustomEvent('app:update'));
                showToast('匯入成功！');
            }
        );
    };
    reader.readAsText(file);
}

function showToast(msg, isError = false) {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl text-sm font-bold shadow-lg text-white ${isError ? 'bg-expense' : 'bg-income'}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
