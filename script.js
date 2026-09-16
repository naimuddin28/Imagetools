/**
 * ImageTools - Core Application Script
 */

// --- State Management ---
const AppState = {
    originalImage: null, // HTMLImageElement
    originalFile: null,  // File object
    currentCanvas: null, // Offscreen or hidden canvas holding current image data
    fileName: 'edited-image',
    fileExtension: 'jpg',
    mimeType: 'image/jpeg',
    quality: 0.8,
    
    // History for Undo/Redo
    history: [],
    historyIndex: -1,
    maxHistory: 10,
    
    // Zoom state
    zoomLevel: 1, // 1 = 100%
    
    // Crop state
    crop: {
        active: false,
        ratio: 'free', // 'free', 1, 1.3333, 1.7777
        x: 0, y: 0, width: 0, height: 0,
        isDragging: false,
        isResizing: false,
        resizeDir: ''
    }
};

// --- DOM Elements ---
const DOM = {
    // Sections
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    homeSection: document.getElementById('home'),
    editorSection: document.getElementById('editor-section'),
    
    // Header actions
    btnBackToUpload: document.getElementById('btnBackToUpload'),
    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),
    btnReset: document.getElementById('btnReset'),
    btnDownloadHeader: document.getElementById('btnDownloadHeader'),
    btnDownloadMain: document.getElementById('btnDownloadMain'),
    
    // Canvas & Preview
    canvasContainer: document.getElementById('canvasContainer'),
    mainCanvas: document.getElementById('mainCanvas'),
    
    // Sidebar
    toolBtns: document.querySelectorAll('.tool-btn'),
    toolOptions: document.querySelectorAll('.tool-options'),
    
    // Zoom
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnFitScreen: document.getElementById('btnFitScreen'),
    btnResetZoom: document.getElementById('btnResetZoom'),
    zoomValue: document.getElementById('zoomValue'),
    compareToggle: document.getElementById('compareToggle'),
    
    // Crop
    cropOverlay: document.getElementById('cropOverlay'),
    cropBox: document.getElementById('cropBox'),
    ratioBtns: document.querySelectorAll('.ratio-btn'),
    btnApplyCrop: document.getElementById('btnApplyCrop'),
    btnCancelCrop: document.getElementById('btnCancelCrop'),
    
    // Resize
    resizeWidth: document.getElementById('resizeWidth'),
    resizeHeight: document.getElementById('resizeHeight'),
    lockAspectRatio: document.getElementById('lockAspectRatio'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    btnApplyResize: document.getElementById('btnApplyResize'),
    
    // Compress
    compressFormat: document.getElementById('compressFormat'),
    compressQuality: document.getElementById('compressQuality'),
    qualityValue: document.getElementById('qualityValue'),
    originalSizeDisplay: document.getElementById('originalSizeDisplay'),
    estimatedSizeDisplay: document.getElementById('estimatedSizeDisplay'),
    pngNote: document.querySelector('.png-note'),
    btnApplyCompress: document.getElementById('btnApplyCompress'),
    
    // Convert
    convertFormatBtns: document.querySelectorAll('.convert-format-btn'),
    transparencyNote: document.getElementById('transparencyNote'),
    btnApplyConvert: document.getElementById('btnApplyConvert'),
    
    // Rotate/Flip
    btnRotateLeft: document.getElementById('btnRotateLeft'),
    btnRotateRight: document.getElementById('btnRotateRight'),
    btnRotate180: document.getElementById('btnRotate180'),
    btnFlipH: document.getElementById('btnFlipH'),
    btnFlipV: document.getElementById('btnFlipV'),
    
    // Info
    currentDimDisplay: document.getElementById('currentDimDisplay'),
    currentSizeDisplay: document.getElementById('currentSizeDisplay'),
    
    // FAQ
    faqItems: document.querySelectorAll('.faq-item')
};

// --- Initialization & Event Listeners ---
function init() {
    setupUploadEvents();
    setupSidebarEvents();
    setupZoomEvents();
    setupActionEvents();
    setupToolEvents();
    setupFAQEvents();
    
    // Create an offscreen canvas for processing
    AppState.currentCanvas = document.createElement('canvas');
}

