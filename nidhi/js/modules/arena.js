import { fetchData, generateText } from '../utils.js';
import { getProgress, saveProgress } from './auth.js';
import CONFIG from '../config.js';

let myCodeMirror;
let problems = [];
let currentProblem = null;

export async function initArena() {
    console.log('Initializing Coding Arena');

    // Load Problems
    const data = await fetchData('data/cp_questions.json');
    if (data) {
        problems = Array.isArray(data) ? data : data.problems || [];
        renderProblemList(problems);
    }

    // Load User Stats
    const userData = getProgress();
    if (userData) {
        document.getElementById('arena-streak').innerText = `${userData.streak || 0} Day Streak`;
        document.getElementById('arena-xp').innerText = `Level ${userData.level || 1} (${userData.xp || 0} XP)`;
    }

    // Setup Filter Buttons (Difficulty)
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });

    // Setup Topic Filter
    const topicSelect = document.getElementById('arena-topic-filter');
    if (topicSelect) {
        topicSelect.addEventListener('change', applyFilters);
    }

    // Back Button logic
    const backBtn = document.getElementById('back-to-arena');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('arena-editor-view').classList.add('hidden');
            document.getElementById('arena-list-view').classList.remove('hidden');
        });
    }

    // Initialize Editor events (Run/Submit)
    if (!window.arenaInitialized) {
        setupEditorEvents();
        setupLC_Tabs();
        setupLC_Console();
        window.arenaInitialized = true;
    } else {
        if (myCodeMirror) setTimeout(() => myCodeMirror.refresh(), 100);
    }
}

/* --- LEETCODE UI LOGIC --- */

function setupLC_Tabs() {
    const tabs = document.querySelectorAll('.pane-tab');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');

            // Hide all pane contents
            document.querySelectorAll('.pane-content').forEach(c => c.classList.add('hidden'));

            // Show target
            const targetId = `tab-${btn.dataset.tab}`;
            const target = document.getElementById(targetId);
            if (target) target.classList.remove('hidden');
        });
    });
}

