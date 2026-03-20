import { appData } from './state.js';
import { saveData } from './data.js';
import { getActivePlan } from './plans.js';

function getBmiLabel(bmi) {
    if (bmi < 18.5) return { label: '過輕', color: 'text-blue-500' };
    if (bmi < 24)   return { label: '正常', color: 'text-primary' };
    if (bmi < 27)   return { label: '過重', color: 'text-yellow-500' };
    return              { label: '肥胖', color: 'text-danger' };
}

function getFatLabel(fat, gender) {
    if (gender === 'male') {
        if (fat < 10)  return { label: '過低', color: 'text-blue-500' };
        if (fat < 20)  return { label: '標準', color: 'text-primary' };
        if (fat < 25)  return { label: '偏高', color: 'text-yellow-500' };
        return              { label: '肥胖', color: 'text-danger' };
    } else {
        if (fat < 20)  return { label: '過低', color: 'text-blue-500' };
        if (fat < 30)  return { label: '標準', color: 'text-primary' };
        if (fat < 35)  return { label: '偏高', color: 'text-yellow-500' };
        return              { label: '肥胖', color: 'text-danger' };
    }
}

const TIPS = {
    '過輕': {
        diet:     '增加每日熱量攝取，優先補充優質蛋白質（雞蛋、豆類、魚肉），搭配複合碳水化合物（糙米、燕麥）穩定提升體重。',
        exercise: '以阻力訓練（重訓）為主，每週 3 次以上，搭配適量有氧，幫助增加肌肉量而非單純增加脂肪。',
        caution:  '避免以高糖、高脂垃圾食物衝熱量；過輕者骨密度偏低風險較高，建議補充鈣質與維生素 D。',
        link:     { text: '衛福部：健康體重管理', url: 'https://www.hpa.gov.tw/Pages/List.aspx?nodeid=189' }
    },
    '正常': {
        diet:     '維持均衡飲食原則：蔬果佔餐盤一半，蛋白質佔四分之一，全穀類佔四分之一，適量攝取健康脂肪。',
        exercise: '有氧與阻力訓練交替進行，每週至少 150 分鐘中強度運動，有助維持肌肉量與代謝率。',
        caution:  '定期量測體重、腰圍，預防因生活習慣改變導致的體重漂移；每年安排一次健康檢查。',
        link:     { text: '國健署：我的餐盤', url: 'https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=542&pid=9823' }
    },
    '過重': {
        diet:     '減少精緻澱粉（白飯、麵包、糖飲），增加蔬菜與膳食纖維比例，採用「先菜後飯」進食順序降低血糖波動。',
        exercise: '每週至少 150 分鐘中強度有氧（快走、騎車、游泳），搭配每週 2 次阻力訓練提升基礎代謝。',
        caution:  '過重者罹患高血壓、高血糖風險上升，建議定期量測血壓，並在健檢時加驗血糖與血脂。',
        link:     { text: '國健署：體重管理', url: 'https://www.hpa.gov.tw/Pages/List.aspx?nodeid=189' }
    },
    '肥胖': {
        diet:     '採用熱量赤字飲食（每日少攝取 300–500 大卡），優先選擇低 GI 食物，戒除含糖飲料與加工食品。',
        exercise: '從低衝擊運動開始（健走、水中運動、騎固定式單車），保護關節同時燃燒熱量，逐步增加強度。',
        caution:  '肥胖與多種慢性疾病高度相關，強烈建議諮詢醫師或營養師制定個人化計畫，評估是否有代謝症候群。',
        link:     { text: '衛福部：肥胖防治', url: 'https://www.hpa.gov.tw/Pages/List.aspx?nodeid=189' }
    }
};

function getTips(bmiLabel) {
    return TIPS[bmiLabel] || null;
}

