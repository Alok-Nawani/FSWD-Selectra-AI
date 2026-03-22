import { initNavigation } from './modules/navigation.js';
import { initResume } from './modules/resume.js';
import { ensureAuth, logout } from './modules/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('TM2: Resume Analysis & Auth Bootstrapping...');

    const user = ensureAuth();
    if (!user) return;

    initNavigation();
    initResume();

    // Logout Handler
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
});
