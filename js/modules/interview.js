import { fetchData, generateText } from '../utils.js';
import CONFIG from '../config.js';
import { ensureAuth, addInterviewResult } from './auth.js';

let questions = [];
let currentQuestionIndex = 0;
let mediaRecorder;
let socket;
let isListening = false;
let score = 0;
let userAnswers = [];
let timerInterval;
let startTime;

// State
let selectedCompany = 'amazon';
let selectedType = 'technical';

// Editor State
let interviewCM;
let showCode = false;

export function initInterview() {
    // Auth Check
    const user = ensureAuth();
    if (!user) return;

    console.log('Initializing Mock Interview Module');
    setupSelectionLogic();
    setupControls();
    setupInterviewEditor();
}

function setupSelectionLogic() {
    // Company Buttons
    document.querySelectorAll('.company-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.company-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCompany = btn.dataset.company;
        });
    });

    // Type Buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedType = btn.dataset.type;
        });
    });

    // Start Button
    const startBtn = document.getElementById('btn-begin-interview');
    if (startBtn) {
        startBtn.addEventListener('click', startSession);
    }
}

function startTimer() {
    startTime = Date.now();
    const display = document.getElementById('interview-timer');

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const delta = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(delta / 60).toString().padStart(2, '0');
        const secs = (delta % 60).toString().padStart(2, '0');
        display.innerText = `${mins}:${secs}`;
    }, 1000);
}

function loadQuestion(index) {
    if (index >= questions.length) {
        endInterview();
        return;
    }

    const q = questions[index];
    const qEl = document.getElementById('ai-question');
    qEl.innerText = q.question;

    document.getElementById('live-transcript').innerHTML = '<p class="placeholder-text">Click Answer when ready...</p>';
    if (interviewCM) interviewCM.setValue("// Write code here if asked...");

    // Determine Text to Speak
    let textToSpeak = q.question;

    // Add Transitions (skip for first question which handles intro separately)
    if (index > 0) {
        const phrases = [
            "Thank you. Let's move to the next question.",
            "Noted. Moving forward,",
            "Okay. Next question.",
            "Interesting. Now,",
            "Great. Moving on,",
            "Thanks for that. Now tell me,"
        ];
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        textToSpeak = `${phrase} ${q.question}`;
    }

    speak(textToSpeak);
}

// Text to Speech with Avatar Animation
function speak(text, callback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        // Avatar Animation
        const avatar = document.getElementById('ai-avatar-viz');
        const status = document.getElementById('interview-status');

        utterance.onstart = () => {
            if (avatar) avatar.classList.add('speaking');
            if (status) {
                status.innerText = "AI is speaking...";
                status.classList.add('visible');
            }
        };

        utterance.onend = () => {
            if (avatar) avatar.classList.remove('speaking');
            if (status) {
                status.innerText = "Waiting for answer...";
                status.classList.remove('visible');
            }
            if (callback) callback();
        };

        utterance.onerror = () => {
            if (avatar) avatar.classList.remove('speaking');
        }

        window.speechSynthesis.speak(utterance);
    } else {
        if (callback) callback();
    }
}

function setupInterviewEditor() {
    const startBtn = document.getElementById('btn-begin-interview');
    // Pre-init editor but hidden
    const txtArea = document.getElementById('interview-editor');
    if (txtArea) {
        interviewCM = CodeMirror.fromTextArea(txtArea, {
            mode: "javascript",
            theme: "dracula",
            lineNumbers: true,
            autoCloseBrackets: true
        });
        interviewCM.setSize("100%", "300px");
    }

    const toggleBtn = document.getElementById('toggle-code-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const panel = document.getElementById('interview-code-panel');
            panel.classList.toggle('hidden');
            showCode = !panel.classList.contains('hidden');
            if (showCode) {
                setTimeout(() => interviewCM.refresh(), 50);
            }
        });
    }

    const langSelect = document.getElementById('interview-lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            let mode = "javascript";
            if (e.target.value === 'python') mode = 'python';
            else if (e.target.value === 'java' || e.target.value === 'cpp') mode = 'clike';
            interviewCM.setOption("mode", mode);
        });
    }
}

