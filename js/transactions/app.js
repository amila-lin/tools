import { loadData } from './data.js';
import { appData } from './state.js';
import { switchPage, closeModal } from './ui.js';
import { renderDashboard, prevMonth, nextMonth, saveBudget, getViewMonth } from './dashboard.js';
import { renderLog, addTransaction, setTransactionType, updatePaymentUI, toggleInstallmentSection, prevLogMonth, nextLogMonth, cancelEdit } from './log.js';
import { renderManagement, switchTab, addCard, cancelCardEdit } from './management.js';
import { exportJSON, exportCSV, handleImportFile } from './dataManagement.js';

const VALID_PAGES = ['dashboard', 'log', 'management'];

function goToPage(pageId) {
    if (!VALID_PAGES.includes(pageId)) pageId = 'dashboard';
    switchPage(pageId);
    if (pageId === 'dashboard')  renderDashboard();
    if (pageId === 'log')        renderLog();
    if (pageId === 'management') renderManagement();
}

function bindEvents() {
    // Nav
    const navItems = document.querySelectorAll('.nav-item');
    navItems[0].addEventListener('click', () => goToPage('dashboard'));
    navItems[1].addEventListener('click', () => goToPage('log'));
    navItems[2].addEventListener('click', () => goToPage('management'));

    // Modal
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });

    // No card warning
    document.getElementById('no-card-warning').addEventListener('click', () => { location.hash = 'management'; });

    // Help modal
    const closeHelp = () => document.getElementById('help-modal').classList.add('hidden');
    document.getElementById('help-btn').addEventListener('click', () => document.getElementById('help-modal').classList.remove('hidden'));
    document.getElementById('help-close').addEventListener('click', closeHelp);
    document.getElementById('help-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeHelp(); });

    // Category detail modal
    const closeCatDetail = () => document.getElementById('cat-detail-modal').classList.add('hidden');
    document.getElementById('cat-detail-close').addEventListener('click', closeCatDetail);
    document.getElementById('cat-detail-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeCatDetail();
    });

    // Dashboard
    document.getElementById('dash-prev').addEventListener('click', prevMonth);
    document.getElementById('dash-next').addEventListener('click', nextMonth);
    document.getElementById('show-budget-form').addEventListener('click', () => {
        const form = document.getElementById('budget-form');
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden') && !appData.budgets[getViewMonth()]) {
            const [y, m] = getViewMonth().split('-').map(Number);
            const prev = new Date(y, m - 2, 1).toLocaleDateString('sv').slice(0, 7);
            document.getElementById('budget-input').value = appData.budgets[prev] ?? '';
        }
    });
    document.getElementById('budget-save').addEventListener('click', saveBudget);

    // Log
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => setTransactionType(btn.dataset.type));
    });
    document.querySelectorAll('input[name="payment"]').forEach(r => {
        r.addEventListener('change', updatePaymentUI);
    });
    document.getElementById('log-installment-toggle').addEventListener('change', toggleInstallmentSection);
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.getElementById('log-category').value = chip.textContent;
        });
    });
    document.getElementById('log-amount').addEventListener('input', () => {
        const val = parseFloat(document.getElementById('log-amount').value);
        if (val > 0) document.getElementById('amount-error')?.classList.add('hidden');
    });
    document.getElementById('log-add-btn').addEventListener('click', addTransaction);
    document.getElementById('log-cancel-btn').addEventListener('click', cancelEdit);
    document.getElementById('log-prev').addEventListener('click', prevLogMonth);
    document.getElementById('log-next').addEventListener('click', nextLogMonth);

    // Management
    document.getElementById('tab-cards').addEventListener('click', () => switchTab('cards'));
    document.getElementById('tab-installments').addEventListener('click', () => switchTab('installments'));
    document.getElementById('add-card-btn').addEventListener('click', addCard);
    document.getElementById('cancel-card-btn').addEventListener('click', cancelCardEdit);
    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
    document.getElementById('import-json-input').addEventListener('change', e => {
        handleImportFile(e.target.files[0]);
        e.target.value = '';
    });

    // Global update (e.g. after card added, refresh log card select)
    document.addEventListener('app:update', () => {
        const hash = location.hash.slice(1) || 'dashboard';
        if (hash === 'dashboard')  renderDashboard();
        if (hash === 'log')        renderLog();
        if (hash === 'management') renderManagement();
    });

    // Hash navigation
    window.addEventListener('hashchange', () => {
        goToPage(location.hash.slice(1));
    });

    // iOS viewport drift fix
    document.addEventListener('focusout', () => {
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) window.scrollTo(0, 0);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindEvents();
    document.getElementById('log-date').value = new Date().toLocaleDateString('sv');
    setTransactionType('expense');
    goToPage(location.hash.slice(1) || 'dashboard');
});
