// Main Application Initialization
class PosterIntakeApp {
    constructor() {
        this.db = null;
        this.currentSubmissionId = null;
        this.isInitialized = false;
        this.splashCountdown = 3;
        this.splashInterval = null;
    }

    async init() {
        try {
            // Start splash screen countdown
            this.startSplashCountdown();
            
            // Initialize database first
            this.db = await Database.init();
            
            // Initialize all modules
            ThemeManager.init();
            FormManager.init();
            UIManager.init(this);
            HistoryManager.init();
            
            // Setup event listeners
            this.setupEventListeners();
            this.setupDatabaseManagement();
            
            // Update database stats
            this.updateDatabaseStats();
            
            // Load last draft
            setTimeout(() => {
                this.hideSplashScreen();
                this.loadLastDraft();
            }, 1500);
            
            this.isInitialized = true;
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.hideSplashScreen();
            Toast.show('Failed to initialize app. Please refresh.', 'error');
        }
    }

    startSplashCountdown() {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;
        
        countdownElement.textContent = this.splashCountdown;
        
        this.splashInterval = setInterval(() => {
            this.splashCountdown--;
            countdownElement.textContent = this.splashCountdown;
            
            if (this.splashCountdown <= 0) {
                clearInterval(this.splashInterval);
            }
        }, 1000);
    }

