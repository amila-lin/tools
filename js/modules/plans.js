import { appData } from './state.js';
import { saveData } from './data.js';
import { openModal } from './modal.js';

export function getActivePlan() {
    return appData.plans.find(p => p.active === true);
}

export function handleActivePlanEdit() {
    const plan = getActivePlan();
    if (plan) setupNewPlan(plan);
}

export function handleNewPlanClick() {
    const plan = getActivePlan();
    if (plan) {
        openModal('結束當前旅程？', '目前已有一個正在進行中的計畫。開啟新旅程將會結束並歸檔目前的計畫。是否要繼續？', () => {
            finishActivePlanAndStartNew();
        });
    } else {
        setupNewPlan();
    }
}

export function finishActivePlanAndStartNew() {
    appData.plans.forEach(p => p.active = false);
    saveData();
    document.dispatchEvent(new CustomEvent('app:update'));
    setTimeout(() => setupNewPlan(), 300);
}

export function setupNewPlan(editingPlan = null) {
    const isEditing = !!editingPlan;
    const startStr = isEditing ? editingPlan.start : new Date().toISOString().split('T')[0];
    const endStr = isEditing ? editingPlan.end : (() => {
        const d = new Date(); d.setDate(d.getDate() + 55); return d.toISOString().split('T')[0];
    })();
    const sw = isEditing ? editingPlan.startW : '';
    const tw = isEditing ? editingPlan.targetW : '';
    const tf = isEditing ? (editingPlan.targetF || '') : '';
    const sf = isEditing ? (editingPlan.startF || '') : '';

    const html = `
        <div class="space-y-4 text-left">
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-[10px] font-bold">開始日期</label><input type="date" id="new-plan-start" value="${startStr}" class="w-full p-3 border-2 rounded-xl text-sm"></div>
                <div><label class="text-[10px] font-bold">目標日期</label><input type="date" id="new-plan-end" value="${endStr}" class="w-full p-3 border-2 rounded-xl text-sm"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-[10px] font-bold">起始體重</label><input type="number" id="new-plan-sw" value="${sw}" class="w-full p-3 border-2 rounded-xl"></div>
                <div><label class="text-[10px] font-bold">起始體脂(選填)</label><input type="number" id="new-plan-sf" value="${sf}" class="w-full p-3 border-2 rounded-xl"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-[10px] font-bold">目標體重</label><input type="number" id="new-plan-tw" value="${tw}" class="w-full p-3 border-2 rounded-xl"></div>
                <div><label class="text-[10px] font-bold">目標體脂</label><input type="number" id="new-plan-tf" value="${tf}" class="w-full p-3 border-2 rounded-xl"></div>
            </div>
        </div>
    `;

    openModal(isEditing ? '編輯旅程' : '設定新旅程', html, () => {
        const start = document.getElementById('new-plan-start').value;
        const end   = document.getElementById('new-plan-end').value;
        const nsw   = parseFloat(document.getElementById('new-plan-sw').value);
        const nsf   = parseFloat(document.getElementById('new-plan-sf').value) || 0;
        const ntw   = parseFloat(document.getElementById('new-plan-tw').value);
        const ntf   = parseFloat(document.getElementById('new-plan-tf').value) || 0;
        if (!start || !end || isNaN(nsw)) return;

        if (isEditing) {
            const idx = appData.plans.findIndex(p => p.id === editingPlan.id);
            if (idx > -1) Object.assign(appData.plans[idx], { start, end, startW: nsw, startF: nsf, targetW: ntw, targetF: ntf });
        } else {
            appData.plans.forEach(p => p.active = false);
            appData.plans.push({ id: Date.now(), start, end, startW: nsw, startF: nsf, targetW: ntw, targetF: ntf, logs: [], active: true });
        }
        saveData();
        document.dispatchEvent(new CustomEvent('app:update'));
    }, true);
}

export function confirmDeleteHistory(id) {
    openModal('刪除計畫', '確定要永久刪除此段歷史紀錄嗎？', () => {
        appData.plans = appData.plans.filter(p => p.id !== id);
        saveData();
        document.dispatchEvent(new CustomEvent('app:update'));
    });
}
