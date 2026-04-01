import { appData } from './state.js';
import { saveData } from './data.js';

let chart = null;
let viewMonth = new Date().toLocaleDateString('sv').slice(0, 7);

function txInMonth(month) {
    return appData.transactions.filter(t => t.date.startsWith(month));
}

function summary(month) {
    const txs = txInMonth(month);
    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
}

export function getViewMonth() { return viewMonth; }

export function renderDashboard() {
    document.getElementById('dash-month').textContent = viewMonth;
    renderSummaryCards();
    renderBudget();
    renderChart();
    renderCategories();
}

function renderSummaryCards() {
    const { income, expense, balance } = summary(viewMonth);
    document.getElementById('dash-income').textContent  = '$' + income.toLocaleString();
    document.getElementById('dash-expense').textContent = '$' + expense.toLocaleString();
    const el = document.getElementById('dash-balance');
    el.textContent = '$' + balance.toLocaleString();
    el.className = 'text-xl font-black ' + (balance >= 0 ? 'text-income' : 'text-expense');
}

function getBudget(month) {
    return appData.budgets[month] ?? 0;
}

function installmentExpenseInMonth(month) {
    return appData.installments.reduce((sum, inst) => {
        const card = appData.cards.find(c => c.id === inst.cardId);
        if (!card) return sum;
        const billingDay = card.billingDay;
        const start = new Date(inst.startDate);
        let billing = new Date(start.getFullYear(), start.getMonth(), billingDay);
        if (billing < start) billing = new Date(start.getFullYear(), start.getMonth() + 1, billingDay);
        const today = new Date();
        const currentMonth = today.toLocaleDateString('sv').slice(0, 7);
        let count = 0;
        while (count < inst.months) {
            const m = billing.toLocaleDateString('sv').slice(0, 7);
            if (m === month) {
                // current month: only count if billing date has passed
                // past/future months: always count
                if (month !== currentMonth || billing <= today) sum += inst.monthlyAmount;
                break;
            }
            if (m > month) break;
            count++;
            billing = new Date(billing.getFullYear(), billing.getMonth() + 1, billingDay);
        }
        return sum;
    }, 0);
}

function renderBudget() {
    const display = document.getElementById('dash-budget-display');
    const budget = getBudget(viewMonth);
    if (!budget) { display.classList.add('hidden'); return; }
    display.classList.remove('hidden');

    // tx IDs that have an installment plan — exclude their full amount from regular expense
    const instTxIds = new Set(appData.installments.map(i => i.txId).filter(Boolean));
    const txs = txInMonth(viewMonth);
    const regularExpense = txs
        .filter(t => t.type === 'expense' && !instTxIds.has(t.id))
        .reduce((s, t) => s + t.amount, 0);
    const instExpense = installmentExpenseInMonth(viewMonth);
    const total = regularExpense + instExpense;
    const raw = total / budget * 100;
    const pct = Math.min(100, raw);
    const pctDisplay = raw >= 1 ? Math.round(raw) : raw.toFixed(1);
    const barWidth = total > 0 ? Math.max(1, pct) : 0;
    const instNote = instExpense > 0 ? `（含分期 $${instExpense.toLocaleString()}）` : '';
    document.getElementById('dash-budget-text').textContent =
        `$${budget.toLocaleString()} · 已用 $${total.toLocaleString()}${instNote}（${pctDisplay}%）`;
    const bar = document.getElementById('dash-budget-bar');
    bar.style.width = barWidth + '%';
    bar.className = 'h-2 rounded-full transition-all ' +
        (pct >= 100 ? 'bg-expense' : pct >= 80 ? 'bg-yellow-400' : 'bg-income');
}

function renderChart() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleDateString('sv').slice(0, 7));
    }
    const incomes  = months.map(m => summary(m).income);
    const expenses = months.map(m => summary(m).expense);
    const labels   = months.map(m => m.slice(5));
    const maxBudget = Math.max(...months.map(m => appData.budgets[m] ?? 0));

    const ctx = document.getElementById('dash-chart').getContext('2d');
    if (chart) { chart.destroy(); chart = null; }
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: '收入', data: incomes,  backgroundColor: '#059669', borderRadius: 4 },
                { label: '支出', data: expenses, backgroundColor: '#dc2626', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true, suggestedMax: maxBudget || undefined } }
        }
    });
}

