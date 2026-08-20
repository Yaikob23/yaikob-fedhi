/* ==========================================================================
   PUBLIC FAMILY GALLERY & INTERACTIVE LIGHTBOX SYSTEM
   ========================================================================== */

const CLOUD_NAME = "tzy7gqj4"; 
const UPLOAD_PRESET = "ml_default1";
const GALLERY_TAG = "family_memories";

// Global Gallery State
let galleryPhotos = [];
let currentIndex = 0;
let scale = 1;
let startX = 0, startY = 0;
let initialPinchDistance = 0;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateFooterYear();
    initMobileMenu();
    initScrollTop();
    initGallerySearch();
    initFamilyPortal();
    initLightbox();
});

/* --------------------------------------------------------------------------
   1. NAVIGATION, THEME & UTILITIES
   -------------------------------------------------------------------------- */
function initTheme() {
    const savedTheme = localStorage.getItem('jabaa_theme') || 'dark';
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
    changeTheme(savedTheme);

    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => changeTheme(e.target.value));
    }
}

function changeTheme(themeValue) {
    const htmlTag = document.documentElement;
    if (themeValue === 'device') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        htmlTag.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        htmlTag.setAttribute('data-theme', themeValue);
    }
    localStorage.setItem('jabaa_theme', themeValue);
}

function updateFooterYear() {
    const yearSpan = document.getElementById('jabaa-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navbar = document.getElementById('navbar');
    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', () => navbar.classList.toggle('active'));
    }
}

function initScrollTop() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (!scrollTopBtn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.style.display = 'flex';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function initGallerySearch() {
    const searchInput = document.getElementById('gallerySearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = galleryPhotos.filter(photo => 
            (photo.alt || '').toLowerCase().includes(query) ||
            (photo.publicId || '').toLowerCase().includes(query)
        );
        renderGallery(filtered);
    });
}

/* --------------------------------------------------------------------------
   2. CLOUD MEDIA & THUMBNAIL GALLERY
   -------------------------------------------------------------------------- */
function initFamilyPortal() {
    const imageInput = document.getElementById("image-input") || document.getElementById("imageUploadInput");
    const cameraInput = document.getElementById("camera-input");

    fetchGalleryFromCloud();

    if (imageInput) imageInput.addEventListener("change", uploadToCloud);
    if (cameraInput) cameraInput.addEventListener("change", uploadToCloud);
}

function uploadToCloud(e) {
    const files = Array.from(e.target.files);

    files.forEach(file => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("tags", GALLERY_TAG);

        fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.secure_url) {
                setTimeout(fetchGalleryFromCloud, 1000);
            } else {
                alert("Upload error: Ensure 'ml_default' preset is set to Unsigned in Cloudinary.");
            }
        })
        .catch(err => alert("Network Connection Error: " + err));
    });
}

function fetchGalleryFromCloud() {
    fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`)
        .then(res => {
            if (!res.ok) throw new Error("Resource list restricted");
            return res.json();
        })
        .then(data => {
            if (data && data.resources) {
                galleryPhotos = data.resources.map((img, i) => ({
                    publicId: img.public_id,
                    alt: `Yaadannoo Maatii ${i + 1}`,
                    fullUrl: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v${img.version}/${img.public_id}.${img.format}`,
                    thumbUrl: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_thumb,w_400,g_face/v${img.version}/${img.public_id}.${img.format}`
                }));
                renderGallery(galleryPhotos);
            } else {
                loadDOMFallbackGallery();
            }
        })
        .catch(() => loadDOMFallbackGallery());
}

function loadDOMFallbackGallery() {
    const galleryGrid = document.getElementById("galleryGrid") || document.getElementById("family-gallery");
    if (!galleryGrid) return;

    const existingItems = galleryGrid.querySelectorAll('.gallery-item');
    if (existingItems.length > 0) {
        galleryPhotos = Array.from(existingItems).map((item, i) => {
            const img = item.querySelector('img');
            const src = img ? img.src : '';
            return {
                publicId: `local-${i}`,
                alt: img ? img.alt : `Yaadannoo Maatii ${i + 1}`,
                fullUrl: src,
                thumbUrl: src
            };
        });
        bindGalleryItemEvents();
    } else {
        renderGallery([]);
    }
}

function bindGalleryItemEvents() {
    const galleryGrid = document.getElementById("galleryGrid") || document.getElementById("family-gallery");
    if (!galleryGrid) return;

    const items = galleryGrid.querySelectorAll('.gallery-item');
    items.forEach((item, idx) => {
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.onclick = () => openLightbox(idx);
        item.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(idx);
            }
        };
    });
}

function renderGallery(photos) {
    const galleryGrid = document.getElementById("galleryGrid") || document.getElementById("family-gallery");
    const photoCount = document.getElementById("photo-count");

    if (!galleryGrid) return;
    galleryGrid.innerHTML = "";

    if (photoCount) photoCount.textContent = photos.length;

    if (photos.length === 0) {
        galleryGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted, #a0aec0); padding: 2rem;">Suuraan hin jiru. Suuraa haaraa olfe'aa! (No photos uploaded yet.)</p>`;
        return;
    }

    photos.forEach((photo, idx) => {
        const item = document.createElement("div");
        item.className = "gallery-item";
        item.setAttribute("tabindex", "0");
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", `Open ${photo.alt || 'Image'}`);
        item.innerHTML = `
            <img src="${photo.thumbUrl}" alt="${photo.alt || 'Family Memory'}" loading="lazy">
            <div class="gallery-overlay"><i class="fas fa-expand" aria-hidden="true"></i></div>
        `;
        item.addEventListener("click", () => openLightbox(idx));
        galleryGrid.appendChild(item);
    });
}

