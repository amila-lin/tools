// 共用狀態：所有模組都從這裡讀取/寫入
export const appData = { plans: [] };

export const chartInstances = { main: null, secondary: null };

export let currentSecondaryType = 'visceral';
export let isEditingMode = false;
export let editingDate = null;

export function setCurrentSecondaryType(type) { currentSecondaryType = type; }
export function setIsEditingMode(val) { isEditingMode = val; }
export function setEditingDate(d) { editingDate = d; }
