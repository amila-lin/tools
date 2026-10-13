import { appData, genId } from './state.js';

const KEY = 'txAppData';

function isMissing(value) {
    return value === undefined || value === null || String(value).trim() === '' || String(value).trim() === 'undefined';
}

function migrateCard(card) {
    let changed = false;
    const legacyLastFour = card.lastFour || card.last4 || card.last4Digits || card.lastDigits || card.digits;

    if (isMissing(card.id)) {
        card.id = genId();
        changed = true;
    }
    if (isMissing(card.bank)) {
        card.bank = isMissing(card.issuer) ? '未知銀行' : card.issuer;
        changed = true;
    }
    if (isMissing(card.cardName)) {
        card.cardName = legacyLastFour ? `****${String(legacyLastFour).slice(-4)}` : '未命名卡片';
        changed = true;
    }

    const billingDay = Number(card.billingDay);
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) {
        card.billingDay = 1;
        changed = true;
    } else if (card.billingDay !== billingDay) {
        card.billingDay = billingDay;
        changed = true;
    }

    ['lastFour', 'last4', 'last4Digits', 'lastDigits', 'digits'].forEach(key => {
        if (key in card) {
            delete card[key];
            changed = true;
        }
    });

    return changed;
}

export function loadData() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) Object.assign(appData, JSON.parse(raw));
    } catch (e) {
        console.warn('loadData error', e);
    }

    let hasChanges = false;
    if (!Array.isArray(appData.cards)) { appData.cards = []; hasChanges = true; }
    if (!Array.isArray(appData.transactions)) { appData.transactions = []; hasChanges = true; }
    if (!Array.isArray(appData.installments)) { appData.installments = []; hasChanges = true; }

    // migrate old single budget number to per-month budgets
    const data = /** @type {Record<string, any>} */ (appData);
    const legacyBudget = data.budget;
    if (typeof legacyBudget === 'number' && legacyBudget > 0) {
        if (!appData.budgets) appData.budgets = {};
        const thisMonth = new Date().toLocaleDateString('sv').slice(0, 7);
        appData.budgets[thisMonth] = legacyBudget;
        delete data.budget;
        hasChanges = true;
    }
    if (!appData.budgets || typeof appData.budgets !== 'object') {
        appData.budgets = {};
        hasChanges = true;
    }

    appData.cards.forEach(card => {
        if (migrateCard(card)) hasChanges = true;
    });

    // deduplicate installments by txId (keep last)
    const seen = new Map();
    appData.installments.forEach(i => { if (i.txId) seen.set(i.txId, i); });
    const noTxId = appData.installments.filter(i => !i.txId);
    const deduped = [...noTxId, ...seen.values()];
    if (deduped.length !== appData.installments.length) hasChanges = true;
    appData.installments = deduped;

    if (hasChanges) saveData();
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