function getMacros(w, h, age, gender, bmiLabel) {
    const bmr = Math.round(
        gender === 'male'
            ? 10 * w + 6.25 * h - 5 * age + 5
            : 10 * w + 6.25 * h - 5 * age - 161
    );

    const proteinCoef = { '過輕': [1.6, 2.0], '正常': [1.2, 1.6], '過重': [1.2, 1.5], '肥胖': [1.2, 1.5] };
    const [pMin, pMax] = proteinCoef[bmiLabel] || [1.2, 1.6];
    const proteinMin = Math.round(w * pMin);
    const proteinMax = Math.round(w * pMax);

    const fiberMin = gender === 'male' ? 25 : 25;
    const fiberMax = gender === 'male' ? 35 : 30;

    const carbRatio = (bmiLabel === '正常' || bmiLabel === '過輕') ? [0.50, 0.60] : [0.40, 0.50];
    const carbsMin  = Math.round(bmr * carbRatio[0] / 4);
    const carbsMax  = Math.round(bmr * carbRatio[1] / 4);

    return { bmr, proteinMin, proteinMax, fiberMin, fiberMax, carbsMin, carbsMax };
}

export function renderProfile() {
    const p = appData.profile;

    // 性別 toggle
    document.getElementById('profile-gender-female').classList.toggle('bg-primary', p.gender === 'female');
    document.getElementById('profile-gender-female').classList.toggle('text-white', p.gender === 'female');
    document.getElementById('profile-gender-male').classList.toggle('bg-primary', p.gender === 'male');
    document.getElementById('profile-gender-male').classList.toggle('text-white', p.gender === 'male');

    // 基本資訊欄位
    document.getElementById('profile-height').value = p.height || '';
    document.getElementById('profile-age').value    = p.age    || '';

    // 數據欄位
    document.getElementById('profile-w').value = p.w || '';
    document.getElementById('profile-f').value = p.f || '';
    document.getElementById('profile-v').value = p.v || '';

    // 有紀錄才顯示同步按鈕
    const plan   = getActivePlan();
    const latest = plan && plan.logs.length > 0 ? plan.logs[0] : null;
    document.getElementById('profile-sync-btn').classList.toggle('hidden', !latest);

    // 體型評估
    if (!p.height || !p.w) {
        document.getElementById('profile-assessment').innerHTML =
            '<p class="text-center text-moss text-sm italic py-2">請填寫身高與體重以顯示評估結果</p>';
        return;
    }

    const heightM = p.height / 100;
    const bmi     = (p.w / (heightM * heightM)).toFixed(1);
    const bmiInfo = getBmiLabel(parseFloat(bmi));
    const fatInfo = p.f ? getFatLabel(p.f, p.gender) : null;

    const tips   = getTips(bmiInfo.label);
    const macros = p.age ? getMacros(p.w, p.height, p.age, p.gender, bmiInfo.label) : null;
    document.getElementById('profile-assessment').innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between bg-oatmeal p-4 rounded-2xl">
                <div>
                    <div class="text-[10px] text-moss font-bold">BMI 指數</div>
                    <div class="text-2xl font-bold text-primary-dark mt-0.5">${bmi}</div>
                </div>
                <div class="text-right">
                    <span class="text-lg font-black ${bmiInfo.color}">${bmiInfo.label}</span>
                    <div class="text-[10px] text-moss mt-1">台灣衛福部標準</div>
                </div>
            </div>
            ${fatInfo ? `
            <div class="flex items-center justify-between bg-oatmeal p-4 rounded-2xl">
                <div>
                    <div class="text-[10px] text-moss font-bold">體脂率</div>
                    <div class="text-2xl font-bold text-primary-dark mt-0.5">${p.f}<span class="text-sm font-normal text-moss ml-0.5">%</span></div>
                </div>
                <div class="text-right">
                    <span class="text-lg font-black ${fatInfo.color}">${fatInfo.label}</span>
                    <div class="text-[10px] text-moss mt-1">${p.gender === 'male' ? '男性標準' : '女性標準'}</div>
                </div>
            </div>` : ''}
            ${macros ? `
            <div class="mt-2 space-y-2">
                <div class="text-[10px] font-black text-moss uppercase tracking-wide pt-1">每日建議攝取</div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-oatmeal p-3 rounded-2xl text-center">
                        <div class="text-[10px] text-moss font-bold mb-1">🔥 基礎代謝</div>
                        <div class="text-base font-black text-primary-dark">${macros.bmr}<span class="text-[10px] font-normal text-moss ml-0.5">kcal</span></div>
                    </div>
                    <div class="bg-oatmeal p-3 rounded-2xl text-center">
                        <div class="text-[10px] text-moss font-bold mb-1">🥩 蛋白質</div>
                        <div class="text-base font-black text-primary-dark">${macros.proteinMin}–${macros.proteinMax}<span class="text-[10px] font-normal text-moss ml-0.5">g</span></div>
                    </div>
                    <div class="bg-oatmeal p-3 rounded-2xl text-center">
                        <div class="text-[10px] text-moss font-bold mb-1">🥦 膳食纖維</div>
                        <div class="text-base font-black text-primary-dark">${macros.fiberMin}–${macros.fiberMax}<span class="text-[10px] font-normal text-moss ml-0.5">g</span></div>
                    </div>
                    <div class="bg-oatmeal p-3 rounded-2xl text-center">
                        <div class="text-[10px] text-moss font-bold mb-1">🍚 醣類</div>
                        <div class="text-base font-black text-primary-dark">${macros.carbsMin}–${macros.carbsMax}<span class="text-[10px] font-normal text-moss ml-0.5">g</span></div>
                    </div>
                </div>
            </div>` : ''}
            ${tips ? `
            <div class="mt-2 space-y-2">
                <div class="text-[10px] font-black text-moss uppercase tracking-wide pt-1">健康建議</div>
                <div class="bg-oatmeal p-4 rounded-2xl space-y-3 text-[12px] text-primary-dark">
                    <div><span class="font-bold text-primary">🥗 飲食</span><p class="mt-1 text-moss leading-relaxed">${tips.diet}</p></div>
                    <div><span class="font-bold text-primary">🏃 運動</span><p class="mt-1 text-moss leading-relaxed">${tips.exercise}</p></div>
                    <div><span class="font-bold text-primary">⚠️ 注意</span><p class="mt-1 text-moss leading-relaxed">${tips.caution}</p></div>
                    <a href="${tips.link.url}" target="_blank" rel="noopener"
                        class="inline-block mt-1 text-accent font-bold underline underline-offset-2">${tips.link.text} →</a>
                </div>
            </div>` : ''}
        </div>
    `;
}

export function saveProfile() {
    const gender = appData.profile.gender;
    const height = parseFloat(document.getElementById('profile-height').value) || 0;
    const age    = parseInt(document.getElementById('profile-age').value)       || 0;
    const w      = parseFloat(document.getElementById('profile-w').value)       || 0;
    const f      = parseFloat(document.getElementById('profile-f').value)       || 0;
    const v      = parseFloat(document.getElementById('profile-v').value)       || 0;
    appData.profile = { gender, height, age, w, f, v };
    saveData();
    renderProfile();
}

export function setProfileGender(gender) {
    appData.profile.gender = gender;
    renderProfile();
}

export function syncLatestLog() {
    const plan   = getActivePlan();
    const latest = plan && plan.logs.length > 0 ? plan.logs[0] : null;
    if (!latest) return;
    appData.profile.height = parseFloat(document.getElementById('profile-height').value) || appData.profile.height;
    appData.profile.age    = parseInt(document.getElementById('profile-age').value)       || appData.profile.age;
    appData.profile.w = latest.w || 0;
    appData.profile.f = latest.f || 0;
    appData.profile.v = latest.v || 0;
    saveData();
    renderProfile();
}