function renderCategories() {
    const instTxIds = new Set(appData.installments.map(i => i.txId).filter(Boolean));
    const txs = txInMonth(viewMonth).filter(t => t.type === 'expense' && !instTxIds.has(t.id));
    const map = {};
    txs.forEach(t => { const k = t.category || '其他'; map[k] = (map[k] || 0) + t.amount; });

    const instKeys = new Set();
    const today = new Date();
    const currentMonth = today.toLocaleDateString('sv').slice(0, 7);
    appData.installments.forEach(inst => {
        const card = appData.cards.find(c => c.id === inst.cardId);
        if (!card) return;
        const billingDay = card.billingDay;
        const start = new Date(inst.startDate);
        let billing = new Date(start.getFullYear(), start.getMonth(), billingDay);
        if (billing < start) billing = new Date(start.getFullYear(), start.getMonth() + 1, billingDay);
        let count = 0;
        while (count < inst.months) {
            const m = billing.toLocaleDateString('sv').slice(0, 7);
            if (m === viewMonth) {
                if (viewMonth !== currentMonth || billing <= today) {
                    const k = inst.desc || '分期付款';
                    map[k] = (map[k] || 0) + inst.monthlyAmount;
                    instKeys.add(k);
                }
                break;
            }
            if (m > viewMonth) break;
            count++;
            billing = new Date(billing.getFullYear(), billing.getMonth() + 1, billingDay);
        }
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total  = sorted.reduce((s, [, v]) => s + v, 0);
    const el = document.getElementById('dash-categories');
    if (!sorted.length) { el.innerHTML = '<p class="text-sm text-slate-400">本月無支出紀錄</p>'; return; }
    el.innerHTML = sorted.map(([cat, amt]) => {
        const pct = total ? Math.round(amt / total * 100) : 0;
        const badge = instKeys.has(cat) ? `<span class="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-bold shrink-0">分期</span>` : '';
        return `<div class="cat-detail-row flex items-center gap-2 cursor-pointer hover:bg-slate-50 -mx-1 px-1 rounded-xl transition-colors" data-cat="${cat}" data-inst="${instKeys.has(cat)}">
            <span class="text-sm w-20 shrink-0 truncate text-slate-600">${cat}</span>
            <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-1.5 bg-primary rounded-full" style="width:${pct}%"></div>
            </div>
            <div class="flex items-center justify-end gap-1 w-20 shrink-0">
                ${badge}<span class="text-sm text-slate-500">$${amt.toLocaleString()}</span>
            </div>
        </div>`;
    }).join('');

    const isHoverDevice = window.matchMedia('(hover: hover)').matches;
    el.querySelectorAll('.cat-detail-row').forEach(row => {
        const cat = row.dataset.cat;
        const isInst = row.dataset.inst === 'true';
        row.addEventListener('click', () => openCatDetail(cat, isInst));
        if (isHoverDevice) {
            row.addEventListener('mouseenter', e => showCatTooltip(e, cat, isInst));
            row.addEventListener('mouseleave', hideCatTooltip);
        }
    });
}

function buildCategoryDetailHTML(cat, isInst) {
    const instTxIds = new Set(appData.installments.map(i => i.txId).filter(Boolean));
    if (isInst) {
        const today = new Date();
        const currentMonth = today.toLocaleDateString('sv').slice(0, 7);
        const rows = [];
        appData.installments.forEach(inst => {
            if ((inst.desc || '分期付款') !== cat) return;
            const card = appData.cards.find(c => c.id === inst.cardId);
            if (!card) return;
            const billingDay = card.billingDay;
            const start = new Date(inst.startDate);
            let billing = new Date(start.getFullYear(), start.getMonth(), billingDay);
            if (billing < start) billing = new Date(start.getFullYear(), start.getMonth() + 1, billingDay);
            let count = 0;
            while (count < inst.months) {
                const m = billing.toLocaleDateString('sv').slice(0, 7);
                if (m === viewMonth) {
                    if (viewMonth !== currentMonth || billing <= today) {
                        const cardName = `${card.bank} ****${card.lastFour}`;
                        const isPaid = billing <= today;
                        rows.push(`<div class="py-2.5 border-b border-slate-100 last:border-0">
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-slate-600">${cardName}</span>
                                <span class="text-sm font-bold text-expense">-$${inst.monthlyAmount.toLocaleString()}</span>
                            </div>
                            <div class="flex items-center justify-between mt-0.5">
                                <span class="text-xs text-slate-400">${inst.startDate} · 第 ${count + 1}/${inst.months} 期 · 結帳日 ${billing.toLocaleDateString('sv')}</span>
                                <span class="text-xs ${isPaid ? 'text-income font-bold' : 'text-slate-300'}">${isPaid ? '已繳' : '待繳'}</span>
                            </div>
                        </div>`);
                    }
                    break;
                }
                if (m > viewMonth) break;
                count++;
                billing = new Date(billing.getFullYear(), billing.getMonth() + 1, billingDay);
            }
        });
        return rows.join('') || '<p class="text-sm text-slate-400 py-2">無資料</p>';
    } else {
        const txs = txInMonth(viewMonth)
            .filter(t => t.type === 'expense' && !instTxIds.has(t.id) && (t.category || '其他') === cat)
            .sort((a, b) => b.date.localeCompare(a.date));
        if (!txs.length) return '<p class="text-sm text-slate-400 py-2">無資料</p>';
        return txs.map(t => {
            const loc = t.location ? ` · ${t.location}` : '';
            const note = t.note ? `<div class="text-xs text-slate-400 italic">${t.note}</div>` : '';
            return `<div class="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <div class="flex-1 min-w-0">
                    <div class="text-sm text-slate-600 truncate">${t.date}${loc}</div>
                    ${note}
                </div>
                <span class="text-sm font-bold text-expense ml-2 shrink-0">-$${t.amount.toLocaleString()}</span>
            </div>`;
        }).join('');
    }
}

function openCatDetail(cat, isInst) {
    document.getElementById('cat-detail-title').textContent = cat;
    document.getElementById('cat-detail-list').innerHTML = buildCategoryDetailHTML(cat, isInst);
    document.getElementById('cat-detail-modal').classList.remove('hidden');
}

let catTooltipEl = null;
function showCatTooltip(e, cat, isInst) {
    hideCatTooltip();
    const content = buildCategoryDetailHTML(cat, isInst);
    catTooltipEl = document.createElement('div');
    catTooltipEl.className = 'fixed z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-72 pointer-events-none';
    catTooltipEl.innerHTML = `<div class="text-sm font-black text-slate-700 mb-2">${cat}</div><div>${content}</div>`;
    document.body.appendChild(catTooltipEl);
    positionTooltip(e);
}

function positionTooltip(e) {
    if (!catTooltipEl) return;
    const x = e.clientX + 16;
    const y = e.clientY - 20;
    const rect = catTooltipEl.getBoundingClientRect();
    catTooltipEl.style.left = (x + rect.width > window.innerWidth ? e.clientX - rect.width - 8 : x) + 'px';
    catTooltipEl.style.top  = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)) + 'px';
}

function hideCatTooltip() {
    if (catTooltipEl) { catTooltipEl.remove(); catTooltipEl = null; }
}

export function prevMonth() {
    const [y, m] = viewMonth.split('-').map(Number);
    viewMonth = new Date(y, m - 2, 1).toLocaleDateString('sv').slice(0, 7);
    renderDashboard();
}

export function nextMonth() {
    const [y, m] = viewMonth.split('-').map(Number);
    viewMonth = new Date(y, m, 1).toLocaleDateString('sv').slice(0, 7);
    renderDashboard();
}

export function saveBudget() {
    const val = parseFloat(document.getElementById('budget-input').value);
    if (!isNaN(val) && val >= 0) {
        appData.budgets[viewMonth] = val;
        saveData();
        document.getElementById('budget-form').classList.add('hidden');
        renderDashboard();
    }
}