// --- Upload Handling ---
function setupUploadEvents() {
    DOM.uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            DOM.fileInput.click();
        }
    });

    DOM.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.uploadArea.classList.add('dragover');
    });

    DOM.uploadArea.addEventListener('dragleave', () => {
        DOM.uploadArea.classList.remove('dragover');
    });

    DOM.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showToast('Unsupported image format. Please upload JPG, PNG or WebP.', 'error');
        return;
    }

    if (file.size > 25 * 1024 * 1024) { // 25MB limit warning
        showToast('This image is very large and may affect browser performance.', 'warning');
    }

    AppState.originalFile = file;
    AppState.mimeType = file.type;
    
    // Set default extension based on mime
    if(file.type === 'image/jpeg') AppState.fileExtension = 'jpg';
    else if(file.type === 'image/png') AppState.fileExtension = 'png';
    else if(file.type === 'image/webp') AppState.fileExtension = 'webp';
    
    // Extract base name
    const lastDot = file.name.lastIndexOf('.');
    AppState.fileName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
    AppState.fileName += '-edited';

    DOM.originalSizeDisplay.textContent = formatBytes(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            AppState.originalImage = img;
            
            // Initial canvas setup
            AppState.currentCanvas.width = img.width;
            AppState.currentCanvas.height = img.height;
            const ctx = AppState.currentCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Clear history
            AppState.history = [];
            AppState.historyIndex = -1;
            saveState(); // Save initial state
            
            openEditor();
            updatePreview();
            showToast('Image loaded successfully.', 'success');
        };
        img.onerror = () => {
            showToast('Error loading image. File might be corrupted.', 'error');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Navigation & UI ---
function openEditor() {
    DOM.homeSection.classList.add('hidden');
    DOM.editorSection.classList.remove('hidden');
    
    // Reset zoom and fit to screen by default
    setTimeout(() => {
        fitToScreen();
    }, 100);
}

function closeEditor() {
    if (AppState.history.length > 1) {
        if (!confirm('You have unsaved changes. Are you sure you want to upload a new image?')) {
            return;
        }
    }
    DOM.editorSection.classList.add('hidden');
    DOM.homeSection.classList.remove('hidden');
    DOM.fileInput.value = '';
    AppState.originalImage = null;
    AppState.history = [];
    
    // Hide crop overlay if active
    hideCropUI();
}

function setupSidebarEvents() {
    DOM.toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            DOM.toolBtns.forEach(b => b.classList.remove('active'));
            DOM.toolOptions.forEach(p => p.classList.remove('active'));
            
            // Add to clicked
            btn.classList.add('active');
            const tool = btn.getAttribute('data-tool');
            document.getElementById(`options-${tool}`).classList.add('active');
            
            // Handle tool specific logic
            handleToolSwitch(tool);
        });
    });
}

function handleToolSwitch(tool) {
    if (tool === 'crop') {
        showCropUI();
    } else {
        hideCropUI();
    }

    if (tool === 'resize') {
        DOM.resizeWidth.value = AppState.currentCanvas.width;
        DOM.resizeHeight.value = AppState.currentCanvas.height;
    }
    
    if (tool === 'compress' || tool === 'convert') {
        updateFileSizeEstimate();
    }
}

