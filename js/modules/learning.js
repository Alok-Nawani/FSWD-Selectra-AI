import { fetchData } from '../utils.js';

let currentModuleId = null;
let currentQuiz = [];
let currentQuestionIdx = 0;
let userAnswers = [];

export function initLearning() {
    console.log('Initializing Learning Hub');

    // Explicitly bind openModule to buttons to fix scope issues
    const moduleButtons = document.querySelectorAll('button[onclick^="openModule"]');
    moduleButtons.forEach(btn => {
        const onClickAttr = btn.getAttribute('onclick');
        // Extract module ID from onclick="openModule('id')"
        const match = onClickAttr.match(/openModule\('([^']+)'\)/);
        if (match && match[1]) {
            const moduleId = match[1];
            btn.onclick = (e) => {
                e.preventDefault();
                console.log('Opening module via listener:', moduleId);
                openModule(moduleId);
            };
        }
    });

    setupEvents();
    setupEvents();
    window.openModule = openModule; // Keep for backup
    window.startQuiz = startQuiz;
    window.quitQuiz = quitQuiz;
    window.nextQuestion = nextQuestion;
    window.prevQuestion = prevQuestion;

    // Update Hub UI on init
    updateHubCards();
}

// Function to update static Hub Cards with dynamic progress
function updateHubCards() {
    // Config for max videos (Same as dashboard)
    const moduleMax = {
        'dsa': 30, 'dbms': 30, 'os': 30, 'cn': 30, 'oop': 30, 'ai': 23, 'ml': 23, 'aptitude': 15, 'grammar': 15, 'webdev': 30
    };

    const cards = document.querySelectorAll('.module-card');
    cards.forEach(card => {
        const btn = card.querySelector('button');
        if (!btn) return;

        const onClickAttr = btn.getAttribute('onclick');
        const match = onClickAttr ? onClickAttr.match(/openModule\('([^']+)'\)/) : null;

        if (match && match[1]) {
            const modId = match[1];
            const current = userProgress[modId] || 0;
            const max = moduleMax[modId] || 30;
            const percent = Math.min(100, Math.round((current / max) * 100));

            // Update Bar
            const fill = card.querySelector('.fill');
            const text = card.querySelector('.progress-text');

            if (fill) fill.style.width = `${percent}%`;
            if (text) text.innerText = `${percent}% Completed`;

            // Update Button Text
            if (percent > 0) btn.innerText = "Continue Learning";
            else btn.innerText = "Start Module";
        }
    });
}

function setupEvents() {
    const generateNotesBtn = document.getElementById('generate-assignment-btn');
    const takeQuizBtn = document.getElementById('take-quiz-btn');
    const quitQuizBtn = document.getElementById('quit-quiz');
    const nextQBtn = document.getElementById('next-question');

    if (generateNotesBtn) generateNotesBtn.addEventListener('click', generateNotes);
    if (takeQuizBtn) takeQuizBtn.addEventListener('click', startQuiz);
    if (quitQuizBtn) quitQuizBtn.addEventListener('click', quitQuiz);
    if (nextQBtn) nextQBtn.addEventListener('click', nextQuestion);

    // Module Back button
    const backHub = document.getElementById('back-to-hub');
    if (backHub) {
        backHub.addEventListener('click', () => {
            document.getElementById('module-detail').classList.add('hidden');
            document.getElementById('learning').classList.remove('hidden');
            // reset video
            const v = document.getElementById('module-video');
            if (v) v.src = "";
        });
    }
}

import { getProgress, saveProgress as saveAuthProgress } from './auth.js';

// User Progress (Fetched from Auth Module)
let userProgress = {};

// Initialize local tracking from auth store
const progressData = getProgress();
if (progressData && progressData.courseProgress) {
    userProgress = progressData.courseProgress;
}

function saveProgress() {
    saveAuthProgress({ courseProgress: userProgress });
    updateHubCards();
}

