import { getCurrentUser, getProgress, saveProgress } from './auth.js';
import CONFIG from '../config.js';

let todayChallenge = null;
let myCodeMirror = null;

export function initPlanner() {
    console.log("Initializing Study Planner");
    
    // Listen for tab switch to potentially load/reload daily challenge
    window.addEventListener('section-changed', (e) => {
        if (e.detail.targetId === 'study-planner') {
            loadDailyChallenge();
        }
    });

    // Initial load
    loadDailyChallenge();

    // Setup Submit Button
    const submitBtn = document.getElementById('planner-submit-btn');
    if (submitBtn) {
        // Remove existing listener to avoid double binding
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
        
        newSubmitBtn.addEventListener('click', submitDailyChallenge);
    }
}

async function loadDailyChallenge() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const loader = document.getElementById('challenge-info-loader');
    const wrapper = document.getElementById('challenge-details-wrapper');
    const resultBox = document.getElementById('planner-result-box');

    if (loader) loader.classList.remove('hidden');
    if (wrapper) wrapper.classList.add('hidden');
    if (resultBox) resultBox.classList.add('hidden');

    try {
        // 1. Fetch Challenge Details
        const resChallenge = await fetch(`${CONFIG.API_URL}/api/daily-challenge`);
        const challengeData = await resChallenge.json();
        
        if (!challengeData.success) {
            throw new Error(challengeData.message || "Failed to load challenge");
        }

        todayChallenge = challengeData;

        // 2. Fetch User Status for Today
        const token = localStorage.getItem('authToken');
        const resStatus = await fetch(`${CONFIG.API_URL}/api/daily-challenge/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const statusData = await resStatus.json();

        if (!statusData.success) {
            throw new Error(statusData.message || "Failed to load status");
        }

        // Render Streaks & Heatmap & Progress
        updateProgressUI(statusData);

        // Render Challenge Details
        renderChallengeDetails(challengeData, statusData);

    } catch (err) {
        console.error("Error loading daily challenge details:", err);
        if (loader) {
            loader.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <p style="color: #ef4444;">${err.message || "An error occurred while loading. Please try again."}</p>
            `;
        }
    }
}

