// ============ TradeVault Pro Screenshot Lightbox ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .tv-lb { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.95); display: none; align-items: center; justify-content: center; cursor: zoom-in; }
        .tv-lb.active { display: flex; }
        .tv-lb img { max-width: 90vw; max-height: 90vh; object-fit: contain; transform-origin: center center; transition: transform 0.1s ease-out; user-select: none; pointer-events: none; }
        .tv-lb-controls { position: absolute; top: 1.5rem; right: 1.5rem; display: flex; gap: .5rem; z-index: 10000; }
        .tv-lb-btn { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); color: #fff; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); transition: all .2s; }
        .tv-lb-btn:hover { background: rgba(255,255,255,.2); transform: scale(1.05); }
        .tv-lb-hint { position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,.5); font-size: .8rem; pointer-events: none; }
    `;
    document.head.appendChild(st);

    const lb = document.createElement('div');
    lb.className = 'tv-lb';
    lb.innerHTML = `
        <div class="tv-lb-controls">
            <button class="tv-lb-btn" id="lbZoomIn" title="Zoom In">+</button>
            <button class="tv-lb-btn" id="lbZoomOut" title="Zoom Out">−</button>
            <button class="tv-lb-btn" id="lbReset" title="Reset">⟲</button>
            <button class="tv-lb-btn" id="lbClose" title="Close">✕</button>
        </div>
        <img id="lbImg" src="" alt="Trade Screenshot">
        <div class="tv-lb-hint">Scroll to zoom · Drag to pan</div>
    `;
    document.body.appendChild(lb);

    let scale = 1, panning = false, pointX = 0, pointY = 0, startX = 0, startY = 0;
    const img = document.getElementById('lbImg');

    function updateTransform() {
        img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
        lb.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    }

    function openLightbox(src) {
        img.src = src;
        scale = 1; pointX = 0; pointY = 0;
        updateTransform();
        lb.classList.add('active');
    }

    function closeLightbox() {
        lb.classList.remove('active');
    }

    // Event Delegation: Catch clicks on any trade screenshot
    document.addEventListener('click', (e) => {
        // Target images inside the trade detail modal or journal cards
        const isScreenshot = e.target.tagName === 'IMG' && (e.target.closest('.trade-detail-section') || e.target.classList.contains('trade-screenshot'));
        if (isScreenshot) {
            e.preventDefault();
            e.stopPropagation();
            openLightbox(e.target.src);
        }
    }, true);

    // Controls
    document.getElementById('lbClose').onclick = closeLightbox;
    document.getElementById('lbReset').onclick = () => { scale = 1; pointX = 0; pointY = 0; updateTransform(); };
    document.getElementById('lbZoomIn').onclick = () => { scale = Math.min(scale + 0.25, 5); updateTransform(); };
    document.getElementById('lbZoomOut').onclick = () => { scale = Math.max(scale - 0.25, 0.5); updateTransform(); };
    lb.onclick = (e) => { if (e.target === lb) closeLightbox(); };

    // Wheel Zoom
    lb.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(5, scale + delta));
        updateTransform();
    }, { passive: false });

    // Drag Pan
    img.addEventListener('mousedown', (e) => {
        if (scale <= 1) return;
        panning = true;
        startX = e.clientX - pointX;
        startY = e.clientY - pointY;
        lb.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!panning) return;
        e.preventDefault();
        pointX = e.clientX - startX;
        pointY = e.clientY - startY;
        updateTransform();
    });
    window.addEventListener('mouseup', () => { panning = false; if(scale > 1) lb.style.cursor = 'grab'; });

    // Keyboard
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('active')) closeLightbox(); });
})();
