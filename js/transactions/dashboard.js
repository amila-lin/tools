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
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderCategories() {
    const txs = txInMonth(viewMonth).filter(t => t.type === 'expense');
    const map = {};
    txs.forEach(t => { const k = t.category || '其他'; map[k] = (map[k] || 0) + t.amount; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total  = sorted.reduce((s, [, v]) => s + v, 0);
    const el = document.getElementById('dash-categories');
    if (!sorted.length) { el.innerHTML = '<p class="text-sm text-slate-400">本月無支出紀錄</p>'; return; }
    el.innerHTML = sorted.map(([cat, amt]) => {
        const pct = total ? Math.round(amt / total * 100) : 0;
        return `<div class="flex items-center gap-2">
            <span class="text-sm w-20 truncate text-slate-600">${cat}</span>
            <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-1.5 bg-primary rounded-full" style="width:${pct}%"></div>
            </div>
            <span class="text-sm text-slate-500 w-20 text-right">$${amt.toLocaleString()}</span>
        </div>`;
    }).join('');
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