    hideSplashScreen() {
        const splashScreen = document.getElementById('splashScreen');
        const startBtn = document.getElementById('startBtn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                splashScreen.style.opacity = '0';
                splashScreen.style.transition = 'opacity 0.3s ease';
                
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    clearInterval(this.splashInterval);
                    Toast.show('App ready! Start filling the form.', 'success', 3000);
                }, 300);
            });
        }
        
        // Auto-hide after 3 seconds if not manually closed
        setTimeout(() => {
            if (splashScreen.style.display !== 'none') {
                splashScreen.style.opacity = '0';
                splashScreen.style.transition = 'opacity 0.3s ease';
                
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    clearInterval(this.splashInterval);
                    Toast.show('App ready! Start filling the form.', 'success', 3000);
                }, 300);
            }
        }, 3000);
    }

    setupEventListeners() {
        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveCurrentForm();
        });

        // Save from preview
        document.getElementById('saveFromPreviewBtn').addEventListener('click', () => {
            this.saveCurrentForm();
        });

        // Load draft button
        document.getElementById('loadDraftBtn').addEventListener('click', () => {
            this.loadLastDraft();
        });

        // Auto-save on form changes (debounced)
        let saveTimeout;
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.addEventListener('input', () => {
                FormManager.markAsDirty();
                this.updateSaveStatus('Unsaved changes');
                
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.autoSaveDraft();
                }, 3000);
            });
        });

        // Window beforeunload - warn about unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (FormManager.isDirty()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    setupDatabaseManagement() {
        const dbModal = document.getElementById('dbModal');
        const dbManagementBtn = document.getElementById('dbManagementBtn');
        const closeDbModal = document.getElementById('closeDbModal');
        const exportDbBtn = document.getElementById('exportDbBtn');
        const importDbInput = document.getElementById('importDbInput');
        const backupDbBtn = document.getElementById('backupDbBtn');
        const resetDbBtn = document.getElementById('resetDbBtn');

        // Open database modal
        if (dbManagementBtn) {
            dbManagementBtn.addEventListener('click', () => {
                dbModal.style.display = 'flex';
                this.updateDatabaseStats();
            });
        }

        // Close database modal
        if (closeDbModal) {
            closeDbModal.addEventListener('click', () => {
                dbModal.style.display = 'none';
            });
        }

        // Close modal when clicking outside
        if (dbModal) {
            dbModal.addEventListener('click', (event) => {
                if (event.target === dbModal) {
                    dbModal.style.display = 'none';
                }
            });
        }

        // Export database
        if (exportDbBtn) {
            exportDbBtn.addEventListener('click', async () => {
                await Database.exportDatabase();
            });
        }

        // Import database
        if (importDbInput) {
            importDbInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await Database.importDatabase(file);
                    importDbInput.value = '';
                }
            });
        }

        // Backup database
        if (backupDbBtn) {
            backupDbBtn.addEventListener('click', async () => {
                await Database.backupDatabase();
                this.updateDatabaseStats();
            });
        }

        // Reset database
        if (resetDbBtn) {
            resetDbBtn.addEventListener('click', async () => {
                await Database.resetDatabase();
            });
        }
    }

    async saveCurrentForm() {
        const formData = FormManager.getFormData();
        const progress = FormManager.getProgress();
        
        if (progress < 50) {
            const confirmed = await Toast.confirm(
                `Form is only ${progress}% complete. Save anyway?`,
                'Save Draft',
                'Cancel'
            );
            if (!confirmed) return;
        }

        try {
            const submissionId = await Database.saveSubmission(formData);
            this.currentSubmissionId = submissionId;
            
            Toast.show('Submission saved successfully!', 'success');
            FormManager.markAsClean();
            this.updateSaveStatus('Saved just now');
            
            // Update database stats
            this.updateDatabaseStats();
            
            // Refresh history if modal is open
            if (document.getElementById('historyModal').style.display === 'flex') {
                HistoryManager.loadSubmissions();
            }
            
            return submissionId;
        } catch (error) {
            console.error('Save failed:', error);
            Toast.show('Failed to save submission', 'error');
        }
    }

    async autoSaveDraft() {
        if (!FormManager.isDirty()) return;
        
        const formData = FormManager.getFormData();
        formData.status = 'draft';
        
        try {
            await Database.saveSubmission(formData, true);
            FormManager.markAsClean();
            this.updateSaveStatus('Auto-saved');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    async loadLastDraft() {
        try {
            const drafts = await Database.getSubmissions('draft');
            if (drafts.length > 0) {
                const latestDraft = drafts[drafts.length - 1];
                const confirmed = await Toast.confirm(
                    `Load draft "${latestDraft.project_name || 'Untitled'}"?`,
                    'Load Draft',
                    'Cancel'
                );
                
                if (confirmed) {
                    FormManager.loadFormData(latestDraft);
                    this.currentSubmissionId = latestDraft.id;
                    Toast.show('Draft loaded successfully', 'success');
                    this.updateSaveStatus('Draft loaded');
                }
            }
        } catch (error) {
            console.error('Load draft failed:', error);
        }
    }

    async loadSubmission(id) {
        try {
            const submission = await Database.getSubmission(id);
            if (submission) {
                FormManager.loadFormData(submission);
                this.currentSubmissionId = id;
                Toast.show('Submission loaded', 'success');
                this.updateSaveStatus('Loaded from history');
            }
        } catch (error) {
            console.error('Load submission failed:', error);
        }
    }

    updateSaveStatus(text) {
        const statusElement = document.getElementById('saveStatus');
        if (statusElement) {
            statusElement.textContent = text;
            
            if (text.includes('Saved') || text.includes('Loaded')) {
                statusElement.style.color = 'var(--success)';
            } else if (text.includes('Unsaved')) {
                statusElement.style.color = 'var(--warning)';
            } else {
                statusElement.style.color = 'var(--text-secondary)';
            }
        }
    }

    async updateDatabaseStats() {
        try {
            const stats = await Database.getStatistics();
            const lastBackup = localStorage.getItem('lastBackup');
            
            document.getElementById('dbStatus').textContent = 'Connected';
            document.getElementById('dbStatus').style.color = 'var(--success)';
            
            document.getElementById('dbSize').textContent = `${stats.databaseSize || 'N/A'}`;
            
            if (lastBackup) {
                const date = new Date(lastBackup);
                document.getElementById('dbLastBackup').textContent = 
                    date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        } catch (error) {
            console.error('Update stats failed:', error);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PosterIntakeApp();
    window.app.init();
});

// Make app available globally
window.PosterIntakeApp = PosterIntakeApp;