function setupFAQEvents() {
    DOM.faqItems.forEach(item => {
        item.querySelector('.faq-question').addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            // Close all
            DOM.faqItems.forEach(faq => faq.classList.remove('active'));
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// --- Preview & Canvas Rendering ---
function updatePreview() {
    if (!AppState.currentCanvas) return;
    
    const ctx = DOM.mainCanvas.getContext('2d');
    DOM.mainCanvas.width = AppState.currentCanvas.width;
    DOM.mainCanvas.height = AppState.currentCanvas.height;
    ctx.clearRect(0, 0, DOM.mainCanvas.width, DOM.mainCanvas.height);
    
    // Handle transparency to white conversion if saving as JPG later? 
    // Wait, visually we preserve checkerboard in preview, only convert to white on download/compress for JPG.
    ctx.drawImage(AppState.currentCanvas, 0, 0);
    
    updateInfoDisplays();
    updateZoomTransform();
    updateFileSizeEstimate();
    
    // Re-init crop if active
    if (document.querySelector('.tool-btn[data-tool="crop"]').classList.contains('active')) {
        initCropBox();
    }
}

function updateInfoDisplays() {
    const w = AppState.currentCanvas.width;
    const h = AppState.currentCanvas.height;
    DOM.currentDimDisplay.textContent = `${w} × ${h} px`;
}

function updateFileSizeEstimate() {
    if (!AppState.currentCanvas) return;
    AppState.currentCanvas.toBlob((blob) => {
        if(blob) {
            const sizeStr = formatBytes(blob.size);
            DOM.currentSizeDisplay.textContent = sizeStr;
            DOM.estimatedSizeDisplay.textContent = sizeStr;
        }
    }, AppState.mimeType, AppState.quality);
}

function showOriginal() {
    const ctx = DOM.mainCanvas.getContext('2d');
    DOM.mainCanvas.width = AppState.originalImage.width;
    DOM.mainCanvas.height = AppState.originalImage.height;
    ctx.clearRect(0, 0, DOM.mainCanvas.width, DOM.mainCanvas.height);
    ctx.drawImage(AppState.originalImage, 0, 0);
}

// --- Zoom Controls ---
function setupZoomEvents() {
    DOM.btnZoomIn.addEventListener('click', () => {
        AppState.zoomLevel = Math.min(AppState.zoomLevel + 0.1, 5);
        updateZoomTransform();
    });
    
    DOM.btnZoomOut.addEventListener('click', () => {
        AppState.zoomLevel = Math.max(AppState.zoomLevel - 0.1, 0.1);
        updateZoomTransform();
    });
    
    DOM.btnResetZoom.addEventListener('click', () => {
        AppState.zoomLevel = 1;
        updateZoomTransform();
    });
    
    DOM.btnFitScreen.addEventListener('click', fitToScreen);
    
    DOM.compareToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            showOriginal();
            hideCropUI();
        } else {
            updatePreview();
            if (document.querySelector('.tool-btn[data-tool="crop"]').classList.contains('active')) {
                showCropUI();
            }
        }
    });
}

function fitToScreen() {
    if (!AppState.currentCanvas) return;
    
    const containerWidth = DOM.canvasContainer.clientWidth - 40; // padding
    const containerHeight = DOM.canvasContainer.clientHeight - 40;
    
    const imgWidth = DOM.mainCanvas.width;
    const imgHeight = DOM.mainCanvas.height;
    
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up past 100% on fit
    AppState.zoomLevel = scale;
    updateZoomTransform();
}

function updateZoomTransform() {
    DOM.mainCanvas.style.transform = `scale(${AppState.zoomLevel})`;
    DOM.zoomValue.textContent = Math.round(AppState.zoomLevel * 100) + '%';
    
    if(AppState.crop.active) {
        updateCropOverlayTransform();
    }
}

// --- State Management (Undo/Redo) ---
function saveState() {
    // Remove future history if we are overwriting
    if (AppState.historyIndex < AppState.history.length - 1) {
        AppState.history = AppState.history.slice(0, AppState.historyIndex + 1);
    }
    
    // Save image data
    const canvas = document.createElement('canvas');
    canvas.width = AppState.currentCanvas.width;
    canvas.height = AppState.currentCanvas.height;
    canvas.getContext('2d').drawImage(AppState.currentCanvas, 0, 0);
    
    AppState.history.push({
        canvas: canvas,
        mimeType: AppState.mimeType,
        quality: AppState.quality
    });
    
    if (AppState.history.length > AppState.maxHistory) {
        AppState.history.shift(); // Remove oldest
    } else {
        AppState.historyIndex++;
    }
    
    updateUndoRedoButtons();
}

function undo() {
    if (AppState.historyIndex > 0) {
        AppState.historyIndex--;
        restoreState(AppState.history[AppState.historyIndex]);
    }
}