// Content for unlocked sections
const playlistConfig = {
    'dsa': { url: 'https://www.youtube.com/embed?list=PLfqMhTWNBTe137I_EPQd34TsgV6IO55pt', counts: { intro: 0, core: 10, advanced: 20 } },
    'dbms': { url: 'https://www.youtube.com/embed?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y', counts: { intro: 0, core: 10, advanced: 20 } },
    'os': { url: 'https://www.youtube.com/embed?list=PLevuEtnAdteQGUlTCdh9a1Q4zN-_hxJQl', counts: { intro: 0, core: 10, advanced: 20 } },
    'cn': { url: 'https://www.youtube.com/embed?list=PLBlnK6fEyqRgMCUAG0XRw78UA8qnv6jEx', counts: { intro: 0, core: 10, advanced: 20 } },
    'oop': { url: 'https://www.youtube.com/embed?list=PLQEaRBV9gAFujcBWJhBT2XXsuMlIfETBy', counts: { intro: 0, core: 10, advanced: 20 } },
    'aptitude': { url: 'https://www.youtube.com/embed?list=PL8p2I9GklV454LdGfDOw0KkNazKuA-6B2', counts: { intro: 0, core: 5, advanced: 10 } },
    'grammar': { url: 'https://www.youtube.com/embed?list=PL1zxEeUFe9lcIEWJWqykZiCyVSlYbsi0o', counts: { intro: 0, core: 5, advanced: 10 } },
    'ai': { url: 'https://www.youtube.com/embed?list=PLxCzCOWd7aiHGhOHV-nwb0HR5US5GFKFI', counts: { intro: 0, core: 8, advanced: 15 } },
    'ml': { url: 'https://www.youtube.com/embed?list=PLxCzCOWd7aiEXg5BV10k9THtjnS48yI-T', counts: { intro: 0, core: 8, advanced: 15 } },
    'webdev': { url: 'https://www.youtube.com/embed?list=PLfqMhTWNBTe0PY9xunOzsP5kmYIz2Hu7i', counts: { intro: 0, core: 10, advanced: 20 } }
};

let watchTimer = null;

async function openModule(moduleId) {
    currentModuleId = moduleId;
    if (watchTimer) clearTimeout(watchTimer);

    // Default to 0 progress if new
    if (!userProgress[moduleId]) userProgress[moduleId] = 0;

    // Initial Load (Introduction)
    loadSection(moduleId, 'intro');

    // Switch View
    document.getElementById('learning').classList.add('hidden');
    document.getElementById('module-detail').classList.remove('hidden');

    // Update Locks
    updateModuleLocks();

    // Start Watch Timer
    startWatchTimer(moduleId);
}

function loadSection(moduleId, section) {
    const config = playlistConfig[moduleId];
    if (!config) return;

    const titleMap = {
        'dsa': 'Data Structures & Algorithms',
        'oop': 'Object Oriented Programming',
        'system-design': 'System Design',
        'dbms': 'Database Management',
        'os': 'Operating Systems',
        'cn': 'Computer Networks',
        'ai': 'Artificial Intelligence',
        'ml': 'Machine Learning',
        'webdev': 'Web Development',
        'aptitude': 'Aptitude & Logical Reasoning',
        'grammar': 'Verbal Ability & Grammar'
    };

    // We already have the elements, let's update them
    const moduleMain = document.querySelector('.module-main');

    // Base URL often has query params
    let videoUrl = config.url;
    let startIdx = 1; // Default

    // YouTube playlist index parameter is 1-based
    if (section === 'intro') startIdx = config.counts.intro + 1;
    if (section === 'core') startIdx = config.counts.core + 1;
    if (section === 'advanced') startIdx = config.counts.advanced + 1;

    // Append Index
    const sep = videoUrl.includes('?') ? '&' : '?';
    videoUrl += `${sep}index=${startIdx}`;

    moduleMain.innerHTML = `
        <div class="module-header-content">
            <h2 id="module-title">${titleMap[moduleId] || 'Module'} - ${section.charAt(0).toUpperCase() + section.slice(1)}</h2>
            <p class="text-gray-400 mb-4">Watch videos starting from #${startIdx} to complete this section.</p>
        </div>

        <div class="video-wrapper">
             <iframe id="module-video" src="${videoUrl}" frameborder="0" allowfullscreen style="width:100%; height:100%;"></iframe>
        </div>

        <div class="module-actions">
            <button class="btn-primary" id="generate-assignment-btn"><i class="fa-solid fa-external-link-alt"></i> Open GFG Notes</button>
            <button class="btn-secondary" id="take-quiz-btn"><i class="fa-solid fa-bolt"></i> Take Quiz</button>
        </div>
    `;

    // Re-bind
    const noteBtn = document.getElementById('generate-assignment-btn');
    const quizBtn = document.getElementById('take-quiz-btn');
    if (noteBtn) noteBtn.onclick = generateNotes;
    if (quizBtn) quizBtn.onclick = startQuiz;
}

