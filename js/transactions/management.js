import { appData, genId } from './state.js';
import { saveData } from './data.js';
import { openModal } from './ui.js';

let activeTab = 'cards';
let editingCardId = null;

export function renderManagement() {
    updateTabUI();
    if (activeTab === 'cards') renderCards();
    else renderInstallments();
}

function updateTabUI() {
    ['cards', 'installments'].forEach(tab => {
        const btn = document.getElementById('tab-' + tab);
        const on  = tab === activeTab;
        btn.classList.toggle('border-primary', on);
        btn.classList.toggle('text-primary', on);
        btn.classList.toggle('font-black', on);
        btn.classList.toggle('border-transparent', !on);
        btn.classList.toggle('text-slate-400', !on);
        btn.classList.toggle('font-bold', !on);
    });
    document.getElementById('cards-section').classList.toggle('hidden', activeTab !== 'cards');
    document.getElementById('installments-section').classList.toggle('hidden', activeTab !== 'installments');
}

export function switchTab(tab) {
    activeTab = tab;
    renderManagement();
}

function renderCards() {
    const el = document.getElementById('cards-list');
    if (!appData.cards.length) {
        el.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">尚未新增信用卡</p>';
        return;
    }
    el.innerHTML = appData.cards.map(c => `
        <div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <div>
                <div class="font-medium text-slate-700">${c.bank}</div>
                <div class="text-sm text-slate-400">**** ${c.lastFour} · 結帳日每月 ${c.billingDay} 號</div>
            </div>
            <div class="flex items-center gap-3">
                <button class="text-slate-300 hover:text-primary transition-colors edit-card" data-id="${c.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="text-slate-300 hover:text-expense transition-colors delete-card" data-id="${c.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
    el.querySelectorAll('.edit-card').forEach(btn => {
        btn.addEventListener('click', () => editCard(btn.dataset.id));
    });
    el.querySelectorAll('.delete-card').forEach(btn => {
        btn.addEventListener('click', () =>
            openModal('刪除信用卡', '確定要刪除這張信用卡嗎？', () => deleteCard(btn.dataset.id))
        );
    });
}

export function addCard() {
    const bank       = document.getElementById('card-bank').value.trim();
    const lastFour   = document.getElementById('card-last4').value.trim();
    const billingDay = parseInt(document.getElementById('card-billing').value);
    if (!bank || !lastFour || isNaN(billingDay)) return;

    if (editingCardId) {
        const card = appData.cards.find(c => c.id === editingCardId);
        if (card) Object.assign(card, { bank, lastFour, billingDay });
        saveData();
        resetCardForm();
        renderCards();
        document.dispatchEvent(new CustomEvent('app:update'));
        return;
    }

    appData.cards.push({ id: genId(), bank, lastFour, billingDay });
    saveData();
    resetCardForm();
    renderCards();
    document.dispatchEvent(new CustomEvent('app:update'));
}

function editCard(id) {
    const card = appData.cards.find(c => c.id === id);
    if (!card) return;
    editingCardId = id;
    document.getElementById('card-bank').value    = card.bank;
    document.getElementById('card-last4').value   = card.lastFour;
    document.getElementById('card-billing').value = card.billingDay;
    document.getElementById('card-form-title').textContent = '編輯信用卡';
    const btn = document.getElementById('add-card-btn');
    btn.textContent = '更新';
    btn.classList.replace('bg-primary', 'bg-amber-500');
    document.getElementById('cancel-card-btn').classList.remove('hidden');
    const formCard = document.getElementById('card-form-card');
    formCard.classList.replace('bg-white', 'bg-primary/5');
    formCard.classList.replace('border-black/5', 'border-primary/30');
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetCardForm() {
    editingCardId = null;
    document.getElementById('card-bank').value    = '';
    document.getElementById('card-last4').value   = '';
    document.getElementById('card-billing').value = '';
    document.getElementById('card-form-title').textContent = '新增信用卡';
    const btn = document.getElementById('add-card-btn');
    btn.textContent = '新增信用卡';
    btn.classList.replace('bg-amber-500', 'bg-primary');
    document.getElementById('cancel-card-btn').classList.add('hidden');
    const formCard = document.getElementById('card-form-card');
    formCard.classList.replace('bg-primary/5', 'bg-white');
    formCard.classList.replace('border-primary/30', 'border-black/5');
}

export function cancelCardEdit() {
    resetCardForm();
}

function deleteCard(id) {
    appData.cards = appData.cards.filter(c => c.id !== id);
    saveData();
    renderCards();
    document.dispatchEvent(new CustomEvent('app:update'));
}

function calcAutoPaid(inst, card) {
    if (!card) return inst.paidMonths;
    const start = new Date(inst.startDate);
    const today = new Date();
    const billingDay = card.billingDay;
    // First billing date on or after startDate
    let billing = new Date(start.getFullYear(), start.getMonth(), billingDay);
    if (billing < start) billing = new Date(start.getFullYear(), start.getMonth() + 1, billingDay);
    let count = 0;
    while (billing <= today && count < inst.months) {
        count++;
        billing = new Date(billing.getFullYear(), billing.getMonth() + 1, billingDay);
    }
    return count;
}


function buildBillingRows(inst, card) {
    const billingDay = card?.billingDay;
    const start = new Date(inst.startDate);
    let first = billingDay ? new Date(start.getFullYear(), start.getMonth(), billingDay) : null;
    if (first && first < start) first = new Date(start.getFullYear(), start.getMonth() + 1, billingDay);
    const today = new Date();

    return Array.from({ length: inst.months }, (_, i) => {
        const billingDate = first ? new Date(first.getFullYear(), first.getMonth() + i, billingDay) : null;
        const isPaid = billingDate ? billingDate <= today : false;
        const dateStr = billingDate ? billingDate.toLocaleDateString('sv') : '—';
        return `<div class="flex items-center justify-between text-xs py-1">
            <span class="text-slate-400">第 ${i + 1} 期 · ${dateStr}</span>
            <span class="${isPaid ? 'text-income font-bold' : 'text-slate-300'}">${isPaid ? '已繳 ✓' : '待繳'}</span>
        </div>`;
    }).join('');
}

function renderInstallments() {
    const el = document.getElementById('installments-list');
    if (!appData.installments.length) {
        el.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">尚無分期計畫</p>';
        return;
    }

    // deduplicate: same txId → keep last entry only
    const seen = new Map();
    appData.installments.forEach(inst => {
        if (inst.txId) seen.set(inst.txId, inst);
    });
    const noTxId = appData.installments.filter(i => !i.txId);
    const deduped = [...noTxId, ...seen.values()];

    el.innerHTML = deduped.map(inst => {
        const card = appData.cards.find(c => c.id === inst.cardId);
        const cardName = card ? `${card.bank} ****${card.lastFour}` : '未知卡片';
        const paid = calcAutoPaid(inst, card);
        const done = paid >= inst.months;
        const pct  = Math.round(paid / inst.months * 100);

        return `<div class="py-4 border-b border-slate-100 last:border-0">
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                    <div class="flex items-baseline gap-2">
                        <div class="font-medium text-slate-700 truncate">${inst.desc}</div>
                        <div class="text-xs text-slate-400 shrink-0">${inst.startDate}</div>
                    </div>
                    <div class="text-xs text-slate-400 mt-0.5">${cardName} · 共 ${inst.months} 期 · 每期 $${inst.monthlyAmount.toLocaleString()}</div>
                    <div class="text-xs text-slate-400">總額 $${inst.totalAmount.toLocaleString()} · 已繳 ${paid} 期${done ? ' ✓ 已還清' : ` · 剩 ${inst.months - paid} 期`}</div>
                    <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-1.5 ${done ? 'bg-income' : 'bg-primary'} rounded-full transition-all" style="width:${pct}%"></div>
                    </div>
                    <div class="mt-2 divide-y divide-slate-100">${buildBillingRows(inst, card)}</div>
                </div>
            </div>
        </div>`;
    }).join('');

}

