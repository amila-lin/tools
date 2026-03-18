import { setIsEditingMode } from './state.js';
import { saveData } from './data.js';
import { getActivePlan } from './plans.js';
import { openModal } from './modal.js';

export function validateLogDate() {
    const plan = getActivePlan();
    const dateInput = document.getElementById('log-date');
    const saveBtn   = document.getElementById('save-btn');
    const hint      = document.getElementById('date-limit-hint');
    if (!plan) { saveBtn.disabled = true; return; }
    const selected = dateInput.value;
    const today    = new Date().toISOString().split('T')[0];
    if (selected > today) {
        hint.innerText = '⚠️ 不能預知未來喔！';
        hint.className = 'text-[10px] mt-1 text-danger';
        saveBtn.disabled = true; return;
    }
    if (selected < plan.start || selected > plan.end) {
        hint.innerText = `❌ 不在計畫內 (${plan.start}~${plan.end})`;
        hint.className = 'text-[10px] mt-1 text-danger';
        saveBtn.disabled = true; return;
    }
    hint.innerText = '✅ 日期符合計畫範圍';
    hint.className = 'text-[10px] mt-1 text-primary';
    saveBtn.disabled = false;
}

export function deleteLog(date) {
    const plan = getActivePlan(); if (!plan) return;
    openModal('🗑️ 刪除紀錄', `確定要刪除 ${date} 的紀錄嗎？此操作無法恢復。`, () => {
        plan.logs = plan.logs.filter(l => l.date !== date);
        saveData();
        document.dispatchEvent(new CustomEvent('app:update'));
    });
}

export function addLog() {
    const plan = getActivePlan(); if (!plan) return;
    const date  = document.getElementById('log-date').value;
    const w     = parseFloat(document.getElementById('log-w').value);
    const f     = parseFloat(document.getElementById('log-f').value)     || 0;
    const v     = parseFloat(document.getElementById('log-v').value)     || 0;
    const m     = parseFloat(document.getElementById('log-m').value)     || 0;
    const waist = parseFloat(document.getElementById('log-waist').value) || 0;
    if (!date || isNaN(w)) return;
    const log = { date, w, f, v, m, waist };
    const idx = plan.logs.findIndex(l => l.date === date);
    if (idx > -1) plan.logs[idx] = log; else plan.logs.push(log);
    plan.logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveData();
    resetForm();
    document.dispatchEvent(new CustomEvent('app:update'));
}

export function editLog(date) {
    const plan = getActivePlan(); if (!plan) return;
    const log  = plan.logs.find(l => l.date === date);
    if (log) {
        setIsEditingMode(true);
        document.getElementById('log-date').value    = log.date;
        document.getElementById('log-date').disabled = true;
        document.getElementById('log-w').value       = log.w;
        document.getElementById('log-f').value       = log.f     || 0;
        document.getElementById('log-v').value       = log.v     || 0;
        document.getElementById('log-m').value       = log.m     || 0;
        document.getElementById('log-waist').value   = log.waist || 0;
        document.getElementById('cancel-btn').classList.remove('hidden');
        document.getElementById('save-btn').innerText = '更新紀錄';
        const card  = document.getElementById('form-card');
        const badge = document.getElementById('form-badge');
        card.classList.replace('bg-white', 'bg-moss/10');
        badge.innerText = '編輯中';
        badge.className = 'text-[10px] bg-moss/20 text-moss px-2 py-0.5 rounded-full font-bold';
        card.scrollIntoView({ behavior: 'smooth' });
        validateLogDate();
    }
}

export function resetForm() {
    setIsEditingMode(false);
    const plan  = getActivePlan();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('log-date').value    = (plan && today > plan.end) ? plan.end : today;
    document.getElementById('log-date').disabled = false;
    ['log-w', 'log-f', 'log-v', 'log-m', 'log-waist'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('cancel-btn').classList.add('hidden');
    document.getElementById('save-btn').innerText = '儲存紀錄';
    const card  = document.getElementById('form-card');
    const badge = document.getElementById('form-badge');
    card.classList.replace('bg-moss/10', 'bg-white');
    badge.innerText = '新紀錄';
    badge.className = 'text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold';
    validateLogDate();
}
