import { appData } from './state.js';

const KEY = 'txAppData';

export function loadData() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) Object.assign(appData, JSON.parse(raw));
    } catch (e) {
        console.warn('loadData error', e);
    }
    if (!Array.isArray(appData.cards))        appData.cards = [];
    if (!Array.isArray(appData.transactions)) appData.transactions = [];
    if (!Array.isArray(appData.installments)) appData.installments = [];

    // migrate old single budget number to per-month budgets
    if (typeof appData.budget === 'number' && appData.budget > 0) {
        if (!appData.budgets) appData.budgets = {};
        const thisMonth = new Date().toLocaleDateString('sv').slice(0, 7);
        appData.budgets[thisMonth] = appData.budget;
        delete appData.budget;
    }
    if (!appData.budgets || typeof appData.budgets !== 'object') appData.budgets = {};

    // deduplicate installments by txId (keep last)
    const seen = new Map();
    appData.installments.forEach(i => { if (i.txId) seen.set(i.txId, i); });
    const noTxId = appData.installments.filter(i => !i.txId);
    appData.installments = [...noTxId, ...seen.values()];
}

export function saveData() {
    try {
        const payload = JSON.stringify(appData);
        if (payload.length > 4.5 * 1024 * 1024) { alert('儲存空間不足'); return; }
        localStorage.setItem(KEY, payload);
    } catch (e) {
        console.warn('saveData error', e);
    }
}
