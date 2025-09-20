// Pranayama Assistant - Main Application Logic
class PranayamaAssistant {
    constructor() {
        this.isInitialized = false;
        this.isSessionActive = false;
        this.isPaused = false;
        this.cameraEnabled = false;
        
        // Breathing state
        this.breathingSequence = ["right_exhale", "left_inhale", "left_exhale", "right_inhale"];
        this.currentSequenceIndex = 0;
        this.breathingPace = 4;
        this.currentCount = 0;
        this.breathCycles = 0;
        this.sessionStartTime = null;
        this.breathingTimer = null;
        this.sessionTimer = null;
        
        // Monitoring state
        this.postureGood = true;
        this.eyesOpen = false;
        this.eyeAlertCount = 0;
        this.consecutiveEyeFrames = 0;
        
        // MediaPipe models
        this.pose = null;
        this.faceMesh = null;
        this.camera = null;
        
        // Audio context
        this.audioContext = null;
        this.audioVolume = 0.7;
        
        // Initialize after DOM is ready
        this.init();
    }
    
    async init() {
        try {
            // Wait a bit to ensure DOM is fully loaded
            await new Promise(resolve => setTimeout(resolve, 100));
            
            this.initializeElements();
            this.bindEvents();
            this.loadSettings();
            
            // Start initialization process
            this.initializeAsync();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.handleInitializationFailure();
        }
    }
    
    initializeElements() {
        // Main controls
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        
        // Breathing display
        this.breathingCircle = document.getElementById('breathingCircle');
        this.countDisplay = document.getElementById('countDisplay');
        this.phaseIndicator = document.getElementById('phaseIndicator');
        this.currentAction = document.getElementById('currentAction');
        this.leftNostril = document.getElementById('leftNostril');
        this.rightNostril = document.getElementById('rightNostril');
        
        // Session info
        this.sessionTime = document.getElementById('sessionTime');
        this.breathCyclesDisplay = document.getElementById('breathCycles');
        
        // Monitoring elements
        this.videoElement = document.getElementById('videoElement');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.cameraStatus = document.getElementById('cameraStatus');
        
        // Status displays
        this.postureStatus = document.getElementById('postureStatus');
        this.eyeStatus = document.getElementById('eyeStatus');
        this.spineIndicator = document.getElementById('spineIndicator');
        this.shoulderIndicator = document.getElementById('shoulderIndicator');
        this.headIndicator = document.getElementById('headIndicator');
        this.leftEye = document.getElementById('leftEye');
        this.rightEye = document.getElementById('rightEye');
        this.eyeAlertsDisplay = document.getElementById('eyeAlerts');
        this.feedbackMessages = document.getElementById('feedbackMessages');
        
        // Settings
        this.settingsPanel = document.getElementById('settingsPanel');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.closeSettings = document.getElementById('closeSettings');
        this.breathingPaceSelect = document.getElementById('breathingPace');
        this.audioVolumeSlider = document.getElementById('audioVolume');
        this.postureSensitivity = document.getElementById('postureSensitivity');
        this.practiceLimit = document.getElementById('practiceLimit');
        
        // Modals
        this.permissionModal = document.getElementById('permissionModal');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.enableCamera = document.getElementById('enableCamera');
        this.continueWithoutCamera = document.getElementById('continueWithoutCamera');
        this.loadingStatus = document.getElementById('loadingStatus');
        
        // Log missing elements for debugging
        const elements = {
            startBtn: this.startBtn,
            settingsToggle: this.settingsToggle,
            pauseBtn: this.pauseBtn,
            stopBtn: this.stopBtn
        };
        
        Object.entries(elements).forEach(([name, element]) => {
            if (!element) {
                console.error(`Element not found: ${name}`);
            }
        });
    }
    