function redo() {
    if (AppState.historyIndex < AppState.history.length - 1) {
        AppState.historyIndex++;
        restoreState(AppState.history[AppState.historyIndex]);
    }
}

function restoreState(state) {
    AppState.currentCanvas.width = state.canvas.width;
    AppState.currentCanvas.height = state.canvas.height;
    AppState.currentCanvas.getContext('2d').clearRect(0, 0, state.canvas.width, state.canvas.height);
    AppState.currentCanvas.getContext('2d').drawImage(state.canvas, 0, 0);
    AppState.mimeType = state.mimeType;
    AppState.quality = state.quality;
    
    updatePreview();
    updateUndoRedoButtons();
    
    // Sync UI
    if (document.querySelector('.tool-btn[data-tool="resize"]').classList.contains('active')) {
        DOM.resizeWidth.value = state.canvas.width;
        DOM.resizeHeight.value = state.canvas.height;
    }
}

function updateUndoRedoButtons() {
    DOM.btnUndo.disabled = AppState.historyIndex <= 0;
    DOM.btnRedo.disabled = AppState.historyIndex >= AppState.history.length - 1;
}

// --- Top Level Actions ---
function setupActionEvents() {
    DOM.btnBackToUpload.addEventListener('click', closeEditor);
    DOM.btnUndo.addEventListener('click', undo);
    DOM.btnRedo.addEventListener('click', redo);
    
    DOM.btnReset.addEventListener('click', () => {
        if(confirm('Are you sure you want to reset all changes?')) {
            AppState.historyIndex = 0;
            AppState.history = [AppState.history[0]]; // Keep only original state
            restoreState(AppState.history[0]);
            showToast('Image reset to original.', 'success');
        }
    });

    const downloadHandler = () => {
        downloadImage();
    };
    
    DOM.btnDownloadHeader.addEventListener('click', downloadHandler);
    DOM.btnDownloadMain.addEventListener('click', downloadHandler);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if(DOM.editorSection.classList.contains('hidden')) return;
        
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                undo();
            }
            if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }
    });
}

// --- Tools Implementation ---

function setupToolEvents() {
    setupRotateFlip();
    setupResize();
    setupCompress();
    setupConvert();
    setupCropEvents();
}

// 1. Rotate & Flip
function setupRotateFlip() {
    DOM.btnRotateLeft.addEventListener('click', () => applyRotation(-90));
    DOM.btnRotateRight.addEventListener('click', () => applyRotation(90));
    DOM.btnRotate180.addEventListener('click', () => applyRotation(180));
    DOM.btnFlipH.addEventListener('click', () => applyFlip(true, false));
    DOM.btnFlipV.addEventListener('click', () => applyFlip(false, true));
}

function applyRotation(degrees) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = AppState.currentCanvas.width;
    const h = AppState.currentCanvas.height;
    
    if (degrees === 90 || degrees === -90) {
        canvas.width = h;
        canvas.height = w;
    } else {
        canvas.width = w;
        canvas.height = h;
    }
    
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(degrees * Math.PI / 180);
    ctx.drawImage(AppState.currentCanvas, -w/2, -h/2);
    
    copyToCurrent(canvas);
    showToast(`Rotated ${degrees}°`);
}

function applyFlip(flipH, flipV) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = AppState.currentCanvas.width;
    const h = AppState.currentCanvas.height;
    
    canvas.width = w;
    canvas.height = h;
    
    ctx.translate(flipH ? w : 0, flipV ? h : 0);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(AppState.currentCanvas, 0, 0);
    
    copyToCurrent(canvas);
    showToast(`Image flipped`);
}

function copyToCurrent(tempCanvas) {
    AppState.currentCanvas.width = tempCanvas.width;
    AppState.currentCanvas.height = tempCanvas.height;
    AppState.currentCanvas.getContext('2d').clearRect(0,0, tempCanvas.width, tempCanvas.height);
    AppState.currentCanvas.getContext('2d').drawImage(tempCanvas, 0, 0);
    saveState();
    updatePreview();
}

