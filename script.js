// Add Supabase configuration at the top
const SUPABASE_URL = 'https://nsgjcgzucpdojbngqxqn.supabase.co'; // Replace with your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZ2pjZ3p1Y3Bkb2pibmdxeHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MDkyNjksImV4cCI6MjA2MTI4NTI2OX0.cjsGdvzuDic4HTV8g_erMP4DQcukQll9BhX0xYsUiA4'; // Replace with your key

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const tableContainer = document.getElementById('tableContainer');
const tableBody = document.getElementById('tableBody');

// Click to upload
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// File selected
fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        handleFile(file);
    } else {
        alert('Please upload a CSV file');
    }
});

async function handleFile(file) {
    if (file) {
        fileName.textContent = `File: ${file.name}`;
        fileSize.textContent = `Size: ${(file.size / 1024).toFixed(2)} KB`;
        fileInfo.classList.add('show');
        
        // Show loading message
        showMessage('Uploading...', 'info');
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            const csvText = e.target.result;
            const jsonData = csvToJson(csvText);
            
            // Upload to Supabase
            const success = await uploadToSupabase(jsonData, file.name);
            
            if (success) {
                showMessage('✅ Uploaded successfully!', 'success');
                displayTable(jsonData);
                
                // Load all uploads to show in a list (optional)
                loadRecentUploads();
            } else {
                showMessage('❌ Upload failed. Please try again.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

async function uploadToSupabase(data, fileName) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/csv_uploads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                file_name: fileName,
                data: data
            })
        });
        
        if (!response.ok) {
            console.error('Upload failed:', await response.text());
            return false;
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
        
        // Store the ID for reference
        if (result && result[0]) {
            sessionStorage.setItem('lastUploadId', result[0].id);
        }
        
        return true;
    } catch (error) {
        console.error('Error uploading to Supabase:', error);
        return false;
    }
}

async function loadRecentUploads() {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/csv_uploads?select=id,file_name,upload_time&order=upload_time.desc&limit=10`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (response.ok) {
            const uploads = await response.json();
            console.log('Recent uploads:', uploads);
            // You can display these in a dropdown or list if needed
        }
    } catch (error) {
        console.error('Error loading recent uploads:', error);
    }
}

function csvToJson(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentLine = lines[i].split(',');
        
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : '';
        }
        result.push(obj);
    }
    
    return result;
}

function displayTable(data) {
    tableBody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        const card = row.card || row.Card || '';
        const player = row.player || row.Player || '';
        const currentValue = row['current value'] || row['Current Value'] || row.currentValue || '';
        const slabSerial = row['Slab Serial #'] || row['slab serial #'] || row['Slab Serial'] || row['slab serial'] || row.slabSerial || '';
        
        tr.innerHTML = `
            <td>${card}</td>
            <td>${player}</td>
            <td>${currentValue}</td>
            <td>${slabSerial}</td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    tableContainer.classList.add('show');
}

function showMessage(text, type) {
    // Remove existing message
    const existing = document.querySelector('.upload-message');
    if (existing) existing.remove();
    
    // Create message element
    const msg = document.createElement('div');
    msg.className = `upload-message ${type}`;
    msg.textContent = text;
    msg.style.cssText = `
        margin-top: 15px;
        padding: 12px 20px;
        border-radius: 8px;
        text-align: center;
        font-weight: 600;
        ${type === 'success' ? 'background: #d4edda; color: #155724;' : 
          type === 'error' ? 'background: #f8d7da; color: #721c24;' : 
          'background: #d1ecf1; color: #0c5460;'}
    `;
    
    fileInfo.appendChild(msg);
    
    // Auto remove after 3 seconds
    if (type !== 'info') {
        setTimeout(() => msg.remove(), 3000);
    }
}

// Load data from URL parameter (for sharing)
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataId = urlParams.get('id');
    
    if (dataId) {
        // Load specific upload by ID
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/csv_uploads?id=eq.${dataId}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                if (result && result[0]) {
                    const uploadData = result[0];
                    fileName.textContent = `File: ${uploadData.file_name}`;
                    fileInfo.classList.add('show');
                    displayTable(uploadData.data);
                    showMessage('📥 Loaded shared data', 'success');
                }
            }
        } catch (error) {
            console.error('Error loading shared data:', error);
        }
    }

});
