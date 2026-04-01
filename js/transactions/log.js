import { appData, genId } from './state.js';
import { saveData } from './data.js';
import { openModal } from './ui.js';

let logMonth = new Date().toLocaleDateString('sv').slice(0, 7);
let editingId = null;

export function renderLog() {
    refreshCardSelect();
    refreshDatalist('category-list', appData.transactions.map(t => t.category).filter(Boolean));
    refreshDatalist('location-list',  appData.transactions.map(t => t.location).filter(Boolean));
    refreshLocationChips();
    renderLogList();
    renderInstallmentDue();
}

function refreshLocationChips() {
    const el = document.getElementById('location-chips');
    if (!el) return;
    const freq = {};
    appData.transactions.forEach(t => { if (t.location) freq[t.location] = (freq[t.location] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([loc]) => loc);
    if (!top.length) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = top.map(loc =>
        `<button type="button" class="location-chip text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors">${loc}</button>`
    ).join('');
    el.querySelectorAll('.location-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.getElementById('log-location').value = chip.textContent;
        });
    });
}

function refreshDatalist(id, values) {
    const dl = document.getElementById(id);
    if (!dl) return;
    const unique = [...new Set(values)];
    dl.innerHTML = unique.map(v => `<option value="${v}">`).join('');
}

function refreshCardSelect() {
    const sel = document.getElementById('log-card-select');
    const warn = document.getElementById('no-card-warning');
    if (!sel) return;
    const instLabel = document.getElementById('log-installment-toggle-label');
    if (appData.cards.length) {
        sel.innerHTML = appData.cards.map(c => `<option value="${c.id}">${c.bank} ****${c.lastFour}</option>`).join('');
        sel.classList.remove('hidden');
        if (warn) warn.classList.add('hidden');
        if (instLabel) instLabel.classList.remove('hidden');
    } else {
        sel.innerHTML = '';
        sel.classList.add('hidden');
        if (warn) warn.classList.remove('hidden');
        if (instLabel) instLabel.classList.add('hidden');
        document.getElementById('log-installments-section').classList.add('hidden');
        document.getElementById('log-installment-toggle').checked = false;
    }
}

export function updatePaymentUI() {
    const method = document.querySelector('input[name="payment"]:checked')?.value || 'cash';
    document.getElementById('log-card-section').classList.toggle('hidden', method !== 'card');
    if (method === 'card') refreshCardSelect();
}

export function toggleInstallmentSection() {
    const checked = document.getElementById('log-installment-toggle').checked;
    document.getElementById('log-installments-section').classList.toggle('hidden', !checked);
}