// 2. Resize
function setupResize() {
    let aspect = 1;
    
    // Update aspect ratio when panel is opened or image changes
    DOM.toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(btn.getAttribute('data-tool') === 'resize') {
                aspect = AppState.currentCanvas.width / AppState.currentCanvas.height;
            }
        });
    });

    DOM.resizeWidth.addEventListener('input', (e) => {
        if(DOM.lockAspectRatio.checked && e.target.value) {
            DOM.resizeHeight.value = Math.round(e.target.value / aspect);
        }
    });

    DOM.resizeHeight.addEventListener('input', (e) => {
        if(DOM.lockAspectRatio.checked && e.target.value) {
            DOM.resizeWidth.value = Math.round(e.target.value * aspect);
        }
    });

    DOM.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const scale = parseFloat(btn.getAttribute('data-scale'));
            DOM.resizeWidth.value = Math.round(AppState.currentCanvas.width * scale);
            DOM.resizeHeight.value = Math.round(AppState.currentCanvas.height * scale);
        });
    });

    DOM.btnApplyResize.addEventListener('click', () => {
        const w = parseInt(DOM.resizeWidth.value);
        const h = parseInt(DOM.resizeHeight.value);
        
        if (!w || !h || w <= 0 || h <= 0) {
            showToast('Please enter valid dimensions', 'error');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        // high quality resize
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(AppState.currentCanvas, 0, 0, w, h);
        
        copyToCurrent(canvas);
        showToast('Image resized successfully', 'success');
        
        // Update aspect for future resizing
        aspect = w / h;
    });
}

// 3. Compress & Format
function setupCompress() {
    DOM.compressQuality.addEventListener('input', (e) => {
        const val = Math.round(e.target.value * 100);
        DOM.qualityValue.textContent = `${val}%`;
        AppState.quality = parseFloat(e.target.value);
    });
    
    DOM.compressQuality.addEventListener('change', () => {
        updateFileSizeEstimate();
    });

    DOM.compressFormat.addEventListener('change', (e) => {
        AppState.mimeType = e.target.value;
        if(AppState.mimeType === 'image/png') {
            DOM.pngNote.classList.remove('hidden');
        } else {
            DOM.pngNote.classList.add('hidden');
        }
        updateFileSizeEstimate();
    });

    DOM.btnApplyCompress.addEventListener('click', () => {
        AppState.mimeType = DOM.compressFormat.value;
        AppState.quality = parseFloat(DOM.compressQuality.value);
        
        if(AppState.mimeType === 'image/jpeg') AppState.fileExtension = 'jpg';
        else if(AppState.mimeType === 'image/png') AppState.fileExtension = 'png';
        else if(AppState.mimeType === 'image/webp') AppState.fileExtension = 'webp';
        
        saveState();
        showToast('Compression settings applied', 'success');
        updateFileSizeEstimate();
    });
}

function setupConvert() {
    DOM.convertFormatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.convertFormatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const format = btn.getAttribute('data-format');
            if (format === 'image/jpeg') {
                DOM.transparencyNote.classList.remove('hidden');
            } else {
                DOM.transparencyNote.classList.add('hidden');
            }
        });
    });

    DOM.btnApplyConvert.addEventListener('click', () => {
        const activeBtn = document.querySelector('.convert-format-btn.active');
        if(!activeBtn) {
            showToast('Please select a format', 'error');
            return;
        }
        
        const format = activeBtn.getAttribute('data-format');
        AppState.mimeType = format;
        
        if(format === 'image/jpeg') AppState.fileExtension = 'jpg';
        else if(format === 'image/png') AppState.fileExtension = 'png';
        else if(format === 'image/webp') AppState.fileExtension = 'webp';
        
        // Sync compress dropdown
        DOM.compressFormat.value = format;
        
        saveState();
        showToast(`Converted to ${activeBtn.textContent}`, 'success');
        updateFileSizeEstimate();
    });
}

// 4. Crop Implementation
function setupCropEvents() {
    DOM.ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.crop.ratio = btn.getAttribute('data-ratio');
            initCropBox();
        });
    });

    DOM.btnApplyCrop.addEventListener('click', applyCrop);
    DOM.btnCancelCrop.addEventListener('click', hideCropUI);
    
    // Mouse events for crop overlay
    setupCropMouseEvents();
}

