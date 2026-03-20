import { appData } from './state.js';
import { getActivePlan } from './plans.js';
import { renderCharts } from './charts.js';

export function switchPage(pageId) {
    ['dashboard', 'logs', 'goals'].forEach(id => document.getElementById(`page-${id}`).classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    const navItems = document.querySelectorAll('.nav-item');
    const pageIdx  = { dashboard: 0, logs: 1, goals: 2 };
    navItems.forEach((btn, idx) => {
        if (idx === pageIdx[pageId]) { btn.classList.add('text-primary'); btn.classList.remove('text-moss/50'); }
        else { btn.classList.remove('text-primary'); btn.classList.add('text-moss/50'); }
    });
    updateUI();
}

export function updateUI() {
    const plan      = getActivePlan();
    const hasActive = !!plan;

    document.getElementById('active-plan-content').style.display  = hasActive ? 'block' : 'none';
    document.getElementById('no-plan-dashboard').style.display    = hasActive ? 'none'  : 'block';

    const formCard  = document.getElementById('form-card');
    const noPlanHint = document.getElementById('no-plan-log-hint');
    if (hasActive) { formCard.classList.remove('hidden'); noPlanHint.classList.add('hidden'); }
    else           { formCard.classList.add('hidden');    noPlanHint.classList.remove('hidden'); }

    if (hasActive) {
        const start      = new Date(plan.start);
        const end        = new Date(plan.end);
        const today      = new Date(); today.setHours(0, 0, 0, 0);
        const totalDays  = Math.max(1, Math.round((end - start) / 86400000));
        const elapsedDays = Math.max(0, Math.round((today - start) / 86400000));

        document.getElementById('plan-info').innerText    = `${plan.start} ~ ${plan.end}`;
        document.getElementById('progress-bar').style.width = Math.min((elapsedDays / totalDays) * 100, 100) + '%';
        document.getElementById('day-counter').innerHTML  =
            `<span>第 ${elapsedDays} 天</span><span class="text-moss font-medium">總計 ${totalDays} 天</span>`;

        const latest   = plan.logs.length > 0 ? plan.logs[0] : { w: plan.startW, f: plan.startF || 0 };
        const startW   = plan.startW, targetW = plan.targetW, currentW = latest.w;
        let   wProgress = startW !== targetW ? ((startW - currentW) / (startW - targetW)) * 100 : 0;

        document.getElementById('weight-progress-bar').style.width = Math.max(0, Math.min(100, wProgress)) + '%';
        document.getElementById('current-w-display').innerText = currentW;
        document.getElementById('target-w-val').innerText      = targetW;
        const diffW = (currentW - targetW).toFixed(1);
        document.getElementById('diff-w-val').innerText = diffW <= 0 ? '🏁 已達成' : `還差 ${diffW}kg`;

        const startF   = plan.startF || (plan.logs.length > 0 ? plan.logs[plan.logs.length - 1].f : 0) || 30;
        const targetF  = plan.targetF, currentF = latest.f || 0;
        let   fProgress = (startF !== targetF && currentF !== 0) ? ((startF - currentF) / (startF - targetF)) * 100 : 0;

        document.getElementById('fat-progress-bar').style.width   = Math.max(0, Math.min(100, fProgress)) + '%';
        document.getElementById('current-f-display').innerText    = currentF || '--';
        document.getElementById('target-f-val').innerText         = targetF;
        const diffF = (currentF - targetF).toFixed(1);
        document.getElementById('diff-f-val').innerText =
            currentF === 0 ? '--' : (diffF <= 0 ? '🏁 已達成' : `還差 ${diffF}%`);

        document.getElementById('overall-progress-badge').innerText = `達成度 ${Math.floor(Math.max(0, wProgress))}%`;

        const sortedAsc = [...plan.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
        renderCharts(sortedAsc, plan.start);
        updateLogTable(plan);

        const todayStr = new Date().toLocaleDateString('sv');
        const isExpired = todayStr > plan.end;
        document.getElementById('current-plan-desc').innerHTML = `
            <div class="text-center">
                <div class="font-bold text-lg ${isExpired ? 'text-danger' : 'text-primary'}">${isExpired ? '⏰ 計畫已到期' : '🌱 計畫進行中'}</div>
                <div class="text-[11px] text-moss mt-1">${plan.start} ~ ${plan.end}</div>
                <div class="mt-4 grid grid-cols-2 gap-2 text-[10px]">
                    <div class="bg-oatmeal p-2 rounded-xl border border-primary/5">起始: ${plan.startW}kg</div>
                    <div class="bg-oatmeal p-2 rounded-xl border border-primary/5">目標: ${plan.targetW}kg</div>
                </div>
            </div>
        `;
        document.getElementById('active-plan-edit-btn').classList.remove('hidden');
    } else {
        document.getElementById('log-table-body').innerHTML = '';
        document.getElementById('current-plan-desc').innerHTML = `
            <div class="p-6 border-2 border-dashed border-gray-100 rounded-3xl min-h-[140px] flex items-center justify-center italic text-moss font-bold">尚無旅程</div>
        `;
        document.getElementById('active-plan-edit-btn').classList.add('hidden');
    }
    updateHistoryList();
}

export function updateLogTable(plan) {
    document.getElementById('log-table-body').innerHTML = plan.logs.map(l => `
        <tr class="hover:bg-oatmeal/50 transition-colors">
            <td class="py-4 font-bold text-primary-dark">${l.date.split('-').slice(1).join('/')}</td>
            <td class="py-4"><div>${l.w}kg</div><div class="text-[10px] text-accent font-bold">${l.f || '--'}%</div></td>
            <td class="py-4 text-[11px] text-moss font-medium"><div>內:${l.v || '-'}</div><div>肌:${l.m || '-'}%</div></td>
            <td class="py-4 text-moss">${l.waist || '--'}cm</td>
            <td class="py-4 text-right">
                <div class="flex justify-end gap-3">
                    <button class="text-accent hover:scale-110 transition-transform text-lg leading-none"
                        data-action="edit-log" data-date="${l.date}" title="修改">✏️</button>
                    <button class="text-danger hover:scale-110 transition-transform text-lg leading-none"
                        data-action="delete-log" data-date="${l.date}" title="刪除">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

export function updateHistoryList() {
    const list    = document.getElementById('history-list');
    const history = appData.plans.filter(p => !p.active).sort((a, b) => b.id - a.id);
    if (history.length === 0) {
        list.innerHTML = '<p class="text-center text-moss text-xs italic py-8">尚無歷史腳印</p>';
        return;
    }

    list.innerHTML = history.map(p => {
        return `
            <div class="bg-white p-5 rounded-3xl border border-black/5 shadow-sm">
                <div class="flex justify-between items-center">
                    <div class="flex-1 min-w-0 pr-4">
                        <div class="font-bold text-sm text-primary truncate">🗓️ ${p.start} ~ ${p.end}</div>
                        <div class="text-[10px] text-moss font-bold mt-1">紀錄: ${p.logs.length} 筆 | 目標: ${p.targetW}kg</div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button data-action="show-history-chart" data-id="${p.id}"
                            class="bg-accent/10 text-primary px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-accent/20 transition-colors">回顧</button>
                        <button data-action="edit-history" data-id="${p.id}"
                            class="bg-accent/10 text-accent px-3 py-1.5 rounded-lg font-bold text-xs">編輯</button>
                        <button data-action="delete-history" data-id="${p.id}"
                            class="bg-danger/10 text-danger px-3 py-1.5 rounded-lg font-bold text-xs">刪除</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