function startWatchTimer(moduleId) {
    if (watchTimer) clearInterval(watchTimer); // Changed to Interval

    // Auto-Progress Simulation
    watchTimer = setInterval(() => {
        // If module closed, stop
        if (document.getElementById('learning').classList.contains('hidden') === false) {
            clearInterval(watchTimer);
            return;
        }

        userProgress[moduleId] = (userProgress[moduleId] || 0) + 1;
        saveProgress();
        updateModuleLocks();

        // Toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-600/90 backdrop-blur text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-500 translate-y-20';
        toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> Progress: ${userProgress[moduleId]} videos watched`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('translate-y-20'));
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3000);

    }, 10000);
}

function updateModuleLocks() {
    const watched = userProgress[currentModuleId] || 0;
    const config = playlistConfig[currentModuleId];
    if (!config) return;

    const sidebarItems = document.querySelectorAll('.module-topic-list li');

    // Thresholds
    const limits = [0, config.counts.core, config.counts.advanced, 30];

    sidebarItems.forEach((item, index) => {
        item.classList.remove('active', 'locked', 'unlocked');
        const icon = item.querySelector('i');
        const isLocked = watched < limits[index];

        if (isLocked) {
            item.classList.add('locked');
            if (icon) icon.className = 'fa-solid fa-lock';
            item.onclick = (e) => {
                e.preventDefault();
                alert(`Locked! You need to watch ${limits[index]} videos. Current: ${watched}`);
            };
        } else {
            item.classList.add('unlocked');
            if (icon) icon.className = 'fa-solid fa-unlock';

            item.onclick = () => {
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                if (index === 0) loadSection(currentModuleId, 'intro');
                else if (index === 1) loadSection(currentModuleId, 'core');
                else if (index === 2) loadSection(currentModuleId, 'advanced');
                else if (index === 3) loadPracticeQuestions(currentModuleId);
            };
        }
    });
}

async function loadPracticeQuestions(moduleId) {
    const main = document.querySelector('.module-main');
    main.innerHTML = `<div class="p-8 text-center"><i class="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500"></i><p class="mt-4">Loading Practice Problems...</p></div>`;

    try {
        const data = await fetchData(`data/learning/quizzes/${moduleId}.json`);
        // Fallback for smaller datasets
        if (!data || data.length === 0) {
            main.innerHTML = `<div class="p-8 text-center text-gray-400">No practice problems found.</div>`;
            return;
        }

        const questions = data.slice(0, 30);
        const sections = {
            'Easy': questions.slice(0, 10),
            'Medium': questions.slice(10, 20),
            'Hard': questions.slice(20, 30)
        };

        // Header with Score
        let html = `
            <div class="sticky top-0 bg-[#0f172a] z-10 py-4 border-b border-gray-700 mb-6 flex justify-between items-center pr-4">
                <div>
                    <h2 class="text-2xl font-bold text-white">Practice Problems</h2>
                    <p class="text-sm text-gray-400">Section-wise Mastery • total 30 Questions</p>
                </div>
                <div class="flex items-center gap-4 bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-500/30">
                     <div class="text-right">
                        <p class="text-xs text-gray-400">Your Score</p>
                        <p class="text-xl font-bold text-blue-400" id="practice-score">0 / 30</p>
                    </div>
                    <i class="fa-solid fa-trophy text-yellow-500 text-2xl"></i>
                </div>
            </div>
            <div class="space-y-8 pb-10 custom-scrollbar overflow-y-auto" style="height: calc(100vh - 250px);">
        `;

        let qIndex = 0;
        for (const [level, qs] of Object.entries(sections)) {
            if (qs.length === 0) continue;

            // Section Header
            const color = level === 'Easy' ? 'text-green-400' : level === 'Medium' ? 'text-yellow-400' : 'text-red-400';
            html += `
                <div class="mb-6">
                    <h3 class="text-xl font-bold ${color} mb-4 border-l-4 ${level === 'Easy' ? 'border-green-500' : level === 'Medium' ? 'border-yellow-500' : 'border-red-500'} pl-3">${level} Level</h3>
                    <div class="space-y-6">
            `;

            qs.forEach((q) => {
                qIndex++;
                const uniqueId = `q-${qIndex}`;
                html += `
                    <div class="card p-6 border border-gray-700/50 relative group" id="card-${uniqueId}">
                        <div class="flex justify-between items-start mb-4">
                            <p class="font-semibold text-lg text-gray-200"><span class="text-blue-400 mr-2">Q${qIndex}.</span> ${q.question}</p>
                            <span class="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 border border-gray-700">${level}</span>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-3 mb-4 options-container" id="opts-${uniqueId}">
                             ${q.options.map((opt, i) => `
                                <label class="flex items-center p-3 rounded border border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-all">
                                    <input type="radio" name="${uniqueId}" value="${i}" class="mr-3 w-4 h-4 text-blue-500 focus:ring-blue-500 bg-gray-700 border-gray-600">
                                    <span class="text-sm text-gray-300">${opt}</span>
                                </label>
                             `).join('')}
                        </div>

                        <div class="flex justify-between items-center pt-4 border-t border-gray-700/50">
                            <button class="btn-primary text-sm px-4 py-1.5" onclick="checkAnswer('${uniqueId}', ${q.answerIndex})">Check Answer</button>
                            <div id="feedback-${uniqueId}" class="hidden text-sm font-medium"></div>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`; // Close Section
        }

        html += `</div>`;
        main.innerHTML = html;

        // Attach function to window so onclick works
        window.checkAnswer = (id, correctIdx) => {
            const selected = document.querySelector(`input[name="${id}"]:checked`);
            const feedback = document.getElementById(`feedback-${id}`);
            const card = document.getElementById(`card-${id}`);
            const opts = document.getElementById(`opts-${id}`).querySelectorAll('label');

            if (!selected) {
                alert("Please select an option!");
                return;
            }

            const userIdx = parseInt(selected.value);
            const isCorrect = userIdx === correctIdx;

            // Update UI
            if (isCorrect) {
                feedback.innerHTML = `<span class="text-green-400"><i class="fa-solid fa-check-circle"></i> Correct!</span>`;
                feedback.classList.remove('hidden');
                card.classList.add('border-green-500/50');

                // Update Score
                updateScore();
            } else {
                feedback.innerHTML = `<span class="text-red-400"><i class="fa-solid fa-times-circle"></i> Incorrect. Correct: Option ${correctIdx + 1}</span>`;
                feedback.classList.remove('hidden');
                card.classList.add('border-red-500/50');
            }

            // Disable all inputs in this card
            opts.forEach(l => {
                const inp = l.querySelector('input');
                inp.disabled = true;
                if (parseInt(inp.value) === correctIdx) l.classList.add('bg-green-900/20', 'border-green-500/50');
                else if (parseInt(inp.value) === userIdx && !isCorrect) l.classList.add('bg-red-900/20', 'border-red-500/50');
            });

            // Disable button
            card.querySelector('button').disabled = true;
            card.querySelector('button').classList.add('opacity-50', 'cursor-not-allowed');
        };

        let currentScore = 0;
        function updateScore() {
            currentScore++;
            const scoreEl = document.getElementById('practice-score');
            if (scoreEl) scoreEl.innerText = `${currentScore} / 30`;
        }

    } catch (e) {
        console.error(e);
        main.innerHTML = `<div class="p-8 text-center text-red-400">Error loading questions.</div>`;
    }
}



async function generateNotes() {
    if (!currentModuleId) return;
    // Map module ID to GFG Link (using the content from getGFGLinks which had links)
    // Since getGFGLinks returned HTML string of links, I'll just open the main topic link for now or reusing existing logic
    // Actually, user said Redirecting is better. 

    const gfgBase = "https://www.geeksforgeeks.org/";
    const topicMap = {
        'dsa': 'data-structures/',
        'dbms': 'dbms/',
        'os': 'operating-systems/',
        'cn': 'computer-network-tutorials/',
        'oop': 'object-oriented-programming-oops-concept-in-java/',
        'aptitude': 'aptitude-questions-and-answers/',
        'grammar': 'verbal-ability/'
    };

    const url = gfgBase + (topicMap[currentModuleId] || "");
    window.open(url, '_blank');
}

// Helper to get links (Kept for reference or if we want to show a list dialog instead)
function getGFGLinks(id) {
    // ... kept as is or redundant now ...
    return "";
}

async function startQuiz() {
    if (!currentModuleId) return;

    try {
        const data = await fetchData(`../data/learning/quizzes/${currentModuleId}.json`);
        if (!data || data.length === 0) {
            alert("No quiz available for this module.");
            return;
        }

        // Shuffle questions and select 20
        let selectedQuestions = data.sort(() => 0.5 - Math.random()).slice(0, 20);

        // SHUFFLE OPTIONS
        currentQuiz = selectedQuestions.map(q => {
            const currentOptions = [...q.options];
            const correctAnswerText = currentOptions[q.answerIndex];
            const shuffledOptions = currentOptions.sort(() => Math.random() - 0.5);
            const newAnswerIndex = shuffledOptions.indexOf(correctAnswerText);

            return {
                question: q.question,
                options: shuffledOptions,
                answerIndex: newAnswerIndex
            };
        });

        currentQuestionIdx = 0;
        userAnswers = new Array(currentQuiz.length).fill(null);

        // Switch to Quiz Interface
        const quizInterface = document.getElementById('quiz-interface');
        quizInterface.classList.remove('hidden');
        document.getElementById('module-detail').classList.add('hidden');

        // ALWAYS Rebuild Quiz UI to ensure consistency
        const quizContainer = document.querySelector('.quiz-container');
        quizContainer.innerHTML = `
            <div class="quiz-header">
                <div>
                    <h3 id="quiz-topic">Topic Name</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">Test your knowledge</p>
                </div>
                <span class="quiz-progress" id="quiz-progress">Question 1/20</span>
            </div>
            
            <div class="question-box">
                <p id="quiz-question" style="min-height: 60px;">Loading Question...</p>
            </div>
            
            <div class="options-grid" id="quiz-options">
                <!-- Options injected here -->
            </div>
            
            <div class="quiz-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; gap: 1rem;">
                <button class="btn-secondary" id="quit-quiz" style="border-color: var(--color-error); color: var(--color-error);">
                    <i class="fa-solid fa-power-off"></i> Quit
                </button>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-secondary" id="prev-question" disabled>
                        <i class="fa-solid fa-arrow-left"></i> Previous
                    </button>
                    <button class="btn-primary" id="next-question" style="visibility: hidden;">
                        Next <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Re-bind events
        document.getElementById('quit-quiz').addEventListener('click', quitQuiz);
        document.getElementById('next-question').addEventListener('click', nextQuestion);
        document.getElementById('prev-question').addEventListener('click', prevQuestion);

        loadQuizQuestion(0);

    } catch (e) {
        console.error(e);
        alert("Error loading quiz.");
    }
}

function loadQuizQuestion(index) {
    if (index >= currentQuiz.length) {
        finishQuiz();
        return;
    }

    const q = currentQuiz[index];
    document.getElementById('quiz-topic').innerText = `Question ${index + 1}/${currentQuiz.length}`;
    document.getElementById('quiz-progress').innerText = `${Math.round(((index + 1) / currentQuiz.length) * 100)}% Complete`;
    document.getElementById('quiz-question').innerText = q.question;

    const optsContainer = document.getElementById('quiz-options');
    optsContainer.innerHTML = '';

    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (userAnswers[index] === i) btn.classList.add('selected'); // Persist selection
        btn.innerText = opt;
        btn.onclick = () => selectAnswer(i, btn);
        optsContainer.appendChild(btn);
    });

    // Update Buttons
    const prevBtn = document.getElementById('prev-question');
    const nextBtn = document.getElementById('next-question');

    if (prevBtn) {
        prevBtn.disabled = index === 0;
        prevBtn.style.opacity = index === 0 ? '0.5' : '1';
        prevBtn.style.cursor = index === 0 ? 'not-allowed' : 'pointer';
    }

    if (nextBtn) {
        // Only show Next if answer selected OR if it's not the last question (allow skip? Logic says select first)
        // User logic: "Hide Next until selected" in previous code.
        // But if user goes BACK, they might have an answer selected.
        if (userAnswers[index] !== null && userAnswers[index] !== undefined) {
            nextBtn.style.visibility = 'visible';
        } else {
            nextBtn.style.visibility = 'hidden';
        }

        // Change text on last question
        if (index === currentQuiz.length - 1) {
            nextBtn.innerHTML = 'Finish <i class="fa-solid fa-check"></i>';
        } else {
            nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
        }
    }
}