function updateProgressUI(statusData) {
    // Streak Display
    const streakDisplay = document.getElementById('streak-display');
    const maxStreakDisplay = document.getElementById('max-streak-display');
    if (streakDisplay) streakDisplay.innerText = statusData.currentStreak || 0;
    if (maxStreakDisplay) maxStreakDisplay.innerText = statusData.maxStreak || 0;

    // Heatmap / Weekly Activity Strip
    const heatmapStrip = document.getElementById('weekly-heatmap-strip');
    if (heatmapStrip && statusData.last7Days) {
        heatmapStrip.innerHTML = statusData.last7Days.map(day => {
            const dateObj = new Date(day.date);
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = daysOfWeek[dateObj.getDay()];
            
            const dotColor = day.completed ? '#10b981' : '#334155';
            const dotShadow = day.completed ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none';
            const icon = day.completed ? '<i class="fa-solid fa-check" style="font-size: 0.75rem; color: #0f172a;"></i>' : '';

            return `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                    <span style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">${dayName}</span>
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: ${dotColor}; box-shadow: ${dotShadow}; display: flex; align-items: center; justify-content: center; transition: all 0.3s;">
                        ${icon}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Personal Level Progress Bar
    const xp = statusData.xp || 0;
    const currentLevel = Math.floor(xp / 1000) + 1;
    const progressPercent = Math.round(((xp % 1000) / 1000) * 100);

    const bar = document.getElementById('planner-overall-progress');
    const txt = document.getElementById('planner-progress-percent');
    if (bar) bar.style.width = `${progressPercent}%`;
    if (txt) txt.innerText = `${progressPercent}%`;
}

function renderChallengeDetails(challengeData, statusData) {
    const loader = document.getElementById('challenge-info-loader');
    const wrapper = document.getElementById('challenge-details-wrapper');
    if (loader) loader.classList.add('hidden');
    if (wrapper) wrapper.classList.remove('hidden');

    const ch = challengeData.challenge;
    const isCoding = challengeData.challengeType === 'coding';

    // Status Badge
    const statusBadge = document.getElementById('challenge-status-badge');
    if (statusBadge) {
        if (statusData.completedToday) {
            statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            statusBadge.style.color = '#10b981';
            statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            statusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Completed';
        } else {
            statusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
            statusBadge.style.color = '#ef4444';
            statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            statusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> Pending';
        }
    }

    // Badges
    const typeBadge = document.getElementById('challenge-type-badge');
    const topicBadge = document.getElementById('challenge-topic-badge');
    const diffBadge = document.getElementById('challenge-diff-badge');
    const xpBadge = document.getElementById('challenge-xp-badge');

    if (typeBadge) {
        typeBadge.innerText = challengeData.challengeType.toUpperCase();
        typeBadge.style.background = isCoding ? 'rgba(56, 189, 248, 0.15)' : 'rgba(139, 92, 246, 0.15)';
        typeBadge.style.color = isCoding ? '#38bdf8' : '#8b5cf6';
        typeBadge.style.borderColor = isCoding ? 'rgba(56, 189, 248, 0.3)' : 'rgba(139, 92, 246, 0.3)';
    }

    if (topicBadge) topicBadge.innerText = (ch.topic || "General").toUpperCase();
    
    if (diffBadge) {
        diffBadge.innerText = (ch.difficulty || "Medium").toUpperCase();
        const diff = (ch.difficulty || "").toLowerCase();
        let bg = 'rgba(16, 185, 129, 0.15)', fg = '#10b981';
        if (diff === 'medium') {
            bg = 'rgba(245, 158, 11, 0.15)'; fg = '#f59e0b';
        } else if (diff === 'hard') {
            bg = 'rgba(239, 68, 68, 0.15)'; fg = '#ef4444';
        }
        diffBadge.style.background = bg;
        diffBadge.style.color = fg;
        diffBadge.style.borderColor = bg.replace('0.15', '0.3');
    }

    if (xpBadge) xpBadge.innerText = `+${ch.points || 30} XP`;

    // Title
    const titleEl = document.getElementById('challenge-title');
    if (titleEl) titleEl.innerText = ch.title || ch.question || "Daily Challenge";

    // Description
    const descEl = document.getElementById('challenge-description');
    if (descEl) {
        let descHtml = ch.description || ch.question || "";
        
        // Append coding examples if present
        if (isCoding && ch.examples && ch.examples.length > 0) {
            descHtml += `<div style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">`;
            ch.examples.forEach((ex, idx) => {
                descHtml += `
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="color: white; font-size: 0.85rem;">Example ${idx + 1}:</strong>
                        <pre style="background: rgba(15, 23, 42, 0.5); padding: 0.6rem; border-radius: 8px; font-family: monospace; font-size: 0.8rem; margin: 0.25rem 0; border: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; overflow-x: auto;">
Input: ${ex.input}
Output: ${ex.output}
                        </pre>
                    </div>
                `;
            });
            descHtml += `</div>`;
        }
        descEl.innerHTML = descHtml;
    }

    // Toggle Sections
    const editorSection = document.getElementById('challenge-editor-section');
    const answerSection = document.getElementById('challenge-answer-section');
    const submitBtn = document.getElementById('planner-submit-btn');
    const resultBox = document.getElementById('planner-result-box');

    if (statusData.completedToday) {
        if (editorSection) editorSection.classList.add('hidden');
        if (answerSection) answerSection.classList.add('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
        
        if (resultBox) {
            resultBox.classList.remove('hidden');
            resultBox.style.background = 'rgba(16, 185, 129, 0.05)';
            resultBox.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            resultBox.style.color = '#e2e8f0';
            resultBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; color: #10b981; font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-circle-check" style="font-size: 1.5rem;"></i> Challenge Complete!
                </div>
                <p>Amazing work! You've already solved today's daily challenge and claimed your reward.</p>
                <div style="margin-top: 1rem; font-size: 0.85rem; color: #94a3b8; font-style: italic;">
                    Come back tomorrow for a fresh coding or interview challenge. Keep up the streak!
                </div>
            `;
        }
    } else {
        if (resultBox) resultBox.classList.add('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');

        if (isCoding) {
            if (editorSection) editorSection.classList.remove('hidden');
            if (answerSection) answerSection.classList.add('hidden');
            
            const langSelect = document.getElementById('planner-lang-select');
            const lang = langSelect ? langSelect.value : 'javascript';
            const starterCode = ch.starter_code ? ch.starter_code[lang] : "";
            initCodeEditor(starterCode, lang);

            // Re-bind change handler
            if (langSelect) {
                langSelect.onchange = (e) => {
                    const newLang = e.target.value;
                    const newStarter = ch.starter_code ? ch.starter_code[newLang] : "";
                    initCodeEditor(newStarter, newLang);
                };
            }
        } else {
            if (editorSection) editorSection.classList.add('hidden');
            if (answerSection) answerSection.classList.remove('hidden');
            
            const textArea = document.getElementById('planner-answer-textarea');
            if (textArea) {
                textArea.value = '';
                document.getElementById('char-count').innerText = '0';
            }
        }
    }
}

function initCodeEditor(starterCode, language) {
    const editorElement = document.getElementById('planner-code-editor');
    if (!editorElement) return;
    editorElement.innerHTML = ''; // Clear
    
    const mode = language === 'javascript' ? 'javascript' : 'python';
    
    if (typeof CodeMirror !== 'undefined') {
        myCodeMirror = CodeMirror(editorElement, {
            value: starterCode || '',
            mode: mode,
            theme: 'dracula',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            tabSize: 4,
            indentUnit: 4,
            lineWrapping: true
        });
        
        // Auto-refresh in a bit
        setTimeout(() => {
            if (myCodeMirror) myCodeMirror.refresh();
        }, 150);
    } else {
        const textarea = document.createElement('textarea');
        textarea.id = 'planner-code-textarea';
        textarea.value = starterCode || '';
        textarea.style.width = '100%';
        textarea.style.height = '300px';
        textarea.style.background = '#0f172a';
        textarea.style.color = '#fff';
        textarea.style.fontFamily = 'monospace';
        textarea.style.padding = '1rem';
        textarea.style.border = '1px solid rgba(255,255,255,0.1)';
        textarea.style.borderRadius = '8px';
        editorElement.appendChild(textarea);
    }
}

async function submitDailyChallenge() {
    if (!todayChallenge) return;

    let answer = "";
    if (todayChallenge.challengeType === 'coding') {
        if (myCodeMirror) {
            answer = myCodeMirror.getValue();
        } else {
            const textarea = document.getElementById('planner-code-textarea');
            answer = textarea ? textarea.value : "";
        }
    } else {
        const textarea = document.getElementById('planner-answer-textarea');
        answer = textarea ? textarea.value : "";
    }

    if (!answer || answer.trim().length < 20) {
        alert("Your response is too short! Please write a detailed answer (minimum 20 characters) to verify completion.");
        return;
    }

    const submitBtn = document.getElementById('planner-submit-btn');
    const resultBox = document.getElementById('planner-result-box');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${CONFIG.API_URL}/api/daily-challenge/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                answer: answer,
                challengeType: todayChallenge.challengeType
            })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to submit challenge.");
        }

        // Success!
        if (submitBtn) submitBtn.classList.add('hidden');
        
        const editorSection = document.getElementById('challenge-editor-section');
        const answerSection = document.getElementById('challenge-answer-section');
        if (editorSection) editorSection.classList.add('hidden');
        if (answerSection) answerSection.classList.add('hidden');

        if (resultBox) {
            resultBox.classList.remove('hidden');
            resultBox.style.background = 'rgba(16, 185, 129, 0.05)';
            resultBox.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            resultBox.style.color = '#e2e8f0';
            resultBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; color: #10b981; font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-circle-check" style="font-size: 1.5rem;"></i> Challenge Complete!
                </div>
                <p>${data.message || "Your answer has been verified and recorded!"}</p>
                <div style="margin-top: 1rem; font-size: 0.85rem; color: #94a3b8; font-style: italic;">
                    Your streak and XP have been updated. Keep it up!
                </div>
            `;
        }

        // Fetch new status to refresh streak & heatmap strip
        const resStatus = await fetch(`${CONFIG.API_URL}/api/daily-challenge/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const statusData = await resStatus.json();
        if (statusData.success) {
            updateProgressUI(statusData);
            
            // Sync current user local cache
            const user = getCurrentUser();
            if (user) {
                user.xp = statusData.xp;
                user.currentStreak = statusData.currentStreak;
                user.maxStreak = statusData.maxStreak;
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
            
            // Re-render status badge
            const statusBadge = document.getElementById('challenge-status-badge');
            if (statusBadge) {
                statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                statusBadge.style.color = '#10b981';
                statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                statusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Completed';
            }
        }

    } catch (err) {
        console.error("Submission error:", err);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Submit Completion</span> <i class="fa-solid fa-paper-plane"></i>`;
        }
        if (resultBox) {
            resultBox.classList.remove('hidden');
            resultBox.style.background = 'rgba(239, 68, 68, 0.05)';
            resultBox.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            resultBox.style.color = '#ef4444';
            resultBox.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem;"></i> Submission Failed
                </div>
                <p>${err.message || "An error occurred during submission. Please try again."}</p>
            `;
        }
    }
}