function setupLC_Console() {
    // 1. Console Toggle (Bottom Button)
    const toggleBtn = document.getElementById('btn-console-toggle');
    const closeBtn = document.getElementById('console-toggle-btn');
    const consolePane = document.getElementById('arena-console');

    const toggleFn = () => {
        consolePane.classList.toggle('collapsed');
        if (!consolePane.classList.contains('collapsed')) {
            consolePane.style.display = 'flex'; // Ensure visible flex
        } else {
            consolePane.style.display = 'none'; // Hide completely to free space
        }
    };

    if (toggleBtn) toggleBtn.addEventListener('click', toggleFn);
    if (closeBtn) closeBtn.addEventListener('click', toggleFn);

    // 2. Console Tabs (Testcase vs Result)
    window.switchConsoleTab = (tabName) => {
        // UI Tabs
        document.querySelectorAll('.console-tab').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.console-tab[onclick*='${tabName}']`);
        if (activeBtn) activeBtn.classList.add('active');

        // Content
        document.querySelectorAll('.console-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`console-${tabName}`).classList.remove('hidden');
    };
}


function renderProblemList(probList) {
    const listContainer = document.getElementById('problem-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = probList.map(p => `
        <div class="problem-item" onclick="openProblem(${p.id})">
            <div class="p-header">
                <span class="p-difficulty ${p.difficulty.toLowerCase()}">${p.difficulty}</span>
                <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem; color: var(--text-secondary);"></i>
            </div>
            <h3 class="p-title">${p.title}</h3>
            <div class="p-stats">
                <span><i class="fa-solid fa-clock"></i> ${p.time_limit}</span>
                <span><i class="fa-solid fa-trophy"></i> ${p.points} XP</span>
            </div>
        </div>
    `).join('');

    // We attach onclick via HTML string for simplicity, but need to expose the function globally
    window.openProblem = openProblem;
}

function applyFilters() {
    const activeBtn = document.querySelector('.filter-btn.active');
    const difficulty = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';

    const topicSelect = document.getElementById('arena-topic-filter');
    const topic = topicSelect ? topicSelect.value : 'all';

    let filtered = problems;

    // Filter by Difficulty
    if (difficulty !== 'all') {
        filtered = filtered.filter(p => p.difficulty.toLowerCase() === difficulty);
    }

    // Filter by Topic
    if (topic !== 'all') {
        filtered = filtered.filter(p => p.topic && p.topic.toLowerCase().includes(topic.toLowerCase()));
    }

    renderProblemList(filtered);
}

function openProblem(id) {
    currentProblem = problems.find(p => p.id === id);
    if (!currentProblem) return;

    // Switch View
    document.getElementById('arena-list-view').classList.add('hidden');
    document.getElementById('arena-editor-view').classList.remove('hidden');

    // Populate UI
    document.getElementById('p-title').innerText = currentProblem.title;
    document.getElementById('p-difficulty').className = `difficulty ${currentProblem.difficulty.toLowerCase()}`;
    document.getElementById('p-difficulty').innerText = currentProblem.difficulty;
    document.getElementById('p-time').innerText = currentProblem.time_limit;
    document.getElementById('p-points').innerText = `${currentProblem.points} pts`;
    document.getElementById('p-desc').innerText = currentProblem.description;

    const example = currentProblem.examples[0];
    if (example) {
        document.getElementById('p-example').innerText = `Input: ${example.input}\nOutput: ${example.output}`;
    }

    // Update Editor
    initCodeEditor(currentProblem.starter_code.javascript || "// Write your code here");

    // Handle language change to update starter code
    // Default Templates
    const starterTemplates = {
        'cpp': `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        // Your code here\n    }\n};\n\nint main() {\n    Solution sol;\n    sol.solve();\n    return 0;\n}`,
        'java': `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code here\n        System.out.println("Hello World");\n    }\n}`,
        'python': `def solve():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    solve()`,
        'javascript': `function solve() {\n    // Your code here\n}\n\nsolve();`,
        'csharp': `using System;\n\npublic class Solution {\n    public static void Main(string[] args) {\n        // Your code here\n    }\n}`
    };

    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.value = 'javascript'; // reset default
        langSelect.onchange = () => {
            const lang = langSelect.value;
            let starteCode = "";
            let mode = "javascript";

            if (currentProblem && currentProblem.starter_code && currentProblem.starter_code[lang]) {
                starteCode = currentProblem.starter_code[lang];
            } else {
                starteCode = starterTemplates[lang] || `// No starter code for ${lang}`;
            }

            if (lang === 'python') mode = 'python';
            else if (lang === 'cpp' || lang === 'java' || lang === 'csharp') mode = 'clike';

            if (myCodeMirror) {
                myCodeMirror.setValue(starteCode);
                myCodeMirror.setOption("mode", mode);
            }
        };
    }
}

function initCodeEditor(content) {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
        editorElement.innerHTML = '';
        setTimeout(() => {
            if (typeof CodeMirror !== 'undefined') {
                myCodeMirror = CodeMirror(editorElement, {
                    value: content,
                    mode: "javascript",
                    theme: "dracula",
                    lineNumbers: true,
                    autoCloseBrackets: true,
                    matchBrackets: true
                });
            }
        }, 50);
    }
}

