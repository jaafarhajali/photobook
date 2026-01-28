// Global state
let bookData = {
    numPages: 10,
    orientation: 'landscape',
    layout: 'classic',
    pages: []
};

let currentPageIndex = 0;

// Initialize
function initializeBook() {
    bookData.pages = [];
    for (let i = 0; i < bookData.numPages; i++) {
        bookData.pages.push({
            images: [],
            caption: '',
            backgroundColor: '#ffffff'
        });
    }
}

// Show/Hide screens
function showSetupScreen() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('setupScreen').classList.remove('hidden');
    document.getElementById('designScreen').classList.add('hidden');
}

function showDesignScreen() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('designScreen').classList.remove('hidden');
}

// Layout selection
function selectLayout(layoutType) {
    document.querySelectorAll('.layout-card').forEach(card => {
        card.classList.remove('active');
    });
    event.target.closest('.layout-card').classList.add('active');
    bookData.layout = layoutType;
}

// Start designing
function startDesigning() {
    bookData.numPages = parseInt(document.getElementById('numPages').value) || 10;
    bookData.orientation = document.getElementById('orientation').value;
    
    if (bookData.numPages < 1 || bookData.numPages > 100) {
        alert('Please enter a valid number of pages (1-100)');
        return;
    }

    initializeBook();
    currentPageIndex = 0;
    
    document.getElementById('totalPages').textContent = bookData.numPages;
    document.getElementById('currentLayout').textContent = bookData.layout.charAt(0).toUpperCase() + bookData.layout.slice(1);
    document.getElementById('currentOrientation').textContent = bookData.orientation.charAt(0).toUpperCase() + bookData.orientation.slice(1);
    document.getElementById('totalPagesIndicator').textContent = bookData.numPages;
    
    showDesignScreen();
    renderCurrentPage();
    updateNavigationButtons();
}

// Handle image upload
function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                bookData.pages[currentPageIndex].images.push(e.target.result);
                renderCurrentPage();
            };
            reader.readAsDataURL(file);
        }
    });
    
    event.target.value = '';
}

// Delete image
function deleteImage(imageIndex) {
    bookData.pages[currentPageIndex].images.splice(imageIndex, 1);
    renderCurrentPage();
}

// Update page background
function updatePageBackground() {
    const color = document.getElementById('bgColor').value;
    bookData.pages[currentPageIndex].backgroundColor = color;
    document.getElementById('colorValue').textContent = color;
    renderCurrentPage();
}

// Update page caption
function updatePageCaption() {
    const caption = document.getElementById('pageCaption').value;
    bookData.pages[currentPageIndex].caption = caption;
    renderCurrentPage();
}

// Render current page
function renderCurrentPage() {
    const page = bookData.pages[currentPageIndex];
    const canvas = document.getElementById('pageCanvas');
    const imageContainer = document.getElementById('imageContainer');
    const textContainer = document.getElementById('textContainer');
    
    // Update canvas orientation
    canvas.className = `page-canvas ${bookData.orientation}`;
    canvas.style.backgroundColor = page.backgroundColor;
    
    // Update image grid layout
    imageContainer.className = `image-grid ${bookData.layout}`;
    
    // Render images
    imageContainer.innerHTML = '';
    page.images.forEach((imageSrc, index) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'uploaded-image';
        imgDiv.innerHTML = `
            <img src="${imageSrc}" alt="Photo ${index + 1}">
            <button class="delete-image" onclick="deleteImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        imageContainer.appendChild(imgDiv);
    });
    
    // Render caption
    if (page.caption) {
        textContainer.innerHTML = `<div class="page-text">${page.caption}</div>`;
    } else {
        textContainer.innerHTML = '';
    }
    
    // Update page number
    document.getElementById('currentPageNumber').textContent = currentPageIndex + 1;
    document.getElementById('pageIndicator').textContent = currentPageIndex + 1;
    
    // Update caption input
    document.getElementById('pageCaption').value = page.caption;
    document.getElementById('bgColor').value = page.backgroundColor;
    document.getElementById('colorValue').textContent = page.backgroundColor;
}

// Navigation
function previousPage() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        renderCurrentPage();
        updateNavigationButtons();
    }
}

function nextPage() {
    if (currentPageIndex < bookData.numPages - 1) {
        currentPageIndex++;
        renderCurrentPage();
        updateNavigationButtons();
    }
}

function updateNavigationButtons() {
    document.getElementById('prevBtn').disabled = currentPageIndex === 0;
    document.getElementById('nextBtn').disabled = currentPageIndex === bookData.numPages - 1;
}

// Export to PDF
async function exportToPDF() {
    const exportBtn = event.target;
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<span class="spinner-border spinner-border-custom me-2"></span> Exporting...';
    exportBtn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        
        // Determine page size based on orientation
        let pageWidth, pageHeight;
        if (bookData.orientation === 'landscape') {
            pageWidth = 297;
            pageHeight = 210;
        } else if (bookData.orientation === 'portrait') {
            pageWidth = 210;
            pageHeight = 297;
        } else {
            pageWidth = 210;
            pageHeight = 210;
        }

        const pdf = new jsPDF({
            orientation: bookData.orientation === 'landscape' ? 'l' : 'p',
            unit: 'mm',
            format: [pageWidth, pageHeight]
        });

        // Store current page
        const originalPageIndex = currentPageIndex;

        // Render each page
        for (let i = 0; i < bookData.numPages; i++) {
            currentPageIndex = i;
            renderCurrentPage();

            // Wait for images to load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Capture page as image
            const canvas = await html2canvas(document.getElementById('pageCanvas'), {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: bookData.pages[i].backgroundColor
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            if (i > 0) {
                pdf.addPage();
            }
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        }

        // Restore original page
        currentPageIndex = originalPageIndex;
        renderCurrentPage();

        // Save PDF
        pdf.save('my-photobook.pdf');

        alert('Your photo book has been exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('There was an error exporting your photo book. Please try again.');
    } finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

// Drag and drop support
document.addEventListener('DOMContentLoaded', function() {
    const uploadLabel = document.querySelector('.btn-upload');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, () => {
            uploadLabel.style.background = '#e8cba8';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, () => {
            uploadLabel.style.background = '';
        }, false);
    });

    uploadLabel.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        document.getElementById('imageUpload').files = files;
        handleImageUpload({ target: { files: files } });
    }, false);
});