/* --------------------------------------------------------------------------
   3. LIGHTBOX INTERACTION, TOUCH GESTURES & ZOOM
   -------------------------------------------------------------------------- */
function initLightbox() {
    const modal = document.getElementById("lightbox") || document.getElementById("lightbox-modal");
    if (!modal) return;

    const closeBtn = document.getElementById("closeLightboxBtn") || document.getElementById("lb-close");
    const prevBtn = document.getElementById("prevImgBtn") || document.getElementById("lb-prev");
    const nextBtn = document.getElementById("nextImgBtn") || document.getElementById("lb-next");
    const deleteBtn = document.getElementById("deleteImageBtn") || document.getElementById("lb-delete");
    const shareBtn = document.getElementById("shareImageBtn") || document.getElementById("lb-share");
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const stage = document.getElementById("lightboxBody") || document.getElementById("lb-stage");

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (prevBtn) prevBtn.addEventListener("click", showPrevImage);
    if (nextBtn) nextBtn.addEventListener("click", showNextImage);
    if (deleteBtn) deleteBtn.addEventListener("click", confirmAndDeleteImage);
    if (shareBtn) shareBtn.addEventListener("click", shareCurrentImage);

    if (zoomInBtn) zoomInBtn.addEventListener("click", () => adjustZoom(0.25));
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => adjustZoom(-0.25));

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
        if (!modal.classList.contains("active") && modal.style.display !== "flex") return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") showPrevImage();
        if (e.key === "ArrowRight") showNextImage();
    });

    // Touch & Gesture events
    if (stage) {
        stage.addEventListener("touchstart", handleTouchStart, { passive: true });
        stage.addEventListener("touchmove", handleTouchMove, { passive: false });
        stage.addEventListener("touchend", handleTouchEnd, { passive: true });
    }
}

function openLightbox(index) {
    currentIndex = index;
    const modal = document.getElementById("lightbox") || document.getElementById("lightbox-modal");
    if (!modal) return;

    modal.classList.add("active");
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    updateLightboxContent();
}

function closeLightbox() {
    const modal = document.getElementById("lightbox") || document.getElementById("lightbox-modal");
    if (!modal) return;

    modal.classList.remove("active");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    resetZoom();
}

function updateLightboxContent() {
    if (galleryPhotos.length === 0) return closeLightbox();

    const photo = galleryPhotos[currentIndex];
    const lbImg = document.getElementById("lightboxImg") || document.getElementById("lb-image");
    const counter = document.getElementById("imageCounter");
    const lbCurrent = document.getElementById("lb-current");
    const lbTotal = document.getElementById("lb-total");
    const lbDownload = document.getElementById("downloadImageBtn") || document.getElementById("lb-download");

    resetZoom();
    if (lbImg) {
        lbImg.src = photo.fullUrl;
        lbImg.alt = photo.alt || "Full size preview";
    }

    if (counter) counter.textContent = `${currentIndex + 1} / ${galleryPhotos.length}`;
    if (lbCurrent) lbCurrent.textContent = currentIndex + 1;
    if (lbTotal) lbTotal.textContent = galleryPhotos.length;

    if (lbDownload) {
        if (lbDownload.tagName === "A") {
            lbDownload.href = photo.fullUrl;
        } else {
            lbDownload.onclick = () => {
                const a = document.createElement("a");
                a.href = photo.fullUrl;
                a.download = photo.alt || "family-memory.jpg";
                a.target = "_blank";
                a.click();
            };
        }
    }
}

function showPrevImage() {
    if (galleryPhotos.length === 0) return;
    currentIndex = (currentIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
    updateLightboxContent();
}

function showNextImage() {
    if (galleryPhotos.length === 0) return;
    currentIndex = (currentIndex + 1) % galleryPhotos.length;
    updateLightboxContent();
}

function adjustZoom(delta) {
    scale = Math.min(Math.max(1, scale + delta), 3);
    applyZoom();
}

function resetZoom() {
    scale = 1;
    applyZoom();
}

function applyZoom() {
    const lbImg = document.getElementById("lightboxImg") || document.getElementById("lb-image");
    if (lbImg) lbImg.style.transform = `scale(${scale})`;
}

function confirmAndDeleteImage() {
    if (confirm("Are you sure you want to delete this photo?")) {
        galleryPhotos.splice(currentIndex, 1);
        renderGallery(galleryPhotos);
        if (galleryPhotos.length === 0) {
            closeLightbox();
        } else {
            currentIndex = currentIndex % galleryPhotos.length;
            updateLightboxContent();
        }
    }
}

function shareCurrentImage() {
    if (galleryPhotos.length === 0) return;
    const photo = galleryPhotos[currentIndex];
    if (navigator.share) {
        navigator.share({
            title: photo.alt || "Family Memory",
            url: photo.fullUrl
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(photo.fullUrl);
        alert("Image link copied to clipboard!");
    }
}

/* Touch Gesture Handlers (Swipe & Pinch) */
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e.touches);
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        if (initialPinchDistance > 0) {
            const delta = currentDistance / initialPinchDistance;
            scale = Math.min(Math.max(1, scale * delta), 3);
            applyZoom();
            initialPinchDistance = currentDistance;
        }
    }
}

function handleTouchEnd(e) {
    if (scale > 1) return; // Prevent swipe trigger when zoomed in

    if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;

        if (Math.abs(diffX) > 50) {
            if (diffX > 0) showNextImage();
            else showPrevImage();
        }
    }
}

function getPinchDistance(touches) {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
}