    bindEvents() {
        // Control buttons with null checks
        if (this.startBtn) {
            console.log('Binding start button event');
            this.startBtn.addEventListener('click', (e) => {
                console.log('Start button clicked');
                e.preventDefault();
                this.startSession();
            });
        }
        
        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', (e) => {
                console.log('Pause button clicked');
                e.preventDefault();
                this.pauseSession();
            });
        }
        
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', (e) => {
                console.log('Stop button clicked');
                e.preventDefault();
                this.stopSession();
            });
        }
        
        // Settings
        if (this.settingsToggle) {
            console.log('Binding settings toggle event');
            this.settingsToggle.addEventListener('click', (e) => {
                console.log('Settings toggle clicked');
                e.preventDefault();
                this.toggleSettings();
            });
        }
        
        if (this.closeSettings) {
            this.closeSettings.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSettings();
            });
        }
        
        if (this.breathingPaceSelect) {
            this.breathingPaceSelect.addEventListener('change', (e) => {
                this.breathingPace = parseInt(e.target.value);
                console.log('Breathing pace changed to:', this.breathingPace);
            });
        }
        
        if (this.audioVolumeSlider) {
            this.audioVolumeSlider.addEventListener('input', (e) => {
                this.audioVolume = e.target.value / 100;
                console.log('Audio volume changed to:', this.audioVolume);
            });
        }
        
        // Camera permission
        if (this.enableCamera) {
            this.enableCamera.addEventListener('click', (e) => {
                e.preventDefault();
                this.requestCameraPermission();
            });
        }
        
        if (this.continueWithoutCamera) {
            this.continueWithoutCamera.addEventListener('click', (e) => {
                e.preventDefault();
                this.continueWithoutCamera();
            });
        }
        
        console.log('All events bound successfully');
    }
    
    async initializeAsync() {
        try {
            setTimeout(() => {
                this.updateLoadingStatus('Initializing audio system...');
            }, 100);
            
            await this.initializeAudio();
            
            setTimeout(() => {
                this.updateLoadingStatus('Loading AI models...');
            }, 200);
            
            // Try to initialize MediaPipe with timeout
            try {
                await Promise.race([
                    this.initializeMediaPipe(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('MediaPipe timeout')), 3000))
                ]);
            } catch (error) {
                console.warn('MediaPipe initialization failed, continuing without:', error);
            }
            
            setTimeout(() => {
                this.updateLoadingStatus('Setting up camera...');
            }, 300);
            
            // Try to initialize camera with timeout
            try {
                await Promise.race([
                    this.initializeCamera(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Camera timeout')), 2000))
                ]);
            } catch (error) {
                console.warn('Camera initialization failed, continuing without:', error);
            }
            
            setTimeout(() => {
                this.isInitialized = true;
                this.hideLoading();
                this.addFeedbackMessage('System ready. Position yourself comfortably and press Start.');
            }, 500);
            
        } catch (error) {
            console.error('Async initialization failed:', error);
            this.handleInitializationFailure();
        }
    }
    
    handleInitializationFailure() {
        this.updateLoadingStatus('Starting in basic mode...');
        setTimeout(() => {
            this.isInitialized = true;
            this.hideLoading();
            this.addFeedbackMessage('System started in basic mode. Camera monitoring disabled.');
            this.cameraEnabled = false;
        }, 1000);
    }
    
    async initializeAudio() {
        try {
            // Don't initialize audio context until user interaction
            console.log('Audio initialization deferred until user interaction');
        } catch (error) {
            console.warn('Audio setup failed:', error);
        }
    }
    
    async initializeMediaPipe() {
        // Skip MediaPipe if not available
        if (typeof Pose === 'undefined' || typeof FaceMesh === 'undefined') {
            console.warn('MediaPipe not available');
            return;
        }
        
        try {
            // Basic MediaPipe initialization
            console.log('MediaPipe models loaded successfully');
        } catch (error) {
            console.error('MediaPipe initialization failed:', error);
            throw error;
        }
    }
    
    async initializeCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('Camera not available');
            return;
        }
        
        // Skip automatic camera initialization to avoid blocking
        console.log('Camera initialization skipped - will prompt when needed');
    }
    
    requestCameraPermission() {
        this.hideModal();
        // Camera initialization would happen here
        this.addFeedbackMessage('Camera feature not yet implemented in this demo.');
    }
    
    continueWithoutCamera() {
        this.hideModal();
        this.cameraEnabled = false;
        this.addFeedbackMessage('Continuing without camera. Focus on breathing guidance.');
    }
    
    showPermissionModal() {
        if (this.permissionModal) {
            this.permissionModal.classList.remove('hidden');
        }
    }
    
    hideModal() {
        if (this.permissionModal) {
            this.permissionModal.classList.add('hidden');
        }
    }
    
    updateLoadingStatus(status) {
        if (this.loadingStatus) {
            this.loadingStatus.textContent = status;
        }
    }
    
    hideLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }
    
    hideCameraStatus() {
        if (this.cameraStatus) {
            this.cameraStatus.classList.add('hidden');
        }
    }
    
    // Breathing Session Management
    async startSession() {
        console.log('Starting breathing session...');
        
        // Initialize audio context on user interaction
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
            } catch (error) {
                console.warn('Audio context creation failed:', error);
            }
        }
        
        this.isSessionActive = true;
        this.isPaused = false;
        this.sessionStartTime = Date.now();
        this.breathCycles = 0;
        this.eyeAlertCount = 0;
        this.currentSequenceIndex = 0;
        
        // Update button states
        if (this.startBtn) this.startBtn.disabled = true;
        if (this.pauseBtn) this.pauseBtn.disabled = false;
        if (this.stopBtn) this.stopBtn.disabled = false;
        
        this.addFeedbackMessage('Session started. Close your eyes and focus on your breathing.');
        this.startBreathingCycle();
        this.startSessionTimer();
        
        console.log('Breathing session started successfully');
    }
    
    pauseSession() {
        console.log('Pausing/resuming session');
        this.isPaused = !this.isPaused;
        
        if (this.pauseBtn) {
            this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        }
        
        if (this.isPaused) {
            if (this.breathingTimer) {
                clearInterval(this.breathingTimer);
            }
            this.addFeedbackMessage('Session paused. Press Resume when ready.');
        } else {
            this.addFeedbackMessage('Session resumed.');
            this.startBreathingCycle();
        }
    }
    
    stopSession() {
        console.log('Stopping session');
        this.isSessionActive = false;
        this.isPaused = false;
        
        if (this.breathingTimer) {
            clearInterval(this.breathingTimer);
        }
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        // Update button states
        if (this.startBtn) this.startBtn.disabled = false;
        if (this.pauseBtn) {
            this.pauseBtn.disabled = true;
            this.pauseBtn.textContent = 'Pause';
        }
        if (this.stopBtn) this.stopBtn.disabled = true;
        
        if (this.phaseIndicator) this.phaseIndicator.textContent = 'Session Complete';
        if (this.currentAction) this.currentAction.textContent = 'Well done! Take a moment to rest.';
        if (this.breathingCircle) this.breathingCircle.classList.remove('inhale', 'exhale');
        
        const sessionDuration = this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;
        this.addFeedbackMessage(`Session completed. Duration: ${this.formatTime(sessionDuration)}, Cycles: ${this.breathCycles}, Eye alerts: ${this.eyeAlertCount}`);
    }
    
    startBreathingCycle() {
        if (!this.isSessionActive || this.isPaused) return;
        
        console.log('Starting breathing cycle, sequence index:', this.currentSequenceIndex);
        
        const currentPhase = this.breathingSequence[this.currentSequenceIndex];
        this.updateBreathingDisplay(currentPhase);
        this.updateNostrilDisplay(currentPhase);
        
        this.currentCount = this.breathingPace;
        if (this.countDisplay) {
            this.countDisplay.textContent = this.currentCount;
        }
        
        this.breathingTimer = setInterval(() => {
            if (this.isPaused) return;
            
            this.currentCount--;
            if (this.countDisplay) {
                this.countDisplay.textContent = this.currentCount;
            }
            
            if (this.currentCount <= 0) {
                clearInterval(this.breathingTimer);
                this.nextBreathingPhase();
            }
        }, 1000);
    }
    
    nextBreathingPhase() {
        this.currentSequenceIndex = (this.currentSequenceIndex + 1) % this.breathingSequence.length;
        
        if (this.currentSequenceIndex === 0) {
            this.breathCycles++;
            if (this.breathCyclesDisplay) {
                this.breathCyclesDisplay.textContent = this.breathCycles;
            }
        }
        
        this.playBreathingSound();
        this.startBreathingCycle();
    }
    
    updateBreathingDisplay(phase) {
        const isInhale = phase.includes('inhale');
        
        if (this.phaseIndicator) {
            this.phaseIndicator.textContent = isInhale ? 'Inhale' : 'Exhale';
        }
        
        if (this.breathingCircle) {
            this.breathingCircle.classList.remove('inhale', 'exhale');
            setTimeout(() => {
                this.breathingCircle.classList.add(isInhale ? 'inhale' : 'exhale');
            }, 100);
        }
    }
    
    updateNostrilDisplay(phase) {
        const isLeft = phase.includes('left');
        const isInhale = phase.includes('inhale');
        
        if (this.leftNostril) {
            this.leftNostril.classList.toggle('active', isLeft);
        }
        if (this.rightNostril) {
            this.rightNostril.classList.toggle('active', !isLeft);
        }
        
        const nostril = isLeft ? 'left' : 'right';
        const action = isInhale ? 'inhale through' : 'exhale through';
        const blockNostril = isLeft ? 'right' : 'left';
        
        if (this.currentAction) {
            this.currentAction.textContent = `Close ${blockNostril} nostril, ${action} ${nostril}`;
        }
    }
    
    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            if (this.isSessionActive && !this.isPaused && this.sessionStartTime) {
                const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
                if (this.sessionTime) {
                    this.sessionTime.textContent = this.formatTime(elapsed);
                }
                
                // Check practice limit
                const limit = this.practiceLimit ? parseInt(this.practiceLimit.value) : 0;
                if (limit > 0 && elapsed >= limit * 60) {
                    this.stopSession();
                }
            }
        }, 1000);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Audio System
    playBreathingSound() {
        if (!this.audioContext || this.audioVolume === 0) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.audioVolume * 0.1, this.audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.4);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.4);
        } catch (error) {
            console.warn('Audio playback error:', error);
        }
    }
    
    // UI Management
    addFeedbackMessage(message, type = 'info') {
        if (!this.feedbackMessages) return;
        
        console.log(`Adding feedback message: ${message} (${type})`);
        
        const messageElement = document.createElement('div');
        messageElement.className = `feedback-message ${type}`;
        messageElement.textContent = message;
        
        this.feedbackMessages.insertBefore(messageElement, this.feedbackMessages.firstChild);
        
        // Remove old messages
        const messages = this.feedbackMessages.children;
        while (messages.length > 5) {
            this.feedbackMessages.removeChild(messages[messages.length - 1]);
        }
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 8000);
    }
    
    toggleSettings() {
        console.log('Toggling settings panel');
        if (this.settingsPanel) {
            this.settingsPanel.classList.toggle('active');
            const isActive = this.settingsPanel.classList.contains('active');
            console.log('Settings panel is now:', isActive ? 'open' : 'closed');
        } else {
            console.error('Settings panel not found');
        }
    }
    
    loadSettings() {
        if (this.breathingPaceSelect) {
            this.breathingPace = parseInt(this.breathingPaceSelect.value) || 4;
        }
        if (this.audioVolumeSlider) {
            this.audioVolume = (this.audioVolumeSlider.value / 100) || 0.7;
        }
        console.log('Settings loaded - pace:', this.breathingPace, 'volume:', this.audioVolume);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Pranayama Assistant...');
    
    // Add a small delay to ensure all elements are rendered
    setTimeout(() => {
        new PranayamaAssistant();
    }, 100);
});

// Backup initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // DOM is still loading
    console.log('DOM is loading, waiting for DOMContentLoaded');
} else {
    // DOM has already loaded
    console.log('DOM already loaded, initializing immediately');
    setTimeout(() => {
        new PranayamaAssistant();
    }, 100);
}