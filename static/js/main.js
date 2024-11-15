let currentData = null;
let originalData = null;

// Drag and drop functionality
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const extractBtn = document.getElementById('extractBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const dataTable = document.getElementById('dataTable');

// Initialize Bootstrap modal
const editModal = new bootstrap.Modal(document.getElementById('editModal'));

// Event listeners for drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
    });
});

dropZone.addEventListener('drop', handleDrop);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (validateFile(file)) {
            extractBtn.disabled = false;
        }
    }
}

function validateFile(file) {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF or image file (JPG/PNG)');
        return false;
    }
    return true;
}

// Extract data functionality
extractBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }

        currentData = result.data;
        originalData = [...result.data];
        displayData(currentData);
        saveBtn.disabled = false;
        resetBtn.disabled = false;

    } catch (error) {
        alert('Error: ' + error.message);
    }
});

function displayData(data) {
    if (!data || data.length === 0) return;

    // Set up table headers
    const headers = Object.keys(data[0]);
    const headerRow = dataTable.querySelector('thead tr');
    headerRow.innerHTML = headers.map(header => `<th>${header}</th>`).join('');

    // Set up table body
    const tbody = dataTable.querySelector('tbody');
    tbody.innerHTML = data.map((row, rowIndex) => `
        <tr class="editable-row" data-row-index="${rowIndex}">
            ${headers.map(header => `<td>${row[header]}</td>`).join('')}
        </tr>
    `).join('');

    // Add click handlers for editing
    document.querySelectorAll('.editable-row').forEach(row => {
        row.addEventListener('click', () => openEditModal(parseInt(row.dataset.rowIndex)));
    });
}

function openEditModal(rowIndex) {
    const row = currentData[rowIndex];
    const form = document.getElementById('editForm');
    form.innerHTML = '';

    // Create form fields for each column
    Object.entries(row).forEach(([key, value]) => {
        const formGroup = document.createElement('div');
        formGroup.className = 'mb-3';
        
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = key;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.name = key;
        input.value = value;
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        form.appendChild(formGroup);
    });

    // Store the row index for saving
    document.getElementById('saveChangesBtn').dataset.rowIndex = rowIndex;
    editModal.show();
}

// Save changes in edit modal
document.getElementById('saveChangesBtn').addEventListener('click', () => {
    const rowIndex = parseInt(document.getElementById('saveChangesBtn').dataset.rowIndex);
    const form = document.getElementById('editForm');
    const formData = new FormData(form);
    const updatedRow = {};
    
    formData.forEach((value, key) => {
        updatedRow[key] = value;
    });

    // Validate Plate ID
    if (!validatePlateId(updatedRow['Plate ID'])) {
        alert('Invalid Plate ID format. Must be 10 characters: 7 numbers followed by 3 letters.');
        return;
    }

    // Update the data
    currentData[rowIndex] = updatedRow;
    displayData(currentData);
    editModal.hide();
});

function validatePlateId(plateId) {
    if (!plateId) return false;
    if (plateId.length !== 10) return false;
    
    const numbers = plateId.slice(0, 7);
    const letters = plateId.slice(7);
    
    return /^\d{7}$/.test(numbers) && /^[A-Za-z]{3}$/.test(letters);
}

// Save to Excel functionality
saveBtn.addEventListener('click', async () => {
    if (!currentData) return;

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: currentData })
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        // Create a blob from the response and download it
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice_data.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// Reset functionality
resetBtn.addEventListener('click', () => {
    if (originalData) {
        currentData = [...originalData];
        displayData(currentData);
    }
});

// File input change handler
fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        const fileName = e.target.files[0].name;
        dropZone.querySelector('p').textContent = `Selected file: ${fileName}`;
    }
});

// Initialize tooltips
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});