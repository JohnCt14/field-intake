// IndexedDB wrapper
class Database {
    constructor() {
        this.db = null;
        this.dbName = 'YardbookIntakeDB';
        this.version = 1;
        this.storeName = 'intakes';
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('customerName', 'customer.name', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async addIntake(intake) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(intake);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getAllIntakes() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async deleteIntake(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            
            request.onsuccess = (event) => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async clearAll() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            request.onsuccess = (event) => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
}

// App logic
class App {
    constructor() {
        this.db = new Database();
        this.currentIntakeId = null;
        this.photos = []; // Array of {blob, url, name}
    }

    async init() {
        await this.db.init();
        this.bindEvents();
        this.loadSavedIntakes();
        this.checkUrlForIntake();
    }

    bindEvents() {
        // Form events
        document.getElementById('copy-address-btn').addEventListener('click', () => {
            const address = document.getElementById('customer-address').value;
            if (address) {
                document.getElementById('property-address').value = address;
            }
        });

        document.getElementById('lawn-size').addEventListener('change', (e) => {
            const customGroup = document.getElementById('custom-lawn-size-group');
            if (e.target.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
                document.getElementById('custom-lawn-size').value = '';
            }
        });

        document.getElementById('photo-upload').addEventListener('change', (e) => {
            this.handlePhotoUpload(e.target.files);
        });

        document.getElementById('save-intake-btn').addEventListener('click', () => {
            this.saveIntake();
        });

        document.getElementById('export-all-csv-btn').addEventListener('click', () => {
            this.exportAllCSV();
        });

        document.getElementById('copy-summary-btn').addEventListener('click', () => {
            this.copySummary();
        });

        document.getElementById('download-csv-btn').addEventListener('click', () => {
            this.downloadCSV();
        });

        document.getElementById('back-to-list-btn').addEventListener('click', () => {
            this.showListView();
        });

        document.getElementById('search-intakes').addEventListener('input', (e) => {
            this.filterIntakes(e.target.value);
        });
    }

    async saveIntake() {
        // Validate required fields
        const customerName = document.getElementById('customer-name').value.trim();
        const customerPhone = document.getElementById('customer-phone').value.trim();
        const jobType = document.getElementById('job-type').value;
        const jobStatus = document.getElementById('job-status').value;

        if (!customerName || !customerPhone || !jobType || !jobStatus) {
            this.showToast('Please fill in all required fields');
            return;
        }

        // Gather form data
        const intake = {
            timestamp: new Date().toISOString(),
            customer: {
                name: customerName,
                phone: customerPhone,
                email: document.getElementById('customer-email').value.trim(),
                address: document.getElementById('customer-address').value.trim(),
                city: document.getElementById('customer-city').value.trim(),
                state: document.getElementById('customer-state').value.trim().toUpperCase(),
                zip: document.getElementById('customer-zip').value.trim(),
                bestTime: document.getElementById('customer-best-time').value.trim()
            },
            property: {
                address: document.getElementById('property-address').value.trim(),
                lawnCondition: document.getElementById('lawn-condition').value,
                lawnSize: this.getLawnSize(),
                flowerBeds: parseInt(document.getElementById('flower-beds').value) || 0,
                walkways: document.getElementById('walkways').value,
                driveway: document.getElementById('driveway').value,
                fences: document.getElementById('fences').value,
                obstaclesNotes: document.getElementById('obstacles-notes').value.trim()
            },
            job: {
                type: jobType,
                date: document.getElementById('job-date').value,
                status: jobStatus,
                priceQuote: parseFloat(document.getElementById('price-quote').value) || null,
                notes: document.getElementById('job-notes').value.trim()
            },
            photos: this.photos.map(photo => ({
                name: photo.name,
                url: photo.url,
                // We don't store the blob directly in IndexedDB for simplicity
                // In a real app, you might store the blob or use a different approach
                // For this implementation, we'll rely on the fact that photos are 
                // stored as blobs in IndexedDB via the object store
                // But for simplicity in this example, we'll store as base64 or skip
                // Actually, let's store as base64 for demo purposes
                base64: photo.base64
            }))
        };

        try {
            const id = await this.db.addIntake(intake);
            this.showToast('Intake saved successfully!');
            this.resetForm();
            this.loadSavedIntakes();
            
            // Clear photos
            this.photos = [];
            document.getElementById('photo-preview').innerHTML = '';
        } catch (error) {
            console.error('Error saving intake:', error);
            this.showToast('Error saving intake');
        }
    }

    getLawnSize() {
        const size = document.getElementById('lawn-size').value;
        if (size === 'custom') {
            const customSize = document.getElementById('custom-lawn-size').value;
            return customSize ? `${customSize} sq ft` : '';
        }
        return size;
    }

    handlePhotoUpload(files) {
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = ''; // Clear previous preview
        
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const blob = e.target.result; // This is actually a base64 string
                // Extract the base64 data (remove the data:image/jpeg;base64, prefix)
                const base64 = blob.split(',')[1];
                
                this.photos.push({
                    blob: e.target.result, // Keep the full data URL for display
                    url: URL.createObjectURL(file), // For downloading if needed
                    name: file.name,
                    base64: base64
                });
                
                // Add to preview
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                photoItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button class="delete-photo" data-name="${file.name}">×</button>
                `;
                photoItem.querySelector('.delete-photo').addEventListener('click', () => {
                    this.deletePhoto(file.name);
                });
                preview.appendChild(photoItem);
            };
            reader.readAsDataURL(file);
        });
    }

    deletePhoto(name) {
        this.photos = this.photos.filter(photo => photo.name !== name);
        // Also revoke the object URL to free memory
        const photoToRemove = this.photos.find(p => p.name === name);
        if (photoToRemove && photoToRemove.url) {
            URL.revokeObjectURL(photoToRemove.url);
        }
        this.handlePhotoUpload([]); // Re-render preview
    }

    async loadSavedIntakes() {
        try {
            const intakes = await this.db.getAllIntakes();
            this.renderIntakesList(intakes);
        } catch (error) {
            console.error('Error loading intakes:', error);
            document.getElementById('intakes-list').innerHTML = '<p>Error loading intakes</p>';
        }
    }

    renderIntakesList(intakes) {
        const container = document.getElementById('intakes-list');
        if (intakes.length === 0) {
            container.innerHTML = '<p>No saved intakes yet</p>';
            return;
        }
        
        container.innerHTML = '';
        intakes.forEach(intake => {
            const intakeItem = document.createElement('div');
            intakeItem.className = 'intake-item';
            intakeItem.dataset.id = intake.id;
            
            const customerName = intake.customer.name || 'Unknown';
            const date = new Date(intake.timestamp).toLocaleDateString();
            
            intakeItem.innerHTML = `
                <h3>${customerName}</h3>
                <div class="intake-meta">
                    <span>Date: ${date}</span>
                    <span>${intake.job.type || 'No job type'}</span>
                    <span>${intake.job.status || 'No status'}</span>
                    <span>Photos: ${intake.photos.length}</span>
                </div>
                <div class="intake-actions">
                    <button class="secondary-btn view-btn">View</button>
                    <button class="secondary-btn delete-btn">Delete</button>
                </div>
            `;
            
            intakeItem.querySelector('.view-btn').addEventListener('click', () => {
                this.viewIntake(intake);
            });
            
            intakeItem.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm('Delete this intake?')) {
                    try {
                        await this.db.deleteIntake(intake.id);
                        this.loadSavedIntakes();
                        this.showToast('Intake deleted');
                    } catch (error) {
                        console.error('Error deleting intake:', error);
                        this.showToast('Error deleting intake');
                    }
                }
            });
            
            container.appendChild(intakeItem);
        });
    }

    filterIntakes(searchTerm) {
        searchTerm = searchTerm.toLowerCase().trim();
        const intakeItems = document.querySelectorAll('.intake-item');
        
        intakeItems.forEach(item => {
            const customerName = item.querySelector('h3').textContent.toLowerCase();
            if (customerName.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async viewIntake(intake) {
        this.currentIntakeId = intake.id;
        
        // Populate detail view
        const detailContent = document.getElementById('intake-detail-content');
        detailContent.innerHTML = this.formatIntakeForDisplay(intake);
        
        // Show detail view, hide list view
        document.getElementById('saved-list').classList.add('hidden');
        document.getElementById('intake-detail').classList.remove('hidden');
    }

    formatIntakeForDisplay(intake) {
        const formatField = (label, value) => {
            if (value === null || value === undefined || value === '') {
                return '';
            }
            return `<strong>${label}:</strong> ${value}<br>`;
        };
        
        let html = '';
        
        // Customer section
        html += '<h3>Customer Information</h3>';
        html += formatField('Name', intake.customer.name);
        html += formatField('Phone', intake.customer.phone);
        html += formatField('Email', intake.customer.email);
        html += formatField('Address', intake.customer.address);
        html += formatField('City', intake.customer.city);
        html += formatField('State', intake.customer.state);
        html += formatField('ZIP', intake.customer.zip);
        html += formatField('Best Time to Call', intake.customer.bestTime);
        
        // Property section
        html += '<h3>Property Information</h3>';
        html += formatField('Property Address', intake.property.address);
        html += formatField('Lawn Condition', intake.property.lawnCondition);
        html += formatField('Lawn Size', intake.property.lawnSize);
        html += formatField('Flower Beds', intake.property.flowerBeds);
        html += formatField('Walkways', intake.property.walkways);
        html += formatField('Driveway', intake.property.driveway);
        html += formatField('Fences', intake.property.fences);
        html += formatField('Obstacles/Notes', intake.property.obstaclesNotes);
        
        // Job section
        html += '<h3>Job Information</h3>';
        html += formatField('Job Type', intake.job.type);
        html += formatField('Job Date', intake.job.date);
        html += formatField('Job Status', intake.job.status);
        html += formatField('Price Quote', intake.job.priceQuote ? `$${intake.job.priceQuote}` : '');
        html += formatField('Job Notes', intake.job.notes);
        
        // Photos
        if (intake.photos && intake.photos.length > 0) {
            html += `<h3>Photos (${intake.photos.length})</h3>`;
            intake.photos.forEach((photo, index) => {
                // For display, we'll show a note since we can't easily display base64 images in this format
                html += `<p>Photo ${index + 1}: ${photo.name}</p>`;
            });
        }
        
        html += `<p><em>Saved on: ${new Date(intake.timestamp).toLocaleString()}</em></p>`;
        
        return html;
    }

    async copySummary() {
        if (!this.currentIntakeId) return;
        
        try {
            const intakes = await this.db.getAllIntakes();
            const intake = intakes.find(i => i.id === this.currentIntakeId);
            if (!intake) throw new Error('Intake not found');
            
            const summary = this.generateSummaryText(intake);
            await navigator.clipboard.writeText(summary);
            this.showToast('Summary copied to clipboard!');
        } catch (error) {
            console.error('Error copying summary:', error);
            this.showToast('Error copying summary');
        }
    }

    generateSummaryText(intake) {
        let summary = `YARDBOOK CUSTOMER INTAKE SUMMARY\n`;
        summary += `================================\n\n`;
        
        summary += `CUSTOMER INFORMATION:\n`;
        summary += `  Name: ${intake.customer.name || 'N/A'}\n`;
        summary += `  Phone: ${intake.customer.phone || 'N/A'}\n`;
        summary += `  Email: ${intake.customer.email || 'N/A'}\n`;
        summary += `  Address: ${intake.customer.address || 'N/A'}\n`;
        summary += `  City: ${intake.customer.city || 'N/A'}, ${intake.customer.state || 'N/A'} ${intake.customer.zip || 'N/A'}\n`;
        summary += `  Best Time to Call: ${intake.customer.bestTime || 'N/A'}\n\n`;
        
        summary += `PROPERTY INFORMATION:\n`;
        summary += `  Property Address: ${intake.property.address || 'N/A'}\n`;
        summary += `  Lawn Condition: ${intake.property.lawnCondition || 'N/A'}\n`;
        summary += `  Lawn Size: ${intake.property.lawnSize || 'N/A'}\n`;
        summary += `  Flower Beds: ${intake.property.flowerBeds || 'N/A'}\n`;
        summary += `  Walkways: ${intake.property.walkways || 'N/A'}\n`;
        summary += `  Driveway: ${intake.property.driveway || 'N/A'}\n`;
        summary += `  Fences: ${intake.property.fences || 'N/A'}\n`;
        summary += `  Obstacles/Notes: ${intake.property.obstaclesNotes || 'N/A'}\n\n`;
        
        summary += `JOB INFORMATION:\n`;
        summary += `  Job Type: ${intake.job.type || 'N/A'}\n`;
        summary += `  Job Date: ${intake.job.date || 'N/A'}\n`;
        summary += `  Job Status: ${intake.job.status || 'N/A'}\n`;
        summary += `  Price Quote: ${intake.job.priceQuote ? `$${intake.job.priceQuote}` : 'N/A'}\n`;
        summary += `  Job Notes: ${intake.job.notes || 'N/A'}\n\n`;
        
        summary += `PHOTOS: ${intake.photos.length} photo(s) attached\n\n`;
        
        summary += `Saved: ${new Date(intake.timestamp).toLocaleString()}\n`;
        
        return summary;
    }

    async downloadCSV() {
        if (!this.currentIntakeId) return;
        
        try {
            const intakes = await this.db.getAllIntakes();
            const intake = intakes.find(i => i.id === this.currentIntakeId);
            if (!intake) throw new Error('Intake not found');
            
            const csv = this.generateCSVRow(intake);
            this.downloadFile(csv, `intake_${intake.id}.csv`, 'text/csv');
        } catch (error) {
            console.error('Error downloading CSV:', error);
            this.showToast('Error downloading CSV');
        }
    }

    generateCSVRow(intake) {
        // Create CSV headers if needed (for single row, we'll just make a simple CSV)
        const row = [
            intake.customer.name || '',
            intake.customer.phone || '',
            intake.customer.email || '',
            intake.customer.address || '',
            intake.customer.city || '',
            intake.customer.state || '',
            intake.customer.zip || '',
            intake.customer.bestTime || '',
            intake.property.address || '',
            intake.property.lawnCondition || '',
            intake.property.lawnSize || '',
            intake.property.flowerBeds || '',
            intake.property.walkways || '',
            intake.property.driveway || '',
            intake.property.fences || '',
            intake.property.obstaclesNotes || '',
            intake.job.type || '',
            intake.job.date || '',
            intake.job.status || '',
            intake.job.priceQuote || '',
            intake.job.notes || '',
            intake.photos.length,
            new Date(intake.timestamp).toISOString()
        ];
        
        // Escape quotes and commas
        const escaped = row.map(field => {
            if (typeof field !== 'string') field = String(field);
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        });
        
        return escaped.join(',');
    }

    async exportAllCSV() {
        try {
            const intakes = await this.db.getAllIntakes();
            if (intakes.length === 0) {
                this.showToast('No intakes to export');
                return;
            }
            
            const csv = this.generateAllCSV(intakes);
            this.downloadFile(csv, 'yardbook_intakes.csv', 'text/csv');
            this.showToast(`Exported ${intakes.length} intakes`);
        } catch (error) {
            console.error('Error exporting all CSV:', error);
            this.showToast('Error exporting CSV');
        }
    }

    generateAllCSV(intakes) {
        const headers = [
            'Customer Name',
            'Customer Phone',
            'Customer Email',
            'Customer Address',
            'Customer City',
            'Customer State',
            'Customer ZIP',
            'Best Time to Call',
            'Property Address',
            'Lawn Condition',
            'Lawn Size',
            'Flower Beds',
            'Walkways',
            'Driveway',
            'Fences',
            'Obstacles/Notes',
            'Job Type',
            'Job Date',
            'Job Status',
            'Price Quote',
            'Job Notes',
            'Photo Count',
            'Timestamp'
        ];
        
        const rows = intakes.map(intake => [
            intake.customer.name || '',
            intake.customer.phone || '',
            intake.customer.email || '',
            intake.customer.address || '',
            intake.customer.city || '',
            intake.customer.state || '',
            intake.customer.zip || '',
            intake.customer.bestTime || '',
            intake.property.address || '',
            intake.property.lawnCondition || '',
            intake.property.lawnSize || '',
            intake.property.flowerBeds || '',
            intake.property.walkways || '',
            intake.property.driveway || '',
            intake.property.fences || '',
            intake.property.obstaclesNotes || '',
            intake.job.type || '',
            intake.job.date || '',
            intake.job.status || '',
            intake.job.priceQuote || '',
            intake.job.notes || '',
            intake.photos.length,
            new Date(intake.timestamp).toISOString()
        ]);
        
        // Escape function
        const escapeField = (field) => {
            if (typeof field !== 'string') field = String(field);
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        };
        
        const escapedHeaders = headers.map(escapeField);
        const escapedRows = rows.map(row => row.map(escapeField));
        
        return [escapedHeaders.join(','), ...escapedRows.map(row => row.join(','))].join('\n');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showListView() {
        document.getElementById('saved-list').classList.remove('hidden');
        document.getElementById('intake-detail').classList.add('hidden');
        this.currentIntakeId = null;
    }

    resetForm() {
        const form = document.getElementById('intake-form');
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else {
                el.value = '';
            }
        });
        document.getElementById('custom-lawn-size-group').style.display = 'none';
        document.getElementById('photo-preview').innerHTML = '';
        this.photos = [];
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 2000);
    }

    checkUrlForIntake() {
        // Check if there's an intake ID in the URL hash for direct access
        const hash = window.location.hash;
        if (hash.startsWith('#intake-')) {
            const id = parseInt(hash.substring(8));
            if (!isNaN(id)) {
                this.db.getAllIntakes().then(intakes => {
                    const intake = intakes.find(i => i.id === id);
                    if (intake) {
                        this.viewIntake(intake);
                    }
                });
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

// Handle service worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}