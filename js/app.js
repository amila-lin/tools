import { loadData, exportJSON, importJSON, confirmClearAll } from './modules/data.js';
import { handleNewPlanClick, handleActivePlanEdit, confirmDeleteHistory, setupNewPlan } from './modules/plans.js';
import { addLog, editLog, deleteLog, resetForm, validateLogDate } from './modules/logs.js';
import { switchSecondaryChart, openHistoryChart, closeHistoryChart, downloadHistoryChart } from './modules/charts.js';
import { switchPage, updateUI } from './modules/ui.js';
import { closeModal } from './modules/modal.js';
import { appData } from './modules/state.js';

function goToPage(pageId) {
    switchPage(pageId);
    if (pageId === 'logs') resetForm();
}

function bindEvents() {
    // 底部導覽列
    const navItems = document.querySelectorAll('.nav-item');
    navItems[0].addEventListener('click', () => goToPage('dashboard'));
    navItems[1].addEventListener('click', () => goToPage('logs'));
    navItems[2].addEventListener('click', () => goToPage('goals'));

    // Modal
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

    // 儀表板：次要圖表 tab
    document.getElementById('tab-v').addEventListener('click', () => switchSecondaryChart('visceral'));
    document.getElementById('tab-m').addEventListener('click', () => switchSecondaryChart('muscle'));
    document.getElementById('tab-w').addEventListener('click', () => switchSecondaryChart('waist'));

    // 紀錄頁：表單
    document.getElementById('log-date').addEventListener('change', validateLogDate);
    document.getElementById('log-w').addEventListener('input', validateLogDate);
    document.getElementById('save-btn').addEventListener('click', addLog);
    document.getElementById('cancel-btn').addEventListener('click', resetForm);

    // 紀錄頁：無計畫時的跳轉按鈕
    document.getElementById('btn-goto-goals').addEventListener('click', () => goToPage('goals'));

    // 旅程頁
    document.getElementById('btn-new-plan').addEventListener('click', handleNewPlanClick);
    document.getElementById('active-plan-edit-btn').addEventListener('click', handleActivePlanEdit);

    // 資料管理
    document.getElementById('btn-export').addEventListener('click', exportJSON);
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import').click());
    document.getElementById('file-import').addEventListener('change', e => importJSON(e.target.files[0]));
    document.getElementById('btn-clear').addEventListener('click', confirmClearAll);

    // Event delegation：紀錄表格（修改按鈕動態產生）
    document.getElementById('log-table-body').addEventListener('click', e => {
        const editBtn   = e.target.closest('[data-action="edit-log"]');
        const deleteBtn = e.target.closest('[data-action="delete-log"]');
        if (editBtn)   editLog(editBtn.dataset.date);
        if (deleteBtn) deleteLog(deleteBtn.dataset.date);
    });

    // Event delegation：歷史足跡（展開、編輯、刪除、圖表按鈕動態產生）
    document.getElementById('history-list').addEventListener('click', e => {
        const chartBtn  = e.target.closest('[data-action="show-history-chart"]');
        const editBtn   = e.target.closest('[data-action="edit-history"]');
        const deleteBtn = e.target.closest('[data-action="delete-history"]');
        if (chartBtn)   openHistoryChart(appData.plans.find(p => p.id === Number(chartBtn.dataset.id)));
        if (editBtn)    setupNewPlan(appData.plans.find(p => p.id === Number(editBtn.dataset.id)));
        if (deleteBtn)  confirmDeleteHistory(Number(deleteBtn.dataset.id));
    });

    // 圖表 Modal 按鈕
    document.getElementById('chart-modal-close').addEventListener('click', closeHistoryChart);
    document.getElementById('chart-modal-download').addEventListener('click', downloadHistoryChart);

    // 全域 update 事件（由各模組 dispatch，統一觸發 UI 刷新）
    document.addEventListener('app:update', () => { updateUI(); validateLogDate(); });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindEvents();
    const hash = location.hash.replace('#', '');
    goToPage(hash || 'dashboard');
});

window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#', '');
    goToPage(hash || 'dashboard');
});
