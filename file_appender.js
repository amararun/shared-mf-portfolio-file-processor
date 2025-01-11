// File Appender Functionality
const FileAppender = {
    selectedFiles: [],

    // Initialize the file appender
    init() {
        this.setupModal();
        this.setupEventListeners();
    },

    // Setup the modal HTML
    setupModal() {
        const modal = document.createElement('div');
        modal.id = 'fileAppenderModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; padding: 20px; position: relative;">
                <button type="button" class="modal-close" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #6B7280;
                ">
                    <span class="material-icons" style="font-size: 20px;">close</span>
                </button>
                <h3 style="margin-top: 0;">File Appender</h3>
                <p style="margin: 5px 0 15px 0; font-size: 12px; color: #666;">
                    Select multiple .txt or .csv files to append them together. The first row of subsequent files will be skipped.
                </p>
                <div style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
                    <label class="control-button" style="cursor: pointer; background-color: #1e40af;">
                        <span class="button-icon">
                            <span class="material-icons">add</span>
                        </span>
                        <span class="button-text">Add Files</span>
                        <input type="file" id="appendFileInput" multiple accept=".txt,.csv" style="display: none;">
                    </label>
                    <button type="button" id="cancelAppend" class="control-button" style="background-color: #6B7280;">
                        <span class="button-text">Cancel</span>
                    </button>
                    <button type="button" id="startAppend" class="control-button" style="background-color: #6B7280;" disabled>
                        <span class="button-icon">
                            <span class="material-icons">merge_type</span>
                        </span>
                        <span class="button-text">Append Files</span>
                    </button>
                    <button type="button" id="downloadAppendedBtn" class="control-button" style="background-color: #6B7280;" disabled>
                        <span class="button-icon">
                            <span class="material-icons">download</span>
                        </span>
                        <span class="button-text">Download</span>
                    </button>
                </div>
                <div class="file-list-container" style="margin-bottom: 15px; max-height: 200px; overflow-y: auto; padding: 5px;">
                    <div id="selectedFilesList" style="font-size: 13px;"></div>
                </div>
                <div id="appendProgress" style="display: none; margin-top: 15px;">
                    <div class="progress-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                    <div style="text-align: center; margin-top: 10px; font-size: 13px;">Processing...</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Setup event listeners
    setupEventListeners() {
        // File input change handler
        document.getElementById('appendFileInput').addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const validFiles = files.filter(file => {
                const ext = file.name.toLowerCase().split('.').pop();
                return ['txt', 'csv'].includes(ext);
            });

            if (validFiles.length !== files.length) {
                alert('Only .txt and .csv files are allowed.');
            }

            this.selectedFiles.push(...validFiles);
            this.updateFileList();
            this.updateButtonStates();
            
            // Reset the file input value so it can be used again
            e.target.value = '';
        });

        // Cancel button handler
        document.getElementById('cancelAppend').addEventListener('click', () => {
            this.closeModal();
        });

        // Close button (X) handler
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        // Start append button handler
        document.getElementById('startAppend').addEventListener('click', () => {
            if (this.selectedFiles.length < 2) {
                alert('Please select at least 2 files to append.');
                return;
            }
            this.appendFiles();
        });

        // Download button handler
        document.getElementById('downloadAppendedBtn').addEventListener('click', () => {
            if (this.appendedContent) {
                const blob = new Blob([this.appendedContent], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'appended_file.txt';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.closeModal();
            }
        });

        // Close modal when clicking outside
        document.getElementById('fileAppenderModal').addEventListener('click', (e) => {
            if (e.target.id === 'fileAppenderModal') {
                this.closeModal();
            }
        });
    },

    // Update button states based on current state
    updateButtonStates() {
        const startButton = document.getElementById('startAppend');
        const downloadButton = document.getElementById('downloadAppendedBtn');

        startButton.disabled = this.selectedFiles.length < 2;
        startButton.style.backgroundColor = this.selectedFiles.length < 2 ? '#6B7280' : '#1e40af';
        startButton.style.cursor = this.selectedFiles.length < 2 ? 'not-allowed' : 'pointer';

        downloadButton.disabled = !this.appendedContent;
        // Use green color (#16a34a) for active download button
        downloadButton.style.backgroundColor = !this.appendedContent ? '#6B7280' : '#16a34a';
        downloadButton.style.cursor = !this.appendedContent ? 'not-allowed' : 'pointer';
    },

    // Update the list of selected files
    updateFileList() {
        const container = document.getElementById('selectedFilesList');
        if (this.selectedFiles.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #6B7280; padding: 20px;">No files selected</div>';
            return;
        }
        
        container.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="selected-file" style="display: flex; justify-content: space-between; align-items: center; padding: 1px 8px;">
                <span style="flex: 1;">${file.name}</span>
                <button onclick="FileAppender.removeFile(${index})" class="control-button" style="padding: 4px; min-width: 24px; height: 24px; background-color: #EF4444;">
                    <span class="material-icons" style="font-size: 16px;">close</span>
                </button>
            </div>
        `).join('');
    },

    // Remove a file from the list
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.appendedContent = null; // Reset appended content when files change
        this.updateFileList();
        this.updateButtonStates();
    },

    // Show the modal
    showModal() {
        document.getElementById('fileAppenderModal').style.display = 'block';
        this.selectedFiles = [];
        this.appendedContent = null;
        this.updateFileList();
        this.updateButtonStates();
        document.getElementById('appendProgress').style.display = 'none';
    },

    // Close the modal
    closeModal() {
        document.getElementById('fileAppenderModal').style.display = 'none';
        this.selectedFiles = [];
        this.appendedContent = null;
        this.updateFileList();
        this.updateButtonStates();
    },

    // Append the selected files
    async appendFiles() {
        const progressDiv = document.getElementById('appendProgress');
        const startButton = document.getElementById('startAppend');
        
        progressDiv.style.display = 'block';
        startButton.disabled = true;
        startButton.style.backgroundColor = '#6B7280';
        startButton.style.cursor = 'not-allowed';

        try {
            const contents = await Promise.all(this.selectedFiles.map(async (file, index) => {
                const text = await file.text();
                const lines = text.split('\n').filter(line => line.trim());
                // Skip header for all files except the first one
                return index === 0 ? lines : lines.slice(1);
            }));

            this.appendedContent = contents.flat().join('\n');
            progressDiv.style.display = 'none';
            this.updateButtonStates();
        } catch (error) {
            alert('Error appending files: ' + error.message);
            progressDiv.style.display = 'none';
            startButton.disabled = false;
            startButton.style.backgroundColor = '#1e40af';
            startButton.style.cursor = 'pointer';
        }
    }
};

// Initialize the file appender when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    FileAppender.init();
}); 