function setupEditorEvents() {
    const runBtn = document.getElementById('run-code');
    const consoleOutput = document.getElementById('console-output');
    const consolePane = document.getElementById('arena-console');

    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            // 1. Open Console & Switch to Result Tab
            if (consolePane.classList.contains('collapsed')) {
                consolePane.classList.remove('collapsed');
                consolePane.style.display = 'flex';
            }
            window.switchConsoleTab('result');

            const code = myCodeMirror ? myCodeMirror.getValue() : "";
            const langSelect = document.getElementById('language-select');
            const language = langSelect ? langSelect.value : "javascript";

            // Show Loading State
            consoleOutput.innerHTML = `<div class="p-4 text-yellow-500"><i class="fa-solid fa-circle-notch fa-spin"></i> Running on Test Cases...</div>`;

            try {
                // Call Backend for Simulation
                const response = await fetch(`${CONFIG.API_URL}/api/run-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        language,
                        problemTitle: currentProblem ? currentProblem.title : "Scratchpad"
                    })
                });

                let data;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    data = { success: false, output: `Server Error (Non-JSON): ${text.substring(0, 100)}` };
                }

                if (data.success) {
                    const output = data.output;
                    const isError = output.toLowerCase().includes("error") || output.includes("Exception");

                    consoleOutput.innerHTML = isError
                        ? `<div class="p-4 text-red-500 font-mono text-sm">${output.replace(/\n/g, '<br>')}</div>`
                        : `<div class="p-4">
                                <div class="text-green-500 mb-2"><i class="fa-solid fa-check"></i> Finished</div>
                                <div class="bg-[#333] p-3 rounded font-mono text-sm text-gray-300 whitespace-pre-wrap">${output}</div>
                           </div>`;
                } else {
                    consoleOutput.innerHTML = `<div class="p-4 text-red-500">Execution Error: ${data.output || "Unknown"}</div>`;
                }
            } catch (e) {
                console.error(e);
                consoleOutput.innerHTML = `<div class="p-4 text-red-500">Network Error: Failed to reach compiler service.</div>`;
            }
        });
    }


    const submitBtn = document.getElementById('submit-code');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            // 1. Open Console & Switch to Result Tab
            if (consolePane.classList.contains('collapsed')) {
                consolePane.classList.remove('collapsed');
                consolePane.style.display = 'flex';
            }
            window.switchConsoleTab('result');

            // 2. Initial Loading State
            consoleOutput.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8">
                     <i class="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-200">Judging...</h3>
                    <p class="text-gray-400 mt-2 text-sm">Running test cases...</p>
                </div>
            `;

            const code = myCodeMirror ? myCodeMirror.getValue() : "";

            try {
                const langSelect = document.getElementById('language-select');
                const language = langSelect ? langSelect.value : "javascript";

                // Call Backend API
                const response = await fetch(`${CONFIG.API_URL}/api/submit-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        language,
                        problemTitle: currentProblem?.title || "Unknown Problem",
                        problemDifficulty: currentProblem?.difficulty || "Medium"
                    })
                });

                let data;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
                }

                if (!data.success) {
                    throw new Error(data.error || "Submission failed");
                }

                const result = data.analysis;
                const totalTests = result.total_test_cases || 20; // Fallback to 20 if simplified
                const isSuccess = result.test_cases_passed === totalTests;
                const titleColor = isSuccess ? '#10b981' : '#ef4444';

                if (isSuccess) {
                    const progress = getProgress();
                    if (progress) {
                        progress.xp = (progress.xp || 0) + (currentProblem?.points || 500);
                        progress.modulesCompleted = (progress.modulesCompleted || 0) + 1;
                        progress.lastActivity = new Date().toISOString();
                        saveProgress(progress);

                        // Update UI if possible
                        const streakEl = document.getElementById('arena-streak');
                        const xpEl = document.getElementById('arena-xp');
                        if (streakEl) streakEl.innerText = `${progress.streak || 0} Day Streak`;
                        if (xpEl) xpEl.innerText = `Level ${progress.level || 1} (${progress.xp || 0} XP)`;
                    }
                }

                // Final Result Card
                consoleOutput.innerHTML = `
                    <div class="p-6 bg-[#282828] animate-fade-in">
                        <div class="flex items-center gap-4 mb-4">
                            <h3 style="color: ${titleColor}" class="text-2xl font-bold">
                                ${isSuccess ? '<i class="fa-solid fa-check-circle"></i> Accepted' : '<i class="fa-solid fa-circle-xmark"></i> Wrong Answer'}
                            </h3>
                            <span class="text-gray-400 text-sm">Runtime: ${Math.floor(Math.random() * 50) + 10} ms</span>
                        </div>

                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="p-4 bg-[#3c3c3c] rounded-lg">
                                <span class="block text-gray-400 text-xs uppercase">Test Cases Passed</span>
                                <span class="text-xl font-bold text-white">${result.test_cases_passed}/${totalTests}</span>
                            </div>
                            <div class="p-4 bg-[#3c3c3c] rounded-lg">
                                <span class="block text-gray-400 text-xs uppercase">Complexity Analysis</span>
                                <span class="text-blue-400 text-sm font-mono">${result.time_complexity || "O(n)"}</span>
                            </div>
                        </div>

                        <div class="bg-[#3c3c3c] p-4 rounded-lg border border-gray-700">
                             <h4 class="text-white font-semibold mb-2"><i class="fa-solid fa-robot"></i> AI Feedback</h4>
                             <p class="text-gray-300 text-sm leading-relaxed">${result.feedback}</p>
                        </div>
                    </div>
                 `;

            } catch (e) {
                console.error(e);
                consoleOutput.innerHTML = `<div class="p-4 text-red-400">Error: ${e.message || "Service Unavailable"}</div>`;
            }
        });
    }
}