async function startSession() {
    // Load Data
    const url = `data/interviews/${selectedCompany}/${selectedType}.json`;
    console.log(`Fetching questions from ${url}`);

    try {
        let allQuestions = await fetchData(url);
        if (!allQuestions || allQuestions.length === 0) {
            alert('No questions found for this selection.');
            return;
        }

        // remove existing intro questions if present to avoid redundancy
        allQuestions = allQuestions.filter(q =>
            !q.question.toLowerCase().includes("introduce yourself") &&
            !q.question.toLowerCase().includes("tell me about yourself")
        );

        // Shuffle and limit to 60 (leaving 1 for intro)
        const shuffled = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 60);

        // Fixed First Question
        // Human-like Greeting
        const greeting = `Hello! I'm Sarah, your AI interviewer for ${selectedCompany.toUpperCase()}. We'll be doing a ${selectedType} interview today. Let's start by getting to know you.`;

        const introQuestion = {
            "id": "intro",
            "question": `${greeting} Please introduce yourself and walk me through your background.`,
            "keywords": ["experience", "background", "role", "skills", "projects"],
            "ideal_answer": "Candidate should briefly describe their educational background, key work experiences, relevant skills, and current role, demonstrating clear communication."
        };

        questions = [introQuestion, ...shuffled];

    } catch (e) {
        console.error(e);
        questions = [{
            "question": "Tell me about yourself.",
            "keywords": ["experience"],
            "ideal_answer": "..."
        }];
    }

    // Update UI
    document.getElementById('interview-setup').classList.add('hidden');
    document.getElementById('interview-feedback').classList.add('hidden');
    document.getElementById('interview-active').classList.remove('hidden');

    // Reset State
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    if (interviewCM) interviewCM.setValue("// Write code here if asked...");

    // Hide Code Panel Initially
    document.getElementById('interview-code-panel').classList.add('hidden');

    // Update Metadata
    document.getElementById('interview-meta-company').innerText = selectedCompany.toUpperCase();
    document.getElementById('interview-meta-type').innerText = selectedType.toUpperCase();

    // Start Timer
    startTimer();

    // Start Questions
    loadQuestion(0);
}

function setupControls() {
    const startBtn = document.getElementById('start-answer-btn');
    const stopBtn = document.getElementById('stop-answer-btn');
    const nextBtn = document.getElementById('next-question-btn');

    if (startBtn) startBtn.addEventListener('click', startRecording);
    if (stopBtn) stopBtn.addEventListener('click', stopRecording);

    // Global End function
    window.endInterviewEarly = endInterview;
    window.resetInterview = () => {
        document.getElementById('interview-feedback').classList.add('hidden');
        document.getElementById('interview-setup').classList.remove('hidden');
    };
}

async function startRecording() {
    if (!navigator.mediaDevices) {
        alert("Microphone access not supported in this browser.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isListening = true;

        // UI Updates
        document.getElementById('interview-status').innerText = "Listening (Deepgram AI)...";
        document.getElementById('interview-status').style.color = "#ef4444";
        // Ensure visualizer exists before adding class
        const viz = document.getElementById('waveform-viz');
        if (viz) viz.classList.add('active');

        document.getElementById('start-answer-btn').disabled = true;
        document.getElementById('stop-answer-btn').disabled = false;

        // Initialize Deepgram WebSocket
        const deepgramUrl = `wss://api.deepgram.com/v1/listen?smart_format=true&model=nova-2&language=en-US`;
        socket = new WebSocket(deepgramUrl, ['token', CONFIG.DEEPGRAM_KEY]);

        socket.onopen = () => {
            console.log('Deepgram Connected');

            // Start MediaRecorder
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0 && socket.readyState === 1) {
                    socket.send(event.data);
                }
            });
            mediaRecorder.start(250); // Send chunks every 250ms
        };

        socket.onmessage = (message) => {
            const received = JSON.parse(message.data);
            if (received.channel && received.channel.alternatives && received.channel.alternatives[0]) {
                const transcript = received.channel.alternatives[0].transcript;
                if (transcript) {
                    const el = document.getElementById('live-transcript');
                    if (received.is_final) {
                        el.innerText = (el.innerText === "Click Answer when ready..." ? "" : el.innerText + " ") + transcript;
                        // Store answer
                        if (!userAnswers[currentQuestionIndex]) userAnswers[currentQuestionIndex] = "";
                        userAnswers[currentQuestionIndex] += transcript + " ";
                    }
                }
            }
        };

        socket.onclose = () => {
            console.log('Deepgram Disconnected');
        };

    } catch (error) {
        console.error('Error starting recording:', error);
        alert('Could not access microphone. Please check your browser privacy settings or try a different browser.');
    }
}



function moveToNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        setTimeout(() => {
            loadQuestion(currentQuestionIndex);
        }, 1000);
    } else {
        // Check if we should add more questions (Interview < 15 mins)
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed < 900) { // 15 mins
            console.log("Interview too short, extending...");
            // logic to extend could be complex, for now just end it to avoid bugs
            endInterview();
        } else {
            endInterview();
        }
    }
}

function stopRecording() {
    if (!isListening) return;
    isListening = false;

    // Update UI
    const statusEl = document.getElementById('interview-status');
    if (statusEl) {
        statusEl.innerText = "Processing answer...";
        statusEl.classList.remove('visible');
    }
    document.getElementById('start-answer-btn').disabled = false;
    document.getElementById('stop-answer-btn').disabled = true;

    // Stop Media Recorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    // Close Socket
    if (socket) {
        socket.close();
    }

    const answer = userAnswers[currentQuestionIndex] || "";
    const question = questions[currentQuestionIndex];

    if (!question) {
        moveToNextQuestion();
        return;
    }

    // Check if user doesn't know (Logic for "I don't know" handling)
    const normalize = answer.toLowerCase().trim();
    const isDontKnow = normalize.includes("don't know") ||
        normalize.includes("no idea") ||
        normalize.includes("pass") ||
        normalize.includes("skip") ||
        normalize.length < 5; // Silence or very short

    if (isDontKnow) {
        if (statusEl) {
            statusEl.innerText = "Explaining answer...";
            statusEl.classList.add('visible');
        }

        const explanation = `No problem. The ideal answer would be: ${question.ideal_answer || "unavailable"}. Let's move specifically to the next one.`;
        speak(explanation, () => {
            moveToNextQuestion();
        });
        return; // No score for this
    }

    // Scoring Logic
    let matchCount = 0;
    if (question.keywords) {
        question.keywords.forEach(kw => {
            if (normalize.includes(kw.toLowerCase())) {
                matchCount++;
            }
        });
        // Simple linear scoring
        const ratio = matchCount / question.keywords.length;
        score += (ratio * 100);
    }

    moveToNextQuestion();
}

async function endInterview() {
    clearInterval(timerInterval);

    speak("Thank you for your time. The interview is complete. I am analyzing your responses now.");

    if (isListening) stopRecording();

    // Hide Active, Show Feedback
    document.getElementById('interview-active').classList.add('hidden');
    document.getElementById('interview-feedback').classList.remove('hidden');

    // Calc Final Stats
    const totalPossible = questions.length * 100;
    const finalPerc = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;

    const delta = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(delta / 60);
    const secs = delta % 60;

    // Render Stats
    document.getElementById('final-score').innerText = finalPerc;
    document.getElementById('final-time').innerText = `${mins}m ${secs}s`;
    document.getElementById('final-q-count').innerText = questions.length;

    // AI Feedback Text
    const feedbackEl = document.getElementById('feedback-text');
    feedbackEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating detailed analysis from AI...`;

    // Construct Transcript
    const transcript = questions.slice(0, currentQuestionIndex + 1).map((q, i) =>
        `Q: ${q.question}\nA: ${userAnswers[i] || 'No answer'}`
    ).join('\n---\n');

    let analysis;
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/generate-feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript,
                type: selectedType,
                company: selectedCompany
            })
        });
        const data = await response.json();
        if (data.success) {
            analysis = data.feedback;
        } else {
            console.warn("AI Feedback Failed:", data.error);
            analysis = "Detailed AI analysis could not be generated at this time. Please review your answers below.";
        }
    } catch (e) {
        console.error("AI Generation Error:", e);
        analysis = "Error connecting to AI service. Ensure backend is running.";
    }

    feedbackEl.innerHTML = analysis.replace(/\n/g, '<br>');



    // Save Progress
    addInterviewResult({
        score: finalPerc > 0 ? finalPerc : 0,
        company: selectedCompany,
        type: selectedType
    });
}
