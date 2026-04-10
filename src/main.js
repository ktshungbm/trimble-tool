// ==== GLOBAL VARIABLES & EXPORTS CHO INLINE OCLICKS ====
let isAdmin = false;

window.toggleAdmin = function() {
    if(!isAdmin) {
        let pass = prompt("Hệ thống bảo mật\nVui lòng nhập mật khẩu Admin để mở khóa tính năng (Mật khẩu test: 123456):");
        if(pass === "123456") {
            isAdmin = true;
            const btn = document.getElementById('adminToggle');
            btn.innerHTML = '<i class="fa-solid fa-unlock text-emerald-500"></i><span class="text-emerald-700 font-bold text-xs ml-1 uppercase">Admin Mode</span>';
            btn.classList.replace('bg-slate-100', 'bg-emerald-100');
            btn.classList.replace('border-slate-200', 'border-emerald-200');
            
            document.getElementById('upload-locked-msg').classList.add('hidden');
            document.getElementById('upload-section').classList.remove('hidden');
            document.getElementById('btn-create-rfi-locked').classList.add('hidden');
            document.getElementById('btn-create-rfi').classList.remove('hidden');
            document.getElementById('btn-create-rfi').classList.add('flex');
            document.getElementById('btn-hold-locked').classList.add('hidden');
            document.getElementById('btn-hold-active').classList.remove('hidden');
            document.getElementById('btn-hold-active').classList.add('flex');
            alert("Đã mở khóa toàn quyền quản trị!");
        } else if(pass !== null) {
            alert("Mật khẩu không chính xác!");
        }
    } else {
        isAdmin = false;
        const btn = document.getElementById('adminToggle');
        btn.innerHTML = '<i class="fa-solid fa-lock text-slate-400"></i><span class="text-slate-500 font-bold text-xs ml-1 uppercase">Chỉ xem</span>';
        btn.classList.replace('bg-emerald-100', 'bg-slate-100');
        btn.classList.replace('border-emerald-200', 'border-slate-200');
        
        document.getElementById('upload-locked-msg').classList.remove('hidden');
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('btn-create-rfi-locked').classList.remove('hidden');
        document.getElementById('btn-create-rfi').classList.add('hidden');
        document.getElementById('btn-create-rfi').classList.remove('flex');
        document.getElementById('btn-hold-locked').classList.remove('hidden');
        document.getElementById('btn-hold-active').classList.add('hidden');
        document.getElementById('btn-hold-active').classList.remove('flex');
    }
};

const pageTitles = {
    'dashboard': 'Tổng quan Dự án Dashboard',
    'tool': 'Công cụ kiểm soát ban hành cấu kiện',
    'rfi': 'Quản lý RFI & Vướng mắc',
    'hold': 'Quản lý danh sách Hold & Vướng mắc',
    'reports': 'Tra cứu vòng đời & Báo cáo thông minh'
};

window.switchTab = function(tabId) {
    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 text-slate-400 hover:text-white";
    });
    document.getElementById('btn-' + tabId).className = "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all bg-blue-600 text-white shadow-lg shadow-blue-900/20";
    
    ['tab-dashboard', 'tab-tool', 'tab-rfi', 'tab-hold', 'tab-reports'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    document.getElementById('page-title').innerText = pageTitles[tabId];

    if(tabId === 'reports') window.applyFilters();
};

window.openUnholdModal = function(mark) {
    if(!isAdmin) {
        alert("⚠️ Chỉ Admin mới có quyền thao tác Gỡ Hold.\nVui lòng bấm biểu tượng ổ khóa phía trên để đăng nhập!");
        return;
    }
    document.getElementById('unhold-mark').value = mark;
    document.getElementById('unhold-modal').classList.remove('hidden');
};

window.closeUnholdModal = function() {
    document.getElementById('unhold-modal').classList.add('hidden');
    document.getElementById('img-filename').innerText = 'Click hoặc kéo thả ảnh vào đây';
};

window.confirmUnhold = function() {
    let mark = document.getElementById('unhold-mark').value;
    alert(`✅ Xác nhận: Đã gỡ Hold cho cấu kiện ${mark}!\nCấu kiện đã được chuyển lại vào hàng đợi "Đang vẽ Shop".`);
    window.closeUnholdModal();
};

const dbSmartData = [
    { project: 'da1', shop: 'dv1', mark: 'C1-A1', status: 'hold', htmlStatus: '<span class="text-red-600 font-bold text-xs"><i class="fa-solid fa-hand"></i> Đang Hold</span>', dateCreate: '15/10/2023', lastCheck: '08/04/2026' },
    { project: 'da1', shop: 'dv1', mark: 'D1-R2', status: 'issued', htmlStatus: '<span class="text-emerald-600 font-bold text-xs"><i class="fa-solid fa-file-signature"></i> Đã Ban hành</span>', dateCreate: '20/10/2023', lastCheck: '07/04/2026' },
    { project: 'da1', shop: 'dv1', mark: 'K5-T1', status: 'shop', htmlStatus: '<span class="text-blue-600 font-bold text-xs"><i class="fa-solid fa-eye"></i> Đã Trình duyệt</span>', dateCreate: '21/10/2023', lastCheck: '06/04/2026' },
    { project: 'da1', shop: 'dv1', mark: 'Z9-L2', status: 'rfi', htmlStatus: '<span class="text-amber-500 font-bold text-xs"><i class="fa-solid fa-comments"></i> Chờ RFI</span>', dateCreate: '10/10/2023', lastCheck: '05/04/2026' }
];

