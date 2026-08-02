// =====================================================================
// SRCE Events Manager
// Scoped per Department + Year. Each event has a photo + title + date
// + detailed description. Click a card to view the full detail.
// =====================================================================

(function () {
    const params = new URLSearchParams(location.search);
    const dept = params.get("dept") || "CSE";
    const year = params.get("year") || "1";

    const deptNames = {
        CSE: "Computer Science & Engineering",
        ECE: "Electronics & Communication Engineering",
        EEE: "Electrical & Electronics Engineering",
        MECH: "Mechanical Engineering",
        CIVIL: "Civil Engineering",
        AIDS: "Artificial Intelligence & Data Science",
        MCA: "Master of Computer Applications"
    };
    const ordinal = { "1": "1st", "2": "2nd", "3": "3rd", "4": "4th" }[year] || year;

    const DATA_KEY = `SRCE_EVENTS_${dept}_${year}`;

    function getData() {
        try { return JSON.parse(SRCEStorage.get(DATA_KEY)) || []; }
        catch (e) { return []; }
    }
    function setData(rows) { SRCEStorage.set(DATA_KEY, JSON.stringify(rows)); }

    function escapeHtml(str) {
        return String(str ?? "").replace(/[&<>"']/g, s => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[s]));
    }

    const pageTitle = document.getElementById("pageTitle");
    const grid = document.getElementById("eventsGrid");
    const addBtn = document.getElementById("addBtn");
    const searchInput = document.getElementById("searchBox");

    const editModal = document.getElementById("eventModal");
    const modalTitle = document.getElementById("modalTitle");
    const titleInput = document.getElementById("titleInput");
    const dateInput = document.getElementById("dateInput");
    const descInput = document.getElementById("descInput");
    const photoInput = document.getElementById("photoInput");
    const photoPreview = document.getElementById("photoPreview");
    const saveBtn = document.getElementById("saveBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    const viewModal = document.getElementById("viewModal");
    const viewPhoto = document.getElementById("viewPhoto");
    const viewTitle = document.getElementById("viewTitle");
    const viewDate = document.getElementById("viewDate");
    const viewDesc = document.getElementById("viewDesc");
    const viewEditBtn = document.getElementById("viewEditBtn");
    const viewDelBtn = document.getElementById("viewDelBtn");
    const viewCloseBtn = document.getElementById("viewCloseBtn");

    let editingId = null;
    let currentPhoto = "";
    let viewingId = null;

    pageTitle.innerHTML = `${deptNames[dept] || dept} &mdash; ${ordinal} Year Events`;
    document.getElementById("backLink").href = `year.html?dept=${dept}&year=${year}`;

    function resizeImage(file, maxSize) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement("canvas");
                    let w = img.width, h = img.height;
                    if (w > h && w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
                    else if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL("image/jpeg", 0.75));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    photoInput.addEventListener("change", async function () {
        if (!photoInput.files[0]) return;
        currentPhoto = await resizeImage(photoInput.files[0], 500);
        photoPreview.src = currentPhoto;
        photoPreview.style.display = "block";
    });

    function formatDate(d) {
        if (!d) return "";
        const dt = new Date(d + "T00:00:00");
        if (isNaN(dt)) return d;
        return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }

    function renderGrid() {
        const rows = getData();
        const query = (searchInput.value || "").toLowerCase().trim();
        const filtered = rows.filter(r =>
            !query || (r.title + " " + r.description).toLowerCase().includes(query)
        ).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

        if (filtered.length === 0) {
            grid.innerHTML = `<p class="emptyMsg">No events added yet. Click "Add Event" to create one.</p>`;
            return;
        }

        grid.innerHTML = filtered.map(r => `
            <div class="eventCard" data-id="${r.id}">
                ${r.photo ? `<img src="${r.photo}" class="eventPhoto" alt="event">` : `<div class="eventPhoto noPhoto">🎉</div>`}
                <div class="eventCardBody">
                    <h3>${escapeHtml(r.title)}</h3>
                    ${r.date ? `<span class="eventDate">📅 ${formatDate(r.date)}</span>` : ""}
                    <p class="eventSnippet">${escapeHtml((r.description || "").slice(0, 90))}${(r.description || "").length > 90 ? "…" : ""}</p>
                </div>
            </div>
        `).join("");

        grid.querySelectorAll(".eventCard").forEach(card =>
            card.addEventListener("click", () => openView(Number(card.dataset.id))));
    }

    function resetFields() {
        titleInput.value = ""; dateInput.value = ""; descInput.value = "";
        photoInput.value = ""; photoPreview.src = ""; photoPreview.style.display = "none";
        currentPhoto = ""; editingId = null;
    }

    function openAdd() {
        resetFields();
        modalTitle.textContent = "Add Event";
        editModal.style.display = "flex";
    }

    function openEdit(id) {
        const record = getData().find(r => r.id === id);
        if (!record) return;
        editingId = id;
        modalTitle.textContent = "Edit Event";
        titleInput.value = record.title || "";
        dateInput.value = record.date || "";
        descInput.value = record.description || "";
        currentPhoto = record.photo || "";
        if (currentPhoto) { photoPreview.src = currentPhoto; photoPreview.style.display = "block"; }
        editModal.style.display = "flex";
        viewModal.style.display = "none";
    }

    function closeEditModal() { editModal.style.display = "none"; resetFields(); }

    function openView(id) {
        const record = getData().find(r => r.id === id);
        if (!record) return;
        viewingId = id;
        viewTitle.textContent = record.title;
        viewDate.textContent = record.date ? "📅 " + formatDate(record.date) : "";
        viewDesc.textContent = record.description || "";
        if (record.photo) { viewPhoto.src = record.photo; viewPhoto.style.display = "block"; }
        else { viewPhoto.style.display = "none"; }
        viewModal.style.display = "flex";
    }

    addBtn.addEventListener("click", openAdd);
    cancelBtn.addEventListener("click", closeEditModal);
    editModal.addEventListener("click", e => { if (e.target === editModal) closeEditModal(); });

    viewCloseBtn.addEventListener("click", () => viewModal.style.display = "none");
    viewModal.addEventListener("click", e => { if (e.target === viewModal) viewModal.style.display = "none"; });
    viewEditBtn.addEventListener("click", () => openEdit(viewingId));
    viewDelBtn.addEventListener("click", () => {
        if (!confirm("Delete this event?")) return;
        setData(getData().filter(r => r.id !== viewingId));
        viewModal.style.display = "none";
        renderGrid();
    });

    saveBtn.addEventListener("click", () => {
        try {
            if (titleInput.value.trim() === "") { alert("Please enter an event title"); return; }
            const rows = getData();
            const record = {
                id: editingId || Date.now(),
                title: titleInput.value.trim(),
                date: dateInput.value,
                description: descInput.value.trim(),
                photo: currentPhoto
            };
            if (editingId) {
                const idx = rows.findIndex(r => r.id === editingId);
                if (idx > -1) rows[idx] = record;
            } else {
                rows.push(record);
            }
            setData(rows);
            closeEditModal();
            renderGrid();
        } catch (err) {
            console.error(err);
            alert("Something went wrong while saving the event. Please try again.");
        }
    });

    searchInput.addEventListener("input", renderGrid);

    renderGrid();
})();
