import { chartInstances, currentSecondaryType, setCurrentSecondaryType } from './state.js';

export function getDayOffset(dateStr, startStr) {
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    const s = new Date(startStr); s.setHours(0, 0, 0, 0);
    return Math.round((d - s) / 86400000);
}

export function renderCharts(logs, planStart) {
    const ctxMain = document.getElementById('chart-main').getContext('2d');
    if (chartInstances.main) chartInstances.main.destroy();

    chartInstances.main = new Chart(ctxMain, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: '體重',
                    data: logs.map(l => ({ x: getDayOffset(l.date, planStart), y: l.w })),
                    borderColor: '#2D6A4F', backgroundColor: '#2D6A4F22',
                    fill: true, tension: 0.3, yAxisID: 'y'
                },
                {
                    label: '體脂',
                    data: logs.map(l => ({ x: getDayOffset(l.date, planStart), y: l.f || null })),
                    borderColor: '#52B788', tension: 0.3, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    type: 'linear', position: 'bottom',
                    ticks: { stepSize: 1, callback: v => '第 ' + v + ' 天', font: { size: 10, weight: 'bold' } },
                    grid: { display: false }
                },
                y: { title: { display: true, text: '體重 (kg)', font: { size: 10 } }, ticks: { font: { size: 10 } } },
                y1: {
                    position: 'right', grid: { drawOnChartArea: false },
                    title: { display: true, text: '體脂 (%)', font: { size: 10 } },
                    ticks: { font: { size: 10 } }
                }
            },
            plugins: { legend: { labels: { usePointStyle: true, font: { size: 11, weight: 'bold' } } } }
        }
    });

    const ctxSec = document.getElementById('chart-secondary').getContext('2d');
    if (chartInstances.secondary) chartInstances.secondary.destroy();

    let config = { label: '內臟脂肪', color: '#E07A5F', key: 'v' };
    if (currentSecondaryType === 'muscle') config = { label: '骨骼肌率', color: '#3D5A80', key: 'm' };
    if (currentSecondaryType === 'waist')  config = { label: '腰圍',     color: '#6B705C', key: 'waist' };

    chartInstances.secondary = new Chart(ctxSec, {
        type: 'line',
        data: {
            datasets: [{
                label: config.label,
                data: logs.map(l => ({ x: getDayOffset(l.date, planStart), y: l[config.key] || null })).filter(d => d.y !== null),
                borderColor: config.color, tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', ticks: { stepSize: 1, callback: v => '第 ' + v + ' 天', font: { size: 10 } } }
            }
        }
    });
}

// ── 歷史計畫圖表 Modal ──────────────────────────────────────────
const historyCharts = { main: null, v: null, m: null, w: null };
let currentHistoryPlan = null;

const SEC_CFGS = {
    v: { label: '內臟脂肪', color: '#E07A5F', key: 'v' },
    m: { label: '骨骼肌率', color: '#3D5A80', key: 'm' },
    w: { label: '腰圍',     color: '#6B705C', key: 'waist' },
};

function makeSecChart(canvasId, logs, planStart, cfg, opts = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: { datasets: [{ label: cfg.label,
            data: logs.map(l => ({ x: getDayOffset(l.date, planStart), y: l[cfg.key] || null })).filter(d => d.y !== null),
            borderColor: cfg.color, tension: 0.3, pointRadius: 2 }] },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: {
                x: { type: 'linear', ticks: { callback: v => '第'+v+'天', font: { size: 7 }, maxTicksLimit: 8 } },
                y: { ticks: { font: { size: 7 } } }
            },
            plugins: { legend: { labels: { font: { size: 8 }, usePointStyle: true } } },
            ...opts
        }
    });
}

