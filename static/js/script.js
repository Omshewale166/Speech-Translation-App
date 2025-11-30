// Configuration
const CONFIG = {
    MAX_RECORDING_TIME: 30000, // 30 seconds
    SUPPORTED_LANGUAGES: {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh-cn': 'Chinese (Simplified)',
        'zh-tw': 'Chinese (Traditional)',
        'ar': 'Arabic',
        'hi': 'Hindi'
    }
};

// Global variables
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    populateLanguageSelectors();
    setupEventListeners();
    checkBrowserSupport();
}

function populateLanguageSelectors() {
    const targetLangSelect = document.getElementById('targetLang');
    const ttsLangSelect = document.getElementById('ttsLang');
    
    // Clear existing options
    targetLangSelect.innerHTML = '';
    ttsLangSelect.innerHTML = '';
    
    // Add language options
    Object.entries(CONFIG.SUPPORTED_LANGUAGES).forEach(([code, name]) => {
        const option1 = new Option(name, code);
        const option2 = new Option(name, code);
        
        targetLangSelect.add(option1);
        ttsLangSelect.add(option2);
    });
    
    // Set default values
    targetLangSelect.value = 'es';
    ttsLangSelect.value = 'en';
}

function setupEventListeners() {
    // Speech to Text buttons
    document.getElementById('recordBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    
    // Enter key support for textareas
    document.getElementById('textToTranslate').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            translateText();
        }
    });
    
    document.getElementById('textToSpeech').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            textToSpeech();
        }
    });
    
    // Auto-copy functionality
    document.getElementById('copyTranscribed').addEventListener('click', copyTranscribedText);
    document.getElementById('copyTranslated').addEventListener('click', copyTranslatedText);
}

function checkBrowserSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('sttResult', 'Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.');
        document.getElementById('recordBtn').disabled = true;
    }
    
    if (!window.MediaRecorder) {
        showError('sttResult', 'MediaRecorder API is not supported in your browser.');
        document.getElementById('recordBtn').disabled = true;
    }
}

// Speech to Text Functions
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 44100,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendAudioToServer(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        startRecordingTimer();
        
        updateRecordingUI(true);
        showInfo('sttResult', 'Recording... Speak now!');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        showError('sttResult', `Error accessing microphone: ${error.message}`);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopRecordingTimer();
        updateRecordingUI(false);
        showInfo('sttResult', 'Processing audio...');
    }
}

function startRecordingTimer() {
    recordingStartTime = Date.now();
    recordingTimer = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const remaining = CONFIG.MAX_RECORDING_TIME - elapsed;
        
        if (remaining <= 0) {
            stopRecording();
            showError('sttResult', 'Maximum recording time (30 seconds) reached.');
        } else {
            const seconds = Math.ceil(remaining / 1000);
            document.getElementById('timer').textContent = `(${seconds}s remaining)`;
        }
    }, 1000);
}

function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    document.getElementById('timer').textContent = '';
}

function updateRecordingUI(isRecording) {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');
    
    recordBtn.disabled = isRecording;
    stopBtn.disabled = !isRecording;
    recordingIndicator.style.display = isRecording ? 'inline-flex' : 'none';
}

async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    try {
        showLoading('sttResult');
        
        const response = await fetch('/speech-to-text', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('textToTranslate').value = data.text;
            showSuccess('sttResult', `Transcribed: "${data.text}"`);
        } else {
            showError('sttResult', data.error);
        }
    } catch (error) {
        console.error('Network error:', error);
        showError('sttResult', `Network error: ${error.message}`);
    }
}

// Translation Functions
async function translateText() {
    const text = document.getElementById('textToTranslate').value.trim();
    const targetLang = document.getElementById('targetLang').value;
    
    if (!text) {
        showError('translationResult', 'Please enter text to translate');
        return;
    }
    
    try {
        showLoading('translationResult');
        
        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ text, target: targetLang })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const sourceLangName = CONFIG.SUPPORTED_LANGUAGES[data.source_lang] || data.source_lang;
            const targetLangName = CONFIG.SUPPORTED_LANGUAGES[targetLang] || targetLang;
            
            document.getElementById('translatedText').textContent = data.translated;
            document.getElementById('translationResult').innerHTML = `
                <div class="success">
                    <strong>Translation (${sourceLangName} → ${targetLangName}):</strong><br>
                    "${data.translated}"
                </div>
            `;
        } else {
            showError('translationResult', data.error);
        }
    } catch (error) {
        console.error('Translation error:', error);
        showError('translationResult', `Network error: ${error.message}`);
    }
}

// Text to Speech Functions
async function textToSpeech() {
    const text = document.getElementById('textToSpeech').value.trim();
    const lang = document.getElementById('ttsLang').value;
    
    if (!text) {
        alert('Please enter text to convert to speech');
        return;
    }
    
    try {
        const ttsBtn = document.getElementById('ttsBtn');
        const originalText = ttsBtn.textContent;
        ttsBtn.innerHTML = '<span class="loading"></span>Generating...';
        ttsBtn.disabled = true;
        
        const response = await fetch('/text-to-speech', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'audio/mp3'
            },
            body: JSON.stringify({ text, lang })
        });
        
        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioPlayer = document.getElementById('audioPlayer');
            
            audioPlayer.src = audioUrl;
            audioPlayer.style.display = 'block';
            audioPlayer.play().catch(e => {
                console.error('Audio play failed:', e);
                showError('ttsResult', 'Click the play button to listen to the audio');
            });
            
            showSuccess('ttsResult', 'Audio generated successfully!');
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('TTS error:', error);
        alert('Network error: ' + error.message);
    } finally {
        const ttsBtn = document.getElementById('ttsBtn');
        ttsBtn.textContent = 'Convert to Speech';
        ttsBtn.disabled = false;
    }
}

// Utility Functions
function copyTranscribedText() {
    const text = document.getElementById('textToTranslate').value;
    copyToClipboard(text, 'Transcribed text copied to clipboard!');
}

function copyTranslatedText() {
    const text = document.getElementById('translatedText').textContent;
    copyToClipboard(text, 'Translated text copied to clipboard!');
}

async function copyToClipboard(text, successMessage) {
    try {
        await navigator.clipboard.writeText(text);
        showTemporaryMessage(successMessage, 'success');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showTemporaryMessage('Failed to copy text', 'error');
    }
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = '<span class="loading"></span>Processing...';
}

function showInfo(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="result">${message}</div>`;
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="success">${message}</div>`;
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="error">${message}</div>`;
}

function showTemporaryMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        transition: opacity 0.3s ease;
        ${type === 'success' ? 'background: #48bb78;' : 'background: #f56565;'}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => document.body.removeChild(messageDiv), 300);
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+Enter to translate
    if (e.ctrlKey && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'textToTranslate') {
            translateText();
        } else if (activeElement.id === 'textToSpeech') {
            textToSpeech();
        }
    }
    
    // Escape to stop recording
    if (e.key === 'Escape' && mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    }
});

// Export functions for global access
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.translateText = translateText;
window.textToSpeech = textToSpeech;
window.copyTranscribedText = copyTranscribedText;
window.copyTranslatedText = copyTranslatedText;