import { initNavigation } from './modules/navigation.js';
import { initDashboard } from './modules/dashboard.js';
import { initLearning } from './modules/learning.js';
import { initInterview } from './modules/interview.js';
import { initArena } from './modules/arena.js';
import { initResume } from './modules/resume.js';
import { ensureAuth, logout, getCurrentUser } from './modules/auth.js';
import { initWellness } from './modules/wellness.js';
import { initMockTest } from './modules/mocktest.js';
import { initPlanner } from './modules/planner.js';
import { initLeaderboard } from './modules/leaderboard.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Bootstrapping Selectra AI...');

    // Auth Check
    const user = await ensureAuth();
    if (!user) return; // ensureAuth redirects

    // Populate User Info
    const nameDisplay = document.getElementById('user-name-display');
    const avatarImg = document.getElementById('user-avatar-img');
    if (nameDisplay) nameDisplay.innerText = user.name;
    if (avatarImg) avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;

    // Logout Handler
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    initNavigation();
    
    // Set Initial Theme Context
    const firstActiveSection = document.querySelector('main section:not(.hidden)');
    if (firstActiveSection) document.body.dataset.page = firstActiveSection.id;
    const modules = [
        { name: 'Dashboard', init: initDashboard },
        { name: 'Learning', init: initLearning },
        { name: 'Interview', init: initInterview },
        { name: 'Arena', init: initArena },
        { name: 'Resume', init: initResume },
        { name: 'Wellness', init: initWellness },
        { name: 'MockTest', init: initMockTest },
        { name: 'Planner', init: initPlanner },
        { name: 'Leaderboard', init: initLeaderboard }
    ];

    modules.forEach(m => {
        try {
            m.init();
            console.log(`Initialized module: ${m.name}`);
        } catch (err) {
            console.error(`Failed to initialize module ${m.name}:`, err);
        }
    });

    // Theme Toggle Logic
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }

    // Listen for navigation changes to trigger specific module logic
    window.addEventListener('section-changed', (e) => {
        const sectionId = e.detail.targetId;
        console.log(`Switched to: ${sectionId}`);

        if (sectionId === 'coding-arena') {
            // Maybe refresh CodeMirror
            initArena();
        }
    });
});
