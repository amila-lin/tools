function displayName(value, fallback) {
    const name = String(value ?? '').trim();
    return name && name !== 'undefined' ? name : fallback;
}

export function cardBank(card) {
    return displayName(card?.bank, '未知銀行');
}

export function cardName(card) {
    return displayName(card?.cardName, '未命名卡片');
}

export function cardLabel(card) {
    if (!card) return '未知卡片';
    return `${cardBank(card)} ${cardName(card)}`;
}