function showCropUI() {
    AppState.crop.active = true;
    DOM.cropOverlay.classList.remove('hidden');
    initCropBox();
}

function hideCropUI() {
    AppState.crop.active = false;
    DOM.cropOverlay.classList.add('hidden');
}

function initCropBox() {
    const canvasRect = DOM.mainCanvas.getBoundingClientRect();
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    
    // Calculate canvas position relative to container
    const canvasLeft = canvasRect.left - containerRect.left + DOM.canvasContainer.scrollLeft;
    const canvasTop = canvasRect.top - containerRect.top + DOM.canvasContainer.scrollTop;
    
    // Initial crop box size (80% of canvas)
    let w = canvasRect.width * 0.8;
    let h = canvasRect.height * 0.8;
    
    // Apply ratio
    if (AppState.crop.ratio !== 'free') {
        const ratio = parseFloat(AppState.crop.ratio);
        if (w / ratio <= canvasRect.height) {
            h = w / ratio;
        } else {
            h = canvasRect.height * 0.8;
            w = h * ratio;
        }
    }
    
    AppState.crop.x = canvasLeft + (canvasRect.width - w) / 2;
    AppState.crop.y = canvasTop + (canvasRect.height - h) / 2;
    AppState.crop.width = w;
    AppState.crop.height = h;
    
    drawCropBox();
}

function drawCropBox() {
    DOM.cropBox.style.left = `${AppState.crop.x}px`;
    DOM.cropBox.style.top = `${AppState.crop.y}px`;
    DOM.cropBox.style.width = `${AppState.crop.width}px`;
    DOM.cropBox.style.height = `${AppState.crop.height}px`;
}

function updateCropOverlayTransform() {
    // Re-init crop box bounds if zoom changes while active
    if(AppState.crop.active) {
        initCropBox();
    }
}

function setupCropMouseEvents() {
    let startX, startY;
    let startCropX, startCropY, startCropW, startCropH;

    const onMouseDown = (e) => {
        if(!AppState.crop.active) return;
        
        startX = e.clientX;
        startY = e.clientY;
        startCropX = AppState.crop.x;
        startCropY = AppState.crop.y;
        startCropW = AppState.crop.width;
        startCropH = AppState.crop.height;

        if (e.target.classList.contains('crop-handle')) {
            AppState.crop.isResizing = true;
            AppState.crop.resizeDir = e.target.getAttribute('data-dir');
        } else if (e.target === DOM.cropBox) {
            AppState.crop.isDragging = true;
        } else {
            return;
        }
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    };

    const onMouseMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const canvasRect = DOM.mainCanvas.getBoundingClientRect();
        const containerRect = DOM.canvasContainer.getBoundingClientRect();
        const canvasLeft = canvasRect.left - containerRect.left + DOM.canvasContainer.scrollLeft;
        const canvasTop = canvasRect.top - containerRect.top + DOM.canvasContainer.scrollTop;

        if (AppState.crop.isDragging) {
            let nx = startCropX + dx;
            let ny = startCropY + dy;
            
            // Constrain to canvas bounds
            nx = Math.max(canvasLeft, Math.min(nx, canvasLeft + canvasRect.width - AppState.crop.width));
            ny = Math.max(canvasTop, Math.min(ny, canvasTop + canvasRect.height - AppState.crop.height));
            
            AppState.crop.x = nx;
            AppState.crop.y = ny;
            
        } else if (AppState.crop.isResizing) {
            let nx = startCropX;
            let ny = startCropY;
            let nw = startCropW;
            let nh = startCropH;
            
            const dir = AppState.crop.resizeDir;
            
            if (dir.includes('e')) nw += dx;
            if (dir.includes('w')) { nx += dx; nw -= dx; }
            if (dir.includes('s')) nh += dy;
            if (dir.includes('n')) { ny += dy; nh -= dy; }
            
            // Constrain min size
            const minSize = 40;
            if (nw < minSize) { nw = minSize; if (dir.includes('w')) nx = startCropX + startCropW - minSize; }
            if (nh < minSize) { nh = minSize; if (dir.includes('n')) ny = startCropY + startCropH - minSize; }
            
            // Enforce Ratio
            if (AppState.crop.ratio !== 'free') {
                const ratio = parseFloat(AppState.crop.ratio);
                // Simple ratio constraint (height drives width for simplicity in corner drags)
                if (dir === 'e' || dir === 'w') {
                    nh = nw / ratio;
                    if(dir.includes('n')) ny = startCropY + startCropH - nh;
                } else {
                    nw = nh * ratio;
                    if(dir.includes('w')) nx = startCropX + startCropW - nw;
                }
            }

            // Constrain to canvas
            if (nx < canvasLeft) { nw -= (canvasLeft - nx); nx = canvasLeft; }
            if (ny < canvasTop) { nh -= (canvasTop - ny); ny = canvasTop; }
            if (nx + nw > canvasLeft + canvasRect.width) nw = canvasLeft + canvasRect.width - nx;
            if (ny + nh > canvasTop + canvasRect.height) nh = canvasTop + canvasRect.height - ny;

            // Re-enforce ratio if bounded by canvas (basic handling to avoid distorted ratio box)
            if (AppState.crop.ratio !== 'free') {
                const ratio = parseFloat(AppState.crop.ratio);
                if (nw / nh > ratio) nw = nh * ratio;
                else if (nw / nh < ratio) nh = nw / ratio;
            }

            AppState.crop.x = nx;
            AppState.crop.y = ny;
            AppState.crop.width = nw;
            AppState.crop.height = nh;
        }
        
        drawCropBox();
    };

    const onMouseUp = () => {
        AppState.crop.isDragging = false;
        AppState.crop.isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    DOM.cropOverlay.addEventListener('mousedown', onMouseDown);
}

