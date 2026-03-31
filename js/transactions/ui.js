const PAGES = ['dashboard', 'log', 'management'];
const PAGE_IDX = { dashboard: 0, log: 1, management: 2 };

export function switchPage(pageId) {
    PAGES.forEach(p => {
        document.getElementById('page-' + p).classList.toggle('hidden', p !== pageId);
    });

    const navItems = document.querySelectorAll('.nav-item');
    const idx = PAGE_IDX[pageId] ?? 0;
    navItems.forEach((btn, i) => {
        if (i === idx) {
            btn.classList.add('text-primary', 'font-black', 'bg-primary/10', 'rounded-2xl', 'px-3', 'py-1.5');
            btn.classList.remove('text-slate-400', 'font-bold');
        } else {
            btn.classList.remove('text-primary', 'font-black', 'bg-primary/10', 'rounded-2xl', 'px-3', 'py-1.5');
            btn.classList.add('text-slate-400/60', 'font-bold');
        }
    });

    history.replaceState(null, '', `#${pageId}`);
}

export function openModal(title, message, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-overlay').classList.remove('hidden');

    const old = document.getElementById('modal-confirm');
    const fresh = old.cloneNode(true);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', () => { closeModal(); onConfirm(); });
}

export function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}
