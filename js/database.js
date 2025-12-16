// SQLite Database Management
class Database {
    static async init() {
        try {
            // Load SQL.js
            if (typeof initSqlJs === 'undefined') {
                throw new Error('SQL.js not loaded. Make sure sql-wasm.js is included.');
            }
            
            // Initialize SQL.js
            this.SQL = await initSqlJs({
                locateFile: file => `assets/${file}`
            });
            
            // Try to load from localStorage first
            let dbBytes = await this.loadFromStorage();
            
            // Create new database or load existing
            if (dbBytes) {
                this.db = new this.SQL.Database(dbBytes);
                console.log('Database loaded from storage');
            } else {
                this.db = new this.SQL.Database();
                console.log('New database created');
            }
            
            // Create tables
            this.createTables();
            
            // Save initial state
            await this.saveToStorage();
            
            console.log('Database initialized successfully');
            return this;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    static createTables() {
        try {
            // Submissions table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_name TEXT,
                    tagline TEXT,
                    event_date TEXT,
                    event_time TEXT,
                    venue_link TEXT,
                    primary_goal TEXT,
                    target_audience TEXT,
                    design_mood TEXT,
                    cta_text TEXT,
                    brand_colors TEXT,
                    brand_fonts TEXT,
                    poster_dimensions TEXT,
                    final_deadline TEXT,
                    contact_person TEXT,
                    revision_rounds TEXT DEFAULT '2',
                    hashtags TEXT,
                    qr_code_url TEXT,
                    printing_responsibility TEXT,
                    event_type TEXT,
                    budget_range TEXT,
                    inspiration_links TEXT,
                    file_formats TEXT DEFAULT 'PDF,JPG',
                    usage_platforms TEXT DEFAULT 'Social Media',
                    logo_file TEXT,
                    sponsor_logos TEXT,
                    progress INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'draft',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Settings table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Insert default settings
            this.db.exec(`
                INSERT OR IGNORE INTO settings (key, value) VALUES 
                ('theme', 'system'),
                ('auto_save', 'true'),
                ('version', '1.0')
            `);

            console.log('Tables created successfully');
        } catch (error) {
            console.error('Create tables failed:', error);
            throw error;
        }
    }

    static async saveSubmission(data, isDraft = false) {
        try {
            const now = new Date().toISOString();
            const progress = this.calculateProgress(data);
            
            // Prepare data
            const params = [
                data.projectName || '',
                data.tagline || '',
                data.eventDate || '',
                data.eventTime || '',
                data.venueLink || '',
                data.primaryGoal || '',
                data.targetAudience || '',
                data.designMood || '',
                data.ctaText || '',
                data.brandColors || '',
                data.brandFonts || '',
                data.posterDimensions || '',
                data.finalDeadline || '',
                data.contactPerson || '',
                data.revisionRounds || '2',
                data.hashtags || '',
                data.qrCodeUrl || '',
                data.printingResponsibility || '',
                data.eventType || '',
                data.budgetRange || '',
                data.inspirationLinks || '',
                data.fileFormats?.join(',') || 'PDF,JPG',
                data.usagePlatforms?.join(',') || 'Social Media',
                data.logoFile || '',
                data.sponsorLogos || '',
                progress,
                isDraft ? 'draft' : 'submitted',
                now
            ];

            if (data.id) {
                // Update existing
                params.push(data.id);
                this.db.run(`
                    UPDATE submissions SET
                        project_name = ?, tagline = ?, event_date = ?, event_time = ?,
                        venue_link = ?, primary_goal = ?, target_audience = ?,
                        design_mood = ?, cta_text = ?, brand_colors = ?, brand_fonts = ?,
                        poster_dimensions = ?, final_deadline = ?, contact_person = ?,
                        revision_rounds = ?, hashtags = ?, qr_code_url = ?,
                        printing_responsibility = ?, event_type = ?, budget_range = ?,
                        inspiration_links = ?, file_formats = ?, usage_platforms = ?,
                        logo_file = ?, sponsor_logos = ?, progress = ?, status = ?,
                        updated_at = ?
                    WHERE id = ?
                `, params);
                
                console.log('Submission updated:', data.id);
                return data.id;
            } else {
                // Insert new
                const result = this.db.run(`
                    INSERT INTO submissions (
                        project_name, tagline, event_date, event_time, venue_link,
                        primary_goal, target_audience, design_mood, cta_text,
                        brand_colors, brand_fonts, poster_dimensions, final_deadline,
                        contact_person, revision_rounds, hashtags, qr_code_url,
                        printing_responsibility, event_type, budget_range,
                        inspiration_links, file_formats, usage_platforms,
                        logo_file, sponsor_logos, progress, status, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, params);
                
                const newId = result.lastInsertRowid;
                console.log('Submission saved:', newId);
                
                // Save to storage
                await this.saveToStorage();
                
                return newId;
            }
        } catch (error) {
            console.error('Save submission failed:', error);
            throw error;
        }
    }

    static async getSubmissions(status = null) {
        try {
            let query = 'SELECT * FROM submissions ORDER BY updated_at DESC';
            let params = [];
            
            if (status) {
                query = 'SELECT * FROM submissions WHERE status = ? ORDER BY updated_at DESC';
                params = [status];
            }
            
            const result = this.db.exec(query, params);
            
            if (result.length === 0) return [];
            
            return result[0].values.map(row => {
                const submission = {};
                result[0].columns.forEach((col, index) => {
                    submission[col] = row[index];
                });
                return submission;
            });
        } catch (error) {
            console.error('Get submissions failed:', error);
            return [];
        }
    }

    static async getSubmission(id) {
        try {
            const result = this.db.exec(
                'SELECT * FROM submissions WHERE id = ?',
                [id]
            );
            
            if (result.length === 0) return null;
            
            const submission = {};
            result[0].columns.forEach((col, index) => {
                submission[col] = result[0].values[0][index];
            });
            
            return submission;
        } catch (error) {
            console.error('Get submission failed:', error);
            return null;
        }
    }

    static async deleteSubmission(id) {
        try {
            this.db.run('DELETE FROM submissions WHERE id = ?', [id]);
            await this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Delete submission failed:', error);
            return false;
        }
    }

    static async clearAllSubmissions() {
        try {
            this.db.exec('DELETE FROM submissions');
            this.db.exec('VACUUM');
            await this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Clear submissions failed:', error);
            return false;
        }
    }

    static async getStatistics() {
        try {
            const result = this.db.exec(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
                    AVG(progress) as avg_progress
                FROM submissions
            `);
            
            const dbSize = this.db.export().length;
            const sizeKB = Math.round(dbSize / 1024 * 100) / 100;
            
            if (result.length === 0) {
                return {
                    total: 0,
                    submitted: 0,
                    drafts: 0,
                    avg_progress: 0,
                    databaseSize: `${sizeKB} KB`
                };
            }
            
            return {
                total: result[0].values[0][0] || 0,
                submitted: result[0].values[0][1] || 0,
                drafts: result[0].values[0][2] || 0,
                avg_progress: Math.round(result[0].values[0][3]) || 0,
                databaseSize: `${sizeKB} KB`
            };
        } catch (error) {
            console.error('Get statistics failed:', error);
            return { total: 0, submitted: 0, drafts: 0, avg_progress: 0, databaseSize: 'N/A' };
        }
    }

    static calculateProgress(data) {
        const requiredFields = [
            'projectName', 'tagline', 'eventDate', 'eventTime', 'venueLink', 'primaryGoal',
            'targetAudience', 'designMood', 'ctaText', 'brandColors', 'brandFonts',
            'posterDimensions', 'finalDeadline'
        ];
        
        let filledCount = 0;
        requiredFields.forEach(field => {
            if (data[field] && data[field].toString().trim() !== '') {
                filledCount++;
            }
        });
        
        // Check file formats
        if (data.fileFormats && data.fileFormats.length > 0) filledCount++;
        
        // Check usage platforms
        if (data.usagePlatforms && data.usagePlatforms.length > 0) filledCount++;
        
        const totalRequired = requiredFields.length + 2;
        return Math.round((filledCount / totalRequired) * 100);
    }

    static async exportDatabase() {
        try {
            Toast.show('Preparing database export...', 'info');
            
            const binaryArray = this.db.export();
            const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'posterIntake.db';
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                Toast.show('Database exported as posterIntake.db', 'success');
            }, 100);
            
            return true;
            
        } catch (error) {
            console.error('Export failed:', error);
            Toast.show('Export failed: ' + error.message, 'error');
            return false;
        }
    }

    static async importDatabase(file) {
        return new Promise(async (resolve, reject) => {
            try {
                // Verify file
                if (!file || !file.name.match(/\.(db|sqlite|sqlite3)$/i)) {
                    throw new Error('Please select a valid SQLite database file (.db, .sqlite, .sqlite3)');
                }

                // Ask for confirmation
                const confirmed = await Toast.confirm(
                    `Import database from "${file.name}"? This will replace ALL current data.`,
                    'Import & Replace',
                    'Cancel'
                );

                if (!confirmed) {
                    Toast.show('Import cancelled', 'info');
                    resolve(false);
                    return;
                }

                Toast.show('Importing database...', 'info');

                const reader = new FileReader();

                reader.onload = async (event) => {
                    try {
                        const arrayBuffer = event.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);

                        // Verify it's a valid SQLite database
                        const tempDb = new this.SQL.Database(uint8Array);
                        
                        // Check for required tables
                        const tablesResult = tempDb.exec(
                            "SELECT name FROM sqlite_master WHERE type='table'"
                        );
                        
                        if (tablesResult.length === 0) {
                            throw new Error('Not a valid SQLite database');
                        }
                        
                        tempDb.close();

                        // Close current database
                        this.db.close();

                        // Create new database from imported file
                        this.db = new this.SQL.Database(uint8Array);

                        // Ensure tables exist
                        this.createTables();

                        // Save to storage
                        await this.saveToStorage();

                        Toast.show('Database imported successfully! Reloading...', 'success', 3000);

                        // Reload page after delay
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);

                        resolve(true);

                    } catch (error) {
                        console.error('Import processing failed:', error);
                        Toast.show('Invalid database file: ' + error.message, 'error');
                        reject(error);
                    }
                };

                reader.onerror = (error) => {
                    console.error('File read error:', error);
                    Toast.show('Error reading file', 'error');
                    reject(error);
                };

                reader.readAsArrayBuffer(file);

            } catch (error) {
                console.error('Import failed:', error);
                Toast.show('Import failed: ' + error.message, 'error');
                reject(error);
            }
        });
    }

    static async backupDatabase() {
        try {
            await this.saveToStorage();
            localStorage.setItem('lastBackup', new Date().toISOString());
            Toast.show('Database backed up successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            Toast.show('Backup failed: ' + error.message, 'error');
            return false;
        }
    }

    static async resetDatabase() {
        const confirmed = await Toast.confirm(
            'Reset the entire database? All submissions will be permanently deleted.',
            'Reset Database',
            'Cancel'
        );

        if (confirmed) {
            try {
                // Close current database
                this.db.close();

                // Create new empty database
                this.db = new this.SQL.Database();
                this.createTables();

                // Clear localStorage
                localStorage.removeItem('posterIntakeDB');
                localStorage.removeItem('dbVersion');
                localStorage.removeItem('lastBackup');

                Toast.show('Database reset successfully! Reloading...', 'success', 3000);

                setTimeout(() => {
                    window.location.reload();
                }, 2000);

                return true;
            } catch (error) {
                console.error('Reset failed:', error);
                Toast.show('Reset failed: ' + error.message, 'error');
                return false;
            }
        }

        return false;
    }

    static async saveToStorage() {
        try {
            const binaryArray = this.db.export();
            const base64 = btoa(String.fromCharCode(...binaryArray));
            
            localStorage.setItem('posterIntakeDB', base64);
            localStorage.setItem('dbVersion', '1.0');
            
            return true;
        } catch (error) {
            console.error('Save to storage failed:', error);
            return false;
        }
    }

    static async loadFromStorage() {
        try {
            const base64 = localStorage.getItem('posterIntakeDB');
            if (!base64) return null;
            
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            return bytes;
        } catch (error) {
            console.error('Load from storage failed:', error);
            return null;
        }
    }

    static async exportToCSV() {
        try {
            const submissions = await this.getSubmissions();
            if (submissions.length === 0) return null;
            
            const headers = Object.keys(submissions[0]).join(',');
            const rows = submissions.map(sub => 
                Object.values(sub).map(val => 
                    typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
                ).join(',')
            ).join('\n');
            
            return `${headers}\n${rows}`;
        } catch (error) {
            console.error('Export to CSV failed:', error);
            return null;
        }
    }

    static async updateSetting(key, value) {
        try {
            this.db.run(`
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `, [key, value]);
            return true;
        } catch (error) {
            console.error('Update setting failed:', error);
            return false;
        }
    }

    static async getSetting(key) {
        try {
            const result = this.db.exec(
                'SELECT value FROM settings WHERE key = ?',
                [key]
            );
            
            if (result.length === 0 || result[0].values.length === 0) return null;
            return result[0].values[0][0];
        } catch (error) {
            console.error('Get setting failed:', error);
            return null;
        }
    }
}

// Make database available globally
window.Database = Database;