export function openHistoryChart(plan) {
    currentHistoryPlan = plan;
    document.getElementById('chart-modal-title').innerText = '計畫趨勢圖';
    document.getElementById('chart-modal-subtitle').innerText =
        `${plan.start} ~ ${plan.end}｜起始 ${plan.startW}kg → 目標 ${plan.targetW}kg`;

    const logs = [...plan.logs].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 主圖
    if (historyCharts.main) historyCharts.main.destroy();
    historyCharts.main = new Chart(document.getElementById('history-chart-canvas').getContext('2d'), {
        type: 'line',
        data: { datasets: [
            { label: '體重', data: logs.map(l => ({ x: getDayOffset(l.date, plan.start), y: l.w })),
              borderColor: '#2D6A4F', backgroundColor: '#2D6A4F22', fill: true, tension: 0.3, yAxisID: 'y' },
            { label: '體脂', data: logs.map(l => ({ x: getDayOffset(l.date, plan.start), y: l.f || null })),
              borderColor: '#52B788', tension: 0.3, yAxisID: 'y1' }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { type: 'linear', position: 'bottom',
                     ticks: { stepSize: 1, callback: v => '第 ' + v + ' 天', font: { size: 10, weight: 'bold' } },
                     grid: { display: false } },
                y:  { title: { display: true, text: '體重 (kg)', font: { size: 10 } }, ticks: { font: { size: 10 } } },
                y1: { position: 'right', grid: { drawOnChartArea: false },
                      title: { display: true, text: '體脂 (%)', font: { size: 10 } }, ticks: { font: { size: 10 } } }
            },
            plugins: { legend: { labels: { usePointStyle: true, font: { size: 11, weight: 'bold' } } } }
        }
    });

    // 三張進階指標圖
    ['v', 'm', 'w'].forEach(k => {
        if (historyCharts[k]) historyCharts[k].destroy();
        historyCharts[k] = makeSecChart(`history-chart-${k}`, logs, plan.start, SEC_CFGS[k]);
    });

    // 表格
    document.getElementById('chart-modal-table').innerHTML = logs.map(l => `
        <tr class="hover:bg-oatmeal/50 transition-colors">
            <td class="py-2 font-medium">${l.date.split('-').slice(1).join('/')}</td>
            <td class="py-2 font-bold text-primary">${l.w}kg</td>
            <td class="py-2 text-accent">${l.f || '--'}%</td>
            <td class="py-2">${l.v || '--'}</td>
            <td class="py-2">${l.m || '--'}%</td>
            <td class="py-2">${l.waist || '--'}cm</td>
        </tr>`).join('');

    document.getElementById('chart-modal-overlay').classList.replace('hidden', 'flex');
}

export function closeHistoryChart() {
    document.getElementById('chart-modal-overlay').classList.replace('flex', 'hidden');
    Object.keys(historyCharts).forEach(k => { if (historyCharts[k]) { historyCharts[k].destroy(); historyCharts[k] = null; } });
}

// 離屏渲染進階指標圖，回傳 base64
function renderSecondaryImg(logs, planStart, cfg, w, h) {
    return new Promise(resolve => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(canvas);
        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { datasets: [{ label: cfg.label,
                data: logs.map(l => ({ x: getDayOffset(l.date, planStart), y: l[cfg.key] || null })).filter(d => d.y !== null),
                borderColor: cfg.color, tension: 0.3, pointRadius: 3 }] },
            options: { responsive: false, animation: { onComplete: () => {
                const img = chart.toBase64Image('image/png', 1.0);
                chart.destroy(); document.body.removeChild(canvas); resolve(img);
            }},
            scales: {
                x: { type: 'linear', ticks: { callback: v => '第'+v+'天', font: { size: 7 }, maxTicksLimit: 8 } },
                y: { ticks: { font: { size: 7 } } }
            },
            plugins: { legend: { labels: { font: { size: 8 }, usePointStyle: true } } } }
        });
    });
}

// 產生單頁 A4 容器並截圖，回傳 dataURL
async function renderA4Page(innerHTML) {
    const A4_W = 794, A4_H = 1123;
    const el = document.createElement('div');
    el.setAttribute('style',
        `position:fixed;left:-9999px;top:0;width:${A4_W}px;height:${A4_H}px;` +
        'background:#F9F7F2;box-sizing:border-box;overflow:hidden;' +
        'font-family:PingFang TC,Heiti TC,Microsoft JhengHei,sans-serif;');
    el.innerHTML = innerHTML;
    document.body.appendChild(el);
    const canvas = await html2canvas(el, { backgroundColor: '#F9F7F2', scale: 4, useCORS: true, width: A4_W, height: A4_H });
    document.body.removeChild(el);
    return canvas.toDataURL('image/png');
}

function triggerDownload(dataURL, filename) {
    const a = document.createElement('a'); a.href = dataURL; a.download = filename; a.click();
}