function selectAnswer(optionIdx, btnElement) {
    // Visual selection
    const container = document.getElementById('quiz-options');
    container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');

    // Save answer
    userAnswers[currentQuestionIdx] = optionIdx;

    // Show Next
    document.getElementById('next-question').style.visibility = 'visible';
}

function nextQuestion() {
    currentQuestionIdx++;
    loadQuizQuestion(currentQuestionIdx);
}

function prevQuestion() {
    if (currentQuestionIdx > 0) {
        currentQuestionIdx--;
        loadQuizQuestion(currentQuestionIdx);
    }
}

function finishQuiz() {
    let score = 0;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    const total = currentQuiz.length;

    // Calculate Score & Build Review HTML
    // Using inline styles for reviews to correspond to app theme
    let reviewHTML = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

    currentQuiz.forEach((q, i) => {
        const userAnswerIdx = userAnswers[i];
        const isCorrect = userAnswerIdx === q.answerIndex;
        const isSkipped = userAnswerIdx === null || userAnswerIdx === undefined;

        if (isCorrect) {
            score++;
            correct++;
        } else if (isSkipped) {
            skipped++;
        } else {
            incorrect++;
        }

        const userText = !isSkipped ? q.options[userAnswerIdx] : "Skipped";
        const correctText = q.options[q.answerIndex];

        const borderColor = isCorrect ? 'var(--color-success)' : 'var(--color-error)';
        const bgTint = isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const icon = isCorrect
            ? '<i class="fa-solid fa-circle-check" style="color: var(--color-success);"></i>'
            : '<i class="fa-solid fa-circle-xmark" style="color: var(--color-error);"></i>';

        reviewHTML += `
            <div style="padding: 1rem; border-radius: 8px; border: 1px solid ${borderColor}; background: ${bgTint};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <p style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Q${i + 1}: ${q.question}</p>
                    <div style="margin-left: 1rem; font-size: 1.2rem;">${icon}</div>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">
                    <p style="margin-bottom: 0.25rem;">
                        <span style="color: ${isCorrect ? 'var(--color-success)' : 'var(--color-error)'}; font-weight: 500;">Your Answer:</span> ${userText}
                    </p>
                    ${!isCorrect ? `<p><span style="color: var(--color-success); font-weight: 500;">Correct Answer:</span> ${correctText}</p>` : ''}
                </div>
            </div>
        `;
    });
    reviewHTML += '</div>';

    const percentage = Math.round((score / total) * 100);

    // Save to Progress
    const authData = getProgress();
    if (authData) {
        authData.xp = (authData.xp || 0) + (score * 50); // 50 XP per correct answer
        authData.totalScore = (authData.totalScore || 0) + score;
        authData.modulesCompleted = (authData.modulesCompleted || 0) + (percentage >= 70 ? 1 : 0);
        saveAuthProgress(authData);
    }

    const strokeDash = 283;
    const strokeOffset = strokeDash - (percentage / 100) * strokeDash;

    // Evaluation Message
    let message = "Good Effort!";
    if (percentage >= 90) message = "Outstanding Performance! 🌟";
    else if (percentage >= 70) message = "Great Job! Keep it up! 🚀";
    else if (percentage < 50) message = "Keep Practicing! You'll get there. 💪";

    const quizContainer = document.querySelector('.quiz-container');

    // UI with INLINE STYLES for gradient text and effects (replacing Tailwind)
    quizContainer.innerHTML = `
        <div class="animation-fade-in" style="padding-bottom: 2rem;">
            <div style="text-center; margin-bottom: 2rem;">
                <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; background: var(--gradient-primary); -webkit-background-clip: text; background-clip: text; color: transparent;">Quiz Results</h2>
                <p style="color: var(--text-secondary); font-size: 1.1rem;">Detailed breakdown of your performance</p>
            </div>

            <div class="card" style="margin-bottom: 2rem; position: relative; overflow: hidden; padding: 2rem;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--gradient-primary);"></div>
                
                <div style="display: flex; flex-direction: column; align-items: center; gap: 3rem;">
                    <!-- Circular Progress -->
                     <div class="score-circle" style="width: 160px; height: 160px; position: relative; border: none; box-shadow: none;">
                         <svg style="width: 100%; height: 100%; transform: rotate(-90deg);" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"></circle>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gradient)" stroke-width="8"
                                    stroke-dasharray="283" stroke-dashoffset="${strokeOffset}"
                                    stroke-linecap="round"
                                    style="transition: stroke-dashoffset 1.5s ease-out; filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));"></circle>
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stop-color="#3b82f6" />
                                    <stop offset="100%" stop-color="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <span style="font-size: 2.5rem; font-weight: 700; color: white;">${percentage}%</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 10px; margin-top: 5px;">${message}</span>
                        </div>
                    </div>

                    <!-- Stats Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; width: 100%; max-width: 400px;">
                        <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
                            <p style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary);">${score}/${total}</p>
                            <p style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 1px; margin-top: 0.25rem;">Score</p>
                        </div>
                        <div style="padding: 1rem; background: rgba(34, 197, 94, 0.1); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.2); text-align: center;">
                            <p style="font-size: 1.8rem; font-weight: 700; color: var(--color-success);">${correct}</p>
                            <p style="font-size: 0.75rem; text-transform: uppercase; color: rgba(34, 197, 94, 0.8); letter-spacing: 1px; margin-top: 0.25rem;">Correct</p>
                        </div>
                        <div style="padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2); text-align: center;">
                            <p style="font-size: 1.8rem; font-weight: 700; color: var(--color-error);">${incorrect}</p>
                            <p style="font-size: 0.75rem; text-transform: uppercase; color: rgba(239, 68, 68, 0.8); letter-spacing: 1px; margin-top: 0.25rem;">Incorrect</p>
                        </div>
                        <div style="padding: 1rem; background: rgba(234, 179, 8, 0.1); border-radius: 12px; border: 1px solid rgba(234, 179, 8, 0.2); text-align: center;">
                            <p style="font-size: 1.8rem; font-weight: 700; color: var(--color-warning);">${skipped}</p>
                            <p style="font-size: 0.75rem; text-transform: uppercase; color: rgba(234, 179, 8, 0.8); letter-spacing: 1px; margin-top: 0.25rem;">Skipped</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 2.5rem; flex-wrap: wrap;">
                <button onclick="window.startQuiz()" class="btn-primary" style="padding: 0.8rem 2rem; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);">
                    <i class="fa-solid fa-rotate-right"></i> Retry Quiz
                </button>
                <button onclick="document.getElementById('back-to-hub').click()" class="btn-secondary" style="padding: 0.8rem 2rem; font-size: 1.1rem; background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.2);">
                    <i class="fa-solid fa-arrow-left"></i> Back to Module
                </button>
            </div>

            <div class="card" style="padding: 1.5rem;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-clipboard-list" style="color: var(--color-accent);"></i> Detailed Analysis
                </h3>
                <div style="max-height: 500px; overflow-y: auto; padding-right: 0.5rem;">
                    ${reviewHTML}
                </div>
            </div>
        </div>
    `;
}

function quitQuiz() {
    if (confirm("Are you sure you want to quit? Progress will be lost.")) {
        document.getElementById('quiz-interface').classList.add('hidden');
        document.getElementById('module-detail').classList.remove('hidden');
    }
}