function applyCrop() {
    const canvasRect = DOM.mainCanvas.getBoundingClientRect();
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    const canvasLeft = canvasRect.left - containerRect.left + DOM.canvasContainer.scrollLeft;
    const canvasTop = canvasRect.top - containerRect.top + DOM.canvasContainer.scrollTop;
    
    // Map visual crop coordinates to actual canvas image coordinates
    // Accounting for zoom!
    const scale = AppState.currentCanvas.width / canvasRect.width;
    
    const actualX = (AppState.crop.x - canvasLeft) * scale;
    const actualY = (AppState.crop.y - canvasTop) * scale;
    const actualW = AppState.crop.width * scale;
    const actualH = AppState.crop.height * scale;
    
    // Avoid 0 width/height
    if (actualW < 1 || actualH < 1) {
        showToast('Invalid crop area', 'error');
        return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = actualW;
    tempCanvas.height = actualH;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.drawImage(
        AppState.currentCanvas,
        actualX, actualY, actualW, actualH,
        0, 0, actualW, actualH
    );
    
    copyToCurrent(tempCanvas);
    showToast('Crop applied', 'success');
    
    // Reset crop box based on new canvas size
    initCropBox();
}

// --- Download Handling ---
function downloadImage() {
    if (!AppState.currentCanvas) return;
    
    // If output is JPEG, we need to handle transparency by adding a white background
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = AppState.currentCanvas.width;
    finalCanvas.height = AppState.currentCanvas.height;
    const ctx = finalCanvas.getContext('2d');
    
    if (AppState.mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }
    
    ctx.drawImage(AppState.currentCanvas, 0, 0);
    
    finalCanvas.toBlob((blob) => {
        if (!blob) {
            showToast('Error generating image file.', 'error');
            return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${AppState.fileName}.${AppState.fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('Image downloaded successfully!', 'success');
        
    }, AppState.mimeType, AppState.quality);
}

// --- Utilities ---
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info'));
    
    const text = document.createElement('span');
    text.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    
    // Init icon
    if(window.lucide) lucide.createIcons({root: toast});
    
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// Run init on load
document.addEventListener('DOMContentLoaded', init);