export async function downloadHistoryChart() {
    if (!historyCharts.main || !currentHistoryPlan) return;
    const plan    = currentHistoryPlan;
    const mainImg = historyCharts.main.toBase64Image('image/png', 1.0);
    const logs    = [...plan.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const date    = new Date().toISOString().split('T')[0];

    const A4_W = 794, A4_H = 1123, PAD = 28, CARD_PAD = 16, GAP = 10;
    const inner = A4_W - PAD * 2;

    // ── 第 1 頁：圖表區 ──────────────────────────────────────────
    const TITLE_H = 52, MAIN_H = 380, SEC_H = 90;
    const secW = inner - CARD_PAD * 2;

    const [imgV, imgM, imgW] = await Promise.all([
        renderSecondaryImg(logs, plan.start, SEC_CFGS.v, secW, SEC_H),
        renderSecondaryImg(logs, plan.start, SEC_CFGS.m, secW, SEC_H),
        renderSecondaryImg(logs, plan.start, SEC_CFGS.w, secW, SEC_H),
    ]);

    const headerHtml = (page, total) => `
        <div style="padding:${PAD}px ${PAD}px 0;display:flex;justify-content:space-between;align-items:flex-end;">
            <div>
                <div style="font-size:17px;font-weight:900;color:#2D6A4F;">計畫趨勢圖</div>
                <div style="font-size:10px;color:#6B705C;margin-top:2px;">
                    ${plan.start} ~ ${plan.end}｜起始 ${plan.startW}kg → 目標 ${plan.targetW}kg
                </div>
            </div>
            <div style="font-size:9px;color:#6B705C;">第 ${page} / ${total} 頁</div>
        </div>`;

    // 計算總頁數（第1頁=圖表，其餘=表格）
    const TH_H = 26, ROW_H = 22;
    const tablePageH = A4_H - PAD * 2 - TITLE_H - GAP - CARD_PAD * 2;
    const rowsPerPage = Math.floor((tablePageH - TH_H) / ROW_H);
    const tablePages = Math.ceil(logs.length / rowsPerPage);
    const totalPages = 1 + tablePages;

    const page1 = `
        ${headerHtml(1, totalPages)}
        <div style="padding:${GAP}px ${PAD}px 0;">
            <div style="background:white;border-radius:14px;padding:${CARD_PAD}px;margin-bottom:${GAP}px;">
                <img src="${mainImg}" style="width:${inner-CARD_PAD*2}px;height:${MAIN_H}px;display:block;object-fit:fill;">
            </div>
            <div style="background:white;border-radius:14px;padding:${CARD_PAD}px;display:flex;flex-direction:column;gap:8px;">
                <img src="${imgV}" style="width:${secW}px;height:${SEC_H}px;display:block;">
                <img src="${imgM}" style="width:${secW}px;height:${SEC_H}px;display:block;">
                <img src="${imgW}" style="width:${secW}px;height:${SEC_H}px;display:block;">
            </div>
        </div>`;

    triggerDownload(await renderA4Page(page1), `減脂趨勢圖_${date}_p1.png`);

    // ── 第 2 頁起：資料表 ────────────────────────────────────────
    const S   = s => `style="${s}"`;
    const thS = `padding:4px 6px;text-align:left;font-size:9px;font-weight:700;color:#6B705C;border-bottom:2px solid #F9F7F2;height:${TH_H}px;`;
    const tdS = `padding:3px 6px;border-bottom:1px solid #F9F7F2;font-size:10px;height:${ROW_H}px;`;
    const thead = `<thead><tr>
        <th ${S(thS)}>日期</th><th ${S(thS)}>體重</th><th ${S(thS)}>體脂</th>
        <th ${S(thS)}>內臟脂肪</th><th ${S(thS)}>骨骼肌率</th><th ${S(thS)}>腰圍</th>
    </tr></thead>`;

    for (let p = 0; p < tablePages; p++) {
        const chunk = logs.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
        const tbody = chunk.map(l => `<tr>
            <td ${S(tdS)}>${l.date.split('-').slice(1).join('/')}</td>
            <td ${S(tdS+'font-weight:700;color:#2D6A4F;')}>${l.w}kg</td>
            <td ${S(tdS+'color:#52B788;')}>${l.f||'--'}%</td>
            <td ${S(tdS)}>${l.v||'--'}</td>
            <td ${S(tdS)}>${l.m||'--'}%</td>
            <td ${S(tdS)}>${l.waist||'--'}cm</td>
        </tr>`).join('');

        const pageHtml = `
            ${headerHtml(2 + p, totalPages)}
            <div style="padding:${GAP}px ${PAD}px 0;">
                <div style="background:white;border-radius:14px;padding:${CARD_PAD}px;">
                    <table style="width:100%;border-collapse:collapse;">${thead}<tbody>${tbody}</tbody></table>
                </div>
            </div>`;

        await new Promise(r => setTimeout(r, 300)); // 避免同時觸發多個下載被瀏覽器阻擋
        triggerDownload(await renderA4Page(pageHtml), `減脂趨勢圖_${date}_p${2+p}.png`);
    }
}

// ────────────────────────────────────────────────────────────────
export function switchSecondaryChart(type) {
    setCurrentSecondaryType(type);
    const tabMap = { visceral: 'tab-v', muscle: 'tab-m', waist: 'tab-w' };
    ['tab-v', 'tab-m', 'tab-w'].forEach(id => {
        document.getElementById(id).classList.remove('tab-active');
        document.getElementById(id).classList.add('text-moss');
    });
    document.getElementById(tabMap[type]).classList.add('tab-active');
    document.getElementById(tabMap[type]).classList.remove('text-moss');
    document.dispatchEvent(new CustomEvent('app:update'));
}
