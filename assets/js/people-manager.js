// =====================================================================
// SRCE People Manager
// Shared engine used by students.html and staffs.html
// Handles: photo upload, default fields, dynamic (Excel-style) custom
// columns, add/edit/delete, search, JSON export/import.
// Data is scoped per Department + Year + Entity (students/staffs).
// =====================================================================

(function () {
    const params = new URLSearchParams(location.search);
    const dept = params.get("dept") || "CSE";
    const year = params.get("year") || "1";

    const entity = document.body.dataset.entity; // "students" or "staffs"
    const isStudent = entity === "students";

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

    const idLabel = isStudent ? "Register No" : "Staff ID";
    const idField = isStudent ? "regNo" : "staffId";

    const DATA_KEY = `SRCE_${entity.toUpperCase()}_${dept}_${year}`;
    const COL_KEY = `${DATA_KEY}_COLUMNS`;

    // -------------------- storage helpers --------------------
    function getData() {
        try { return JSON.parse(SRCEStorage.get(DATA_KEY)) || []; }
        catch (e) { return []; }
    }
    function setData(rows) { SRCEStorage.set(DATA_KEY, JSON.stringify(rows)); }

    function getColumns() {
        try { return JSON.parse(SRCEStorage.get(COL_KEY)) || []; }
        catch (e) { return []; }
    }
    function setColumns(cols) { SRCEStorage.set(COL_KEY, JSON.stringify(cols)); }

    // -------------------- DOM refs --------------------
    const pageTitle = document.getElementById("pageTitle");
    const tableHead = document.getElementById("tableHead");
    const tableBody = document.getElementById("tableBody");
    const searchInput = document.getElementById("searchBox");

    const addBtn = document.getElementById("addBtn");
    const addColumnBtn = document.getElementById("addColumnBtn");
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const importFile = document.getElementById("importFile");

    const modal = document.getElementById("recordModal");
    const modalTitle = document.getElementById("modalTitle");
    const idLabelEl = document.getElementById("idLabelText");
    const idInput = document.getElementById("idInput");
    const nameInput = document.getElementById("nameInput");
    const phoneInput = document.getElementById("phoneInput");
    const emailInput = document.getElementById("emailInput");
    const addressInput = document.getElementById("addressInput");
    const extraFieldsBox = document.getElementById("extraFields");
    const photoInput = document.getElementById("photoInput");
    const photoPreview = document.getElementById("photoPreview");
    const saveBtn = document.getElementById("saveBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    const colModal = document.getElementById("columnModal");
    const columnNameInput = document.getElementById("columnNameInput");
    const saveColumnBtn = document.getElementById("saveColumnBtn");
    const cancelColumnBtn = document.getElementById("cancelColumnBtn");

    let editingId = null;
    let currentPhoto = "";

    // -------------------- title --------------------
    pageTitle.innerHTML = `${deptNames[dept] || dept} &mdash; ${ordinal} Year ${isStudent ? "Students" : "Staffs"}`;
    idLabelEl.textContent = idLabel;
    idInput.placeholder = idLabel;
    document.getElementById("backLink").href = `year.html?dept=${dept}&year=${year}`;

    // -------------------- image resize (keeps localStorage light) --------------------
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
                    resolve(canvas.toDataURL("image/jpeg", 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    photoInput.addEventListener("change", async function () {
        if (!photoInput.files[0]) return;
        currentPhoto = await resizeImage(photoInput.files[0], 220);
        photoPreview.src = currentPhoto;
        photoPreview.style.display = "block";
    });

    // -------------------- table rendering --------------------
    function renderTableHead() {
        const cols = getColumns();
        let html = `<th>Photo</th><th>${idLabel}</th><th>Name</th><th>Phone</th><th>Email</th>`;
        cols.forEach(c => html += `<th>${escapeHtml(c)}</th>`);
        html += `<th>Actions</th>`;
        tableHead.innerHTML = html;
    }

    function renderExtraInputs(existingExtra) {
        const cols = getColumns();
        extraFieldsBox.innerHTML = "";
        cols.forEach(col => {
            const val = (existingExtra && existingExtra[col]) || "";
            extraFieldsBox.innerHTML += `
                <input type="text" class="dynamicInput" data-col="${escapeHtml(col)}"
                    placeholder="${escapeHtml(col)}" value="${escapeHtml(val)}">
            `;
        });
    }

    function escapeHtml(str) {
        return String(str ?? "").replace(/[&<>"']/g, s => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[s]));
    }

    function renderTable() {
        renderTableHead();
        const rows = getData();
        const query = (searchInput.value || "").toLowerCase().trim();
        const cols = getColumns();

        const filtered = rows.filter(r => {
            if (!query) return true;
            const hay = [r[idField], r.name, r.phone, r.email, ...cols.map(c => (r.extra || {})[c])]
                .join(" ").toLowerCase();
            return hay.includes(query);
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${5 + cols.length + 1}">No records found</td></tr>`;
            return;
        }

        tableBody.innerHTML = filtered.map(r => {
            const photoCell = r.photo
                ? `<img class="rowPhoto" src="${r.photo}" alt="photo">`
                : `<div class="noPhoto">👤</div>`;
            const extraCells = cols.map(c => `<td>${escapeHtml((r.extra || {})[c])}</td>`).join("");
            return `
                <tr>
                    <td>${photoCell}</td>
                    <td>${escapeHtml(r[idField])}</td>
                    <td>${escapeHtml(r.name)}</td>
                    <td>${escapeHtml(r.phone)}</td>
                    <td>${escapeHtml(r.email)}</td>
                    ${extraCells}
                    <td class="actionsCell">
                        <button class="editBtn" data-id="${r.id}">✏️</button>
                        <button class="delBtn" data-id="${r.id}">🗑️</button>
                    </td>
                </tr>
            `;
        }).join("");

        tableBody.querySelectorAll(".editBtn").forEach(b =>
            b.addEventListener("click", () => openEdit(Number(b.dataset.id))));
        tableBody.querySelectorAll(".delBtn").forEach(b =>
            b.addEventListener("click", () => deleteRecord(Number(b.dataset.id))));
    }

    // -------------------- modal open/close --------------------
    function resetModalFields() {
        idInput.value = ""; nameInput.value = ""; phoneInput.value = "";
        emailInput.value = ""; addressInput.value = "";
        photoPreview.src = ""; photoPreview.style.display = "none";
        photoInput.value = "";
        currentPhoto = "";
        editingId = null;
    }

    function openAdd() {
        resetModalFields();
        modalTitle.textContent = isStudent ? "Add Student" : "Add Staff";
        renderExtraInputs(null);
        modal.style.display = "flex";
    }

    function openEdit(id) {
        const rows = getData();
        const record = rows.find(r => r.id === id);
        if (!record) return;
        editingId = id;
        modalTitle.textContent = isStudent ? "Edit Student" : "Edit Staff";
        idInput.value = record[idField] || "";
        nameInput.value = record.name || "";
        phoneInput.value = record.phone || "";
        emailInput.value = record.email || "";
        addressInput.value = record.address || "";
        currentPhoto = record.photo || "";
        if (currentPhoto) { photoPreview.src = currentPhoto; photoPreview.style.display = "block"; }
        else { photoPreview.style.display = "none"; }
        renderExtraInputs(record.extra);
        modal.style.display = "flex";
    }

    function closeModal() { modal.style.display = "none"; resetModalFields(); }

    addBtn.addEventListener("click", openAdd);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

    saveBtn.addEventListener("click", function () {
        try {
            if (idInput.value.trim() === "" || nameInput.value.trim() === "") {
                alert(`Please enter ${idLabel} and Name`);
                return;
            }
            const extra = {};
            extraFieldsBox.querySelectorAll(".dynamicInput").forEach(inp => {
                extra[inp.dataset.col] = inp.value;
            });

            const rows = getData();
            const record = {
                id: editingId || Date.now(),
                [idField]: idInput.value.trim(),
                name: nameInput.value.trim(),
                phone: phoneInput.value.trim(),
                email: emailInput.value.trim(),
                address: addressInput.value.trim(),
                photo: currentPhoto,
                extra
            };

            if (editingId) {
                const idx = rows.findIndex(r => r.id === editingId);
                if (idx > -1) rows[idx] = record;
            } else {
                rows.push(record);
            }

            setData(rows);
            closeModal();
            renderTable();
        } catch (err) {
            console.error(err);
            alert("Something went wrong while saving. Please try again.");
        }
    });

    function deleteRecord(id) {
        if (!confirm("Delete this record?")) return;
        setData(getData().filter(r => r.id !== id));
        renderTable();
    }

    // -------------------- dynamic columns --------------------
    addColumnBtn.addEventListener("click", () => {
        columnNameInput.value = "";
        colModal.style.display = "flex";
    });
    cancelColumnBtn.addEventListener("click", () => colModal.style.display = "none");
    colModal.addEventListener("click", e => { if (e.target === colModal) colModal.style.display = "none"; });

    saveColumnBtn.addEventListener("click", () => {
        try {
            const name = columnNameInput.value.trim();
            if (name === "") { alert("Enter a column name"); return; }
            const cols = getColumns();
            if (cols.some(c => c.toLowerCase() === name.toLowerCase())) {
                alert("Column already exists"); return;
            }
            cols.push(name);
            setColumns(cols);
            colModal.style.display = "none";
            renderTable();
        } catch (err) {
            console.error(err);
            alert("Something went wrong while adding the column. Please try again.");
        }
    });

    // -------------------- search --------------------
    searchInput.addEventListener("input", renderTable);

    // -------------------- export / import --------------------
    exportBtn.addEventListener("click", () => {
        const payload = { columns: getColumns(), data: getData() };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `SRCE_${entity}_${dept}_Year${year}.json`;
        a.click();
    });

    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", () => {
        const file = importFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!confirm("Importing will replace the current records for this year. Continue?")) return;
                setColumns(parsed.columns || []);
                setData(parsed.data || []);
                renderTable();
            } catch (err) {
                alert("Invalid file. Please select a JSON file exported from this site.");
            }
        };
        reader.readAsText(file);
        importFile.value = "";
    });

    // -------------------- init --------------------
    renderTable();
})();