function renderLogList() {
    document.getElementById('log-month').textContent = logMonth;
    const txs = appData.transactions
        .filter(t => t.date.startsWith(logMonth))
        .sort((a, b) => b.date.localeCompare(a.date));

    const el = document.getElementById('log-list');
    if (!txs.length) {
        el.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">本月無紀錄</p>';
        return;
    }

    el.innerHTML = txs.map(t => {
        const card = appData.cards.find(c => c.id === t.paymentMethod);
        const payLabel = card ? `${card.bank} ****${card.lastFour}` : '現金';
        const instText = t.installments > 1 ? ` · ${t.installments}期` : '';
        const sign = t.type === 'income' ? '+' : '-';
        const amtCls = t.type === 'income' ? 'text-income' : 'text-expense';
        const typeCls = t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        const typeLabel = t.type === 'income' ? '收入' : '支出';
        return `<div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-xs text-slate-400">${t.date}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full ${typeCls}">${typeLabel}</span>
                </div>
                <div class="text-sm font-medium text-slate-700 truncate">${t.category || '未分類'}${t.location ? ' · ' + t.location : ''}</div>
                <div class="flex items-center gap-1 text-xs text-slate-400">
                    ${t.paymentMethod !== 'cash' ? `<span>💳</span>` : ''}
                    <span>${payLabel}${instText}</span>
                </div>
                ${t.note ? `<div class="text-xs text-slate-400 mt-0.5 italic">${t.note}</div>` : ''}
            </div>
            <div class="flex items-center gap-3 ml-2 shrink-0">
                <span class="text-base font-bold ${amtCls}">${sign}$${t.amount.toLocaleString()}</span>
                <button class="text-slate-300 hover:text-primary transition-colors edit-tx" data-id="${t.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="text-slate-300 hover:text-expense transition-colors delete-tx" data-id="${t.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');

    el.querySelectorAll('.edit-tx').forEach(btn => {
        btn.addEventListener('click', () => editTx(btn.dataset.id));
    });
    el.querySelectorAll('.delete-tx').forEach(btn => {
        btn.addEventListener('click', () =>
            openModal('刪除紀錄', '確定要刪除這筆紀錄嗎？', () => deleteTx(btn.dataset.id))
        );
    });
}

function readForm() {
    const date        = document.getElementById('log-date').value;
    const amount      = parseFloat(document.getElementById('log-amount').value);
    const type        = document.querySelector('.type-btn.active')?.dataset.type || 'expense';
    const payType      = document.querySelector('input[name="payment"]:checked')?.value || 'cash';
    const payMethod    = payType === 'card' ? (document.getElementById('log-card-select').value || 'cash') : 'cash';
    const wantsInstall = payType === 'card' && document.getElementById('log-installment-toggle').checked;
    const installments = wantsInstall ? (parseInt(document.getElementById('log-installments').value) || 2) : 1;
    const category    = document.getElementById('log-category').value.trim();
    const location    = document.getElementById('log-location').value.trim();
    const note        = document.getElementById('log-note').value.trim();
    return { date, amount, type, payMethod, installments, category, location, note };
}

export function addTransaction() {
    const { date, amount, type, payMethod, installments, category, location, note } = readForm();
    if (!date || isNaN(amount) || amount <= 0) return;

    if (editingId) {
        const tx = appData.transactions.find(t => t.id === editingId);
        if (tx) Object.assign(tx, { date, type, amount, paymentMethod: payMethod, installments, category, location, note });

        // sync linked installment if exists
        const inst = appData.installments.find(i => i.txId === editingId);
        if (inst) {
            if (installments > 1 && payMethod !== 'cash') {
                Object.assign(inst, {
                    cardId: payMethod,
                    desc: category || location || inst.desc,
                    totalAmount: amount,
                    months: installments,
                    monthlyAmount: Math.ceil(amount / installments),
                    startDate: date
                });
            } else {
                // installment removed — delete the plan
                appData.installments = appData.installments.filter(i => i.txId !== editingId);
            }
        } else if (installments > 1 && payMethod !== 'cash') {
            // newly added installment on edit
            appData.installments.push({
                id: genId(),
                txId: editingId,
                cardId: payMethod,
                desc: category || location || '分期付款',
                totalAmount: amount,
                months: installments,
                monthlyAmount: Math.ceil(amount / installments),
                paidMonths: 0,
                startDate: date
            });
        }

        saveData();
        resetLogForm();
        document.dispatchEvent(new CustomEvent('app:update'));
        return;
    }

    const txId = genId();
    const tx = { id: txId, date, type, amount, paymentMethod: payMethod, installments, category, location, note };
    appData.transactions.push(tx);

    if (installments > 1 && payMethod !== 'cash') {
        appData.installments.push({
            id: genId(),
            txId,
            cardId: payMethod,
            desc: category || location || '分期付款',
            totalAmount: amount,
            months: installments,
            monthlyAmount: Math.ceil(amount / installments),
            paidMonths: 0,
            startDate: date
        });
    }

    saveData();
    resetLogForm();
    document.dispatchEvent(new CustomEvent('app:update'));
}

function editTx(id) {
    const tx = appData.transactions.find(t => t.id === id);
    if (!tx) return;

    editingId = id;
    setTransactionType(tx.type);
    document.getElementById('log-date').value   = tx.date;
    document.getElementById('log-amount').value = tx.amount;
    document.getElementById('log-category').value = tx.category || '';
    document.getElementById('log-location').value = tx.location || '';
    document.getElementById('log-note').value     = tx.note || '';

    if (tx.type === 'expense' && tx.paymentMethod !== 'cash') {
        document.getElementById('pay-card').checked = true;
        updatePaymentUI();
        document.getElementById('log-card-select').value = tx.paymentMethod;
        const hasInstall = (tx.installments || 1) > 1;
        document.getElementById('log-installment-toggle').checked = hasInstall;
        document.getElementById('log-installments-section').classList.toggle('hidden', !hasInstall);
        document.getElementById('log-installments').value = tx.installments || 3;
    } else {
        document.getElementById('pay-cash').checked = true;
        updatePaymentUI();
    }

    document.getElementById('log-form-title').textContent = '編輯紀錄';
    const addBtn = document.getElementById('log-add-btn');
    addBtn.textContent = '更新';
    addBtn.classList.replace('bg-primary', 'bg-amber-500');
    document.getElementById('log-cancel-btn').classList.remove('hidden');
    const card = document.getElementById('log-form-card');
    card.classList.replace('bg-white', 'bg-primary/5');
    card.classList.replace('border-black/5', 'border-primary/30');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteTx(id) {
    appData.transactions = appData.transactions.filter(t => t.id !== id);
    saveData();
    renderLogList();
    document.dispatchEvent(new CustomEvent('app:update'));
}

function resetLogForm() {
    editingId = null;
    document.getElementById('log-date').value         = new Date().toLocaleDateString('sv');
    document.getElementById('log-amount').value       = '';
    document.getElementById('log-category').value     = '';
    document.getElementById('log-location').value     = '';
    document.getElementById('log-note').value         = '';
    document.getElementById('log-installments').value = '3';
    document.getElementById('log-installment-toggle').checked = false;
    document.getElementById('log-installments-section').classList.add('hidden');
    document.getElementById('log-form-title').textContent = '新增紀錄';
    const addBtn = document.getElementById('log-add-btn');
    addBtn.textContent = '新增';
    addBtn.classList.replace('bg-amber-500', 'bg-primary');
    document.getElementById('log-cancel-btn').classList.add('hidden');
    const card = document.getElementById('log-form-card');
    card.classList.replace('bg-primary/5', 'bg-white');
    card.classList.replace('border-primary/30', 'border-black/5');
    setTransactionType('expense');
    document.getElementById('pay-cash').checked = true;
    updatePaymentUI();
}

export function cancelEdit() {
    resetLogForm();
}

export function setTransactionType(type) {
    document.querySelectorAll('.type-btn').forEach(btn => {
        const active = btn.dataset.type === type;
        btn.classList.toggle('active', active);
        if (active) {
            btn.classList.add('text-white', type === 'expense' ? 'bg-expense' : 'bg-income');
            btn.classList.remove('bg-slate-100', 'text-slate-500');
        } else {
            btn.classList.remove('text-white', 'bg-expense', 'bg-income');
            btn.classList.add('bg-slate-100', 'text-slate-500');
        }
    });

    const isExpense = type === 'expense';
    document.getElementById('log-payment-section').classList.toggle('hidden', !isExpense);
    document.getElementById('log-card-section').classList.toggle('hidden', true); // reset card section
    document.getElementById('log-location-section').classList.toggle('hidden', !isExpense);
    document.getElementById('category-chips').classList.toggle('hidden', !isExpense);
    document.getElementById('log-category-label').textContent = isExpense ? '消費類型' : '收入來源';
    document.getElementById('log-category').placeholder = isExpense ? '餐飲、交通…' : '薪資、獎金…';
    if (isExpense) {
        document.getElementById('pay-cash').checked = true;
    }
}

export function prevLogMonth() {
    const [y, m] = logMonth.split('-').map(Number);
    logMonth = new Date(y, m - 2, 1).toLocaleDateString('sv').slice(0, 7);
    renderLogList();
    renderInstallmentDue();
}

export function nextLogMonth() {
    const [y, m] = logMonth.split('-').map(Number);
    logMonth = new Date(y, m, 1).toLocaleDateString('sv').slice(0, 7);
    renderLogList();
    renderInstallmentDue();
}

function getInstallmentBillingInMonth(inst, card, month) {
    if (!card) return null;
    const billingDay = card.billingDay;
    const start = new Date(inst.startDate);
    let billing = new Date(start.getFullYear(), start.getMonth(), billingDay);
    if (billing < start) billing = new Date(start.getFullYear(), start.getMonth() + 1, billingDay);
    let count = 0;
    while (count < inst.months) {
        const m = billing.toLocaleDateString('sv').slice(0, 7);
        if (m === month) return { date: billing, period: count + 1 };
        if (m > month) break;
        count++;
        billing = new Date(billing.getFullYear(), billing.getMonth() + 1, billingDay);
    }
    return null;
}

function renderInstallmentDue() {
    const el = document.getElementById('log-installment-due');
    if (!el) return;

    const today = new Date();
    const dues = [];
    appData.installments.forEach(inst => {
        const card = appData.cards.find(c => c.id === inst.cardId);
        const hit = getInstallmentBillingInMonth(inst, card, logMonth);
        if (hit) dues.push({ inst, card, hit });
    });

    if (!dues.length) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');

    el.innerHTML = `
        <div class="text-sm font-black text-slate-600 mb-3">本月分期（${dues.length}筆）</div>
        ${dues.map(({ inst, card, hit }) => {
            const cardName = card ? `${card.bank} ****${card.lastFour}` : '未知卡片';
            const isPaid = hit.date <= today;
            const dateStr = hit.date.toLocaleDateString('sv');
            const statusCls = isPaid ? 'text-income font-bold' : 'text-slate-400';
            const statusTxt = isPaid ? '已繳 ✓' : '待繳';
            return `<div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-slate-700 truncate">${inst.desc}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${cardName} · 第 ${hit.period}/${inst.months} 期 · 結帳日 ${dateStr}</div>
                </div>
                <div class="flex items-center gap-3 ml-2 shrink-0">
                    <span class="text-base font-bold text-expense">-$${inst.monthlyAmount.toLocaleString()}</span>
                    <span class="text-xs ${statusCls}">${statusTxt}</span>
                </div>
            </div>`;
        }).join('')}`;
}