window.applyFilters = function() {
    const valProject = document.getElementById('smart-filter-project').value;
    const valShop = document.getElementById('smart-filter-shop').value;
    const valMark = document.getElementById('smart-filter-mark').value.trim().toLowerCase();
    const valStatus = document.getElementById('smart-filter-status').value;

    const filteredData = dbSmartData.filter(item => {
        const matchProject = (valProject === 'all') || (item.project === valProject);
        const matchShop = (valShop === 'all') || (item.shop === valShop);
        const matchMark = (valMark === '') || (item.mark.toLowerCase().includes(valMark));
        const matchStatus = (valStatus === 'all') || (item.status === valStatus);
        return matchProject && matchShop && matchMark && matchStatus;
    });
    renderSmartTable(filteredData);
};

window.resetFilters = function() {
    document.getElementById('smart-filter-project').value = 'all';
    document.getElementById('smart-filter-shop').value = 'all';
    document.getElementById('smart-filter-mark').value = '';
    document.getElementById('smart-filter-status').value = 'all';
    window.applyFilters(); 
};

window.searchTable = function() {
    let input = document.getElementById("searchInput").value.toUpperCase();
    let tr = document.querySelector('#reportTable tbody').getElementsByTagName("tr");
    for (let i = 0; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td")[1];
        if (td) { 
            tr[i].style.display = (td.textContent || td.innerText).toUpperCase().indexOf(input) > -1 ? "" : "none"; 
        }       
    }
};

// ==== LOGIC VÀ EVENTS CHẠY SAU KHI DOM LOAD XONG ====
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // --- Khởi tạo BI Charts ---
    const ctxBar = document.getElementById('barChart');
    if (ctxBar) {
        new Chart(ctxBar.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
                datasets: [
                    { label: 'KL ban hành', data: [120, 150, 180, 200], backgroundColor: '#3b82f6', borderRadius: 4, barPercentage: 0.7 },
                    { label: 'Sản xuất', data: [100, 130, 160, 190], backgroundColor: '#8b5cf6', borderRadius: 4, barPercentage: 0.7 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { grid: { borderDash: [4, 4], color: '#f1f5f9' }, beginAtZero: true } }, plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } } } }
        });
    }

    const ctxDonut = document.getElementById('donutChart');
    if(ctxDonut) {
        new Chart(ctxDonut.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Đã trình duyệt', 'Đã ban hành', 'Chờ RFI'],
                datasets: [{ data: [50, 35, 15], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }
        });
    }

    const ctxHold = document.getElementById('holdChart');
    if (ctxHold) {
        new Chart(ctxHold.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Cấn chạm kiến trúc', 'Cấn chạm TK-Shop', 'Thay đổi thiết kế', 'Thay đổi liên kết', 'Thay đổi vật tư'],
                datasets: [{
                    label: 'Số lượng cấu kiện',
                    data: [12, 8, 15, 5, 10],
                    backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'],
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // --- Xử lý sự kiện kéo thả file CSV ---
    const fileInput = document.getElementById('fileUpload');
    const dropArea = document.getElementById('drop-area');
    const fileNameDisplay = document.getElementById('file-name-display');
    const btnIssue = document.getElementById('btnIssue');

    if(dropArea) {
        dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('dragover'); });
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
        dropArea.addEventListener('drop', (e) => { e.preventDefault(); dropArea.classList.remove('dragover'); });
    }

    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
            if (this.files.length > 0) {
                const file = this.files[0];
                fileNameDisplay.textContent = file.name;
                fileNameDisplay.classList.add('text-blue-600');
                btnIssue.classList.remove('hidden');
                btnIssue.classList.add('flex');
                btnIssue.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đọc file...';

                const reader = new FileReader();
                reader.onload = e => { parseCSV(e.target.result); processModelObjects(); };
                reader.readAsText(file);
            }
        });
    }

    if(btnIssue) {
        btnIssue.addEventListener('click', processModelObjects);
    }
});


