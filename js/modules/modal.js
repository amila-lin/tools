// Modal 彈窗（無外部依賴）
export function openModal(title, content, confirmCallback, isHtml = false) {
    document.getElementById('modal-title').innerText = title;
    const container = document.getElementById('modal-body-container');
    if (isHtml) container.innerHTML = content;
    else container.innerHTML = `<p class="text-moss text-sm">${content}</p>`;
    const confirmBtn = document.getElementById('modal-confirm-btn');
    confirmBtn.onclick = () => { confirmCallback(); closeModal(); };
    document.getElementById('custom-modal-overlay').classList.replace('hidden', 'flex');
}

export function closeModal() {
    document.getElementById('custom-modal-overlay').classList.replace('flex', 'hidden');
}
