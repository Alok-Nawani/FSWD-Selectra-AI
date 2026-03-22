import { initLearning } from './modules/learning.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('TM3: Learning Hub Bootstrapping...');

    // No auth for now or keep it simple
    initLearning();
});