// ==== HELPER FUNCTIONS ====
function renderSmartTable(data) {
    const tbody = document.getElementById('smart-report-tbody');
    const countLabel = document.getElementById('result-count');
    if(!tbody) return;

    tbody.innerHTML = '';
    countLabel.innerText = data.length;

    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 bg-slate-50/30"><i class="fa-solid fa-filter-circle-xmark text-4xl mb-3 block text-slate-300"></i><p class="font-medium text-slate-500">Không tìm thấy cấu kiện nào phù hợp</p></td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50/50 transition-colors cursor-pointer border-b border-slate-50 last:border-0";
        tr.innerHTML = `
            <td class="px-6 py-4 text-slate-500 font-medium">${index + 1}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${item.mark}</td>
            <td class="px-6 py-4 text-slate-500">${item.dateCreate}</td>
            <td class="px-6 py-4">${item.htmlStatus}</td>
            <td class="px-6 py-4 text-slate-500 text-xs font-medium"><i class="fa-regular fa-clock mr-1"></i>${item.lastCheck}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderReport(data) {
    document.getElementById('reportPanel').style.display = 'block';
    const tbody = document.querySelector('#reportTable tbody');
    tbody.innerHTML = ''; 
    const uniqueAssemblies = [...new Map(data.map(item => [item.mark, item])).values()];

    uniqueAssemblies.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
            <td class="px-6 py-4 text-slate-500">${index + 1}</td>
            <td class="px-6 py-4 font-bold text-slate-800">${item.mark}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${item.issued ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}">
                    ${item.issued ? "Đã ban hành" : "Chưa ban hành"}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// ==== TRIMBLE API LOGIC ====
let issuedAssemblies = []; 
let workspaceAPI;

// Kết nối với Trimble Workspace (chờ load qua CDN trong file index.html)
if(typeof WorkspaceAPI !== 'undefined') {
    WorkspaceAPI.init()
        .then(api => { workspaceAPI = api; console.log("WorkspaceAPI Loaded"); })
        .catch(err => console.log("Chạy ngoài Trimble Connect. Không có API."));
} else {
    console.warn("Global WorkspaceAPI chưa được tải. Vui lòng kiểm tra script src trên index.html.");
}

function parseCSV(csvText) {
    issuedAssemblies = [];
    const rows = csvText.split('\n');
    let isDataRow = false;
    rows.forEach(row => {
        const cols = row.split(',');
        if (cols.includes('DRAWING NO.')) { isDataRow = true; return; }
        if (isDataRow && cols.length > 1) {
            const drawingNo = cols[1] ? cols[1].trim() : "";
            if (drawingNo !== "" && drawingNo !== "DRAWING NO.") issuedAssemblies.push(drawingNo);
        }
    });
}

async function processModelObjects() {
    let reportData = [];
    const btnIssue = document.getElementById('btnIssue');

    if (!workspaceAPI) {
        alert("⚠️ Chưa kết nối được với mô hình Trimble.");
        if(btnIssue) btnIssue.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Lỗi API';
        return;
    }
    try {
        if(btnIssue) btnIssue.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang phân tích mô hình...';
        
        // 1. Get objects
        const objects = await workspaceAPI.viewer.getObjects();
        
        if (objects.length === 0) {
            alert("Mô hình đang trống hoặc chưa tải xong!");
            if(btnIssue) btnIssue.innerHTML = '<i class="fa-solid fa-paintbrush"></i> Bắt đầu Tô màu';
            return;
        }

        const allObjectIds = objects.map(obj => obj.id);
        await workspaceAPI.viewer.setColors([
            { color: { r: 200, g: 200, b: 200, a: 0.3 }, objectIds: allObjectIds }
        ]);

        let objectsToColorGreen = [];

        // 2. Scan and compare
        for (const obj of objects) {
            const properties = await workspaceAPI.viewer.getObjectProperties(obj.id);
            
            let assemblyMark = properties.find(p => 
                p.name === 'Name' || 
                p.name === 'Assembly mark' || 
                p.name === 'Part Number' || 
                p.name === 'Mark'
            )?.value;

            if (assemblyMark) {
                let isIssued = issuedAssemblies.includes(assemblyMark);
                reportData.push({ mark: assemblyMark, issued: isIssued });
                
                if (isIssued) {
                    objectsToColorGreen.push(obj.id);
                }
            }
        }

        // 3. Color green
        if (objectsToColorGreen.length > 0) {
            await workspaceAPI.viewer.setColors([
                { color: { r: 16, g: 185, b: 129, a: 1 }, objectIds: objectsToColorGreen }
            ]);
        }
        
        renderReport(reportData);
        
        if(btnIssue) {
            btnIssue.classList.replace('bg-blue-600', 'bg-emerald-500');
            btnIssue.classList.replace('hover:bg-blue-700', 'hover:bg-emerald-600');
            btnIssue.innerHTML = '<i class="fa-solid fa-check"></i> Đã tô màu & Lập báo cáo!';
            
            setTimeout(() => { 
                btnIssue.classList.add('hidden');
                btnIssue.classList.replace('bg-emerald-500', 'bg-blue-600');
                btnIssue.classList.replace('hover:bg-emerald-600', 'hover:bg-blue-700');
            }, 4000);
        }
        
    } catch (error) {
        console.error("Lỗi xử lý API Trimble:", error);
        if(btnIssue) btnIssue.innerHTML = '<i class="fa-solid fa-xmark"></i> Có lỗi xảy ra';
    }
}
