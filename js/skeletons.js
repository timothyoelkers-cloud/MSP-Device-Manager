/* ============================================================
   Skeletons — Loading placeholder system
   Provides shimmer-animated skeleton screens for all page types.
   ============================================================ */

const Skeletons = (() => {
    let _styleInjected = false;

    // ── Inject shimmer CSS once ──────────────────────────────
    function _injectStyles() {
        if (_styleInjected) return;
        _styleInjected = true;

        const style = document.createElement('style');
        style.id = 'skeleton-styles';
        style.textContent = `
            @keyframes skeleton-shimmer {
                0%   { background-position: -400px 0; }
                100% { background-position: 400px 0; }
            }

            .skeleton-bone {
                background-color: var(--gray-100, #f3f4f6);
                background-image: linear-gradient(
                    90deg,
                    var(--gray-100, #f3f4f6) 0%,
                    var(--gray-200, #e5e7eb) 40%,
                    var(--gray-100, #f3f4f6) 80%
                );
                background-size: 800px 100%;
                background-repeat: no-repeat;
                animation: skeleton-shimmer 1.5s ease-in-out infinite;
                border-radius: var(--radius-sm, 6px);
                display: block;
            }

            .skeleton-bone--circle {
                border-radius: 50%;
                flex-shrink: 0;
            }

            .skeleton-bone--line {
                height: 14px;
                margin-bottom: 10px;
            }

            .skeleton-bone--line-sm {
                height: 12px;
                margin-bottom: 8px;
            }

            .skeleton-bone--line-lg {
                height: 16px;
                margin-bottom: 12px;
            }

            .skeleton-bone--heading {
                height: 24px;
                margin-bottom: 16px;
            }

            .skeleton-bone--card {
                background-color: var(--surface, #fff);
                border: 1px solid var(--border, #e5e7eb);
                border-radius: var(--radius-md, 10px);
                padding: 0;
                overflow: hidden;
                /* Card itself does not shimmer — children do */
                animation: none;
                background-image: none;
            }

            .skeleton-bone--card .skeleton-card-header {
                padding: 14px 18px;
                border-bottom: 1px solid var(--border, #e5e7eb);
            }

            .skeleton-bone--card .skeleton-card-body {
                padding: 18px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            /* KPI card inner */
            .skeleton-kpi-value {
                height: 32px;
                margin-bottom: 8px;
                border-radius: var(--radius-sm, 6px);
            }

            /* Chart placeholder */
            .skeleton-bone--chart {
                height: 220px;
                border-radius: var(--radius-sm, 6px);
            }

            /* Layout helpers */
            .skeleton-row {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }

            .skeleton-row > * {
                flex: 1;
                min-width: 0;
            }

            .skeleton-grid-3x2 {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 20px;
            }

            .skeleton-grid-2col {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }

            .skeleton-page-header {
                margin-bottom: 24px;
            }

            .skeleton-form-group {
                margin-bottom: 20px;
            }

            .skeleton-form-input {
                height: 40px;
                border-radius: var(--radius-sm, 6px);
            }

            /* Table skeleton */
            .skeleton-table {
                width: 100%;
                border-collapse: collapse;
            }

            .skeleton-table th,
            .skeleton-table td {
                padding: 12px 16px;
                border-bottom: 1px solid var(--border, #e5e7eb);
            }

            .skeleton-table th .skeleton-bone {
                height: 12px;
            }

            .skeleton-table td .skeleton-bone {
                height: 14px;
            }

            /* Dark mode — CSS vars handle most of it; ensure card bg adapts */
            html.dark .skeleton-bone--card {
                background-color: var(--surface, #1e1e1e);
                border-color: var(--border, #333);
            }
        `;
        document.head.appendChild(style);
    }

    // ── Primitive renderers ──────────────────────────────────

    function renderLine(width) {
        _injectStyles();
        const w = width || '100%';
        return `<span class="skeleton-bone skeleton-bone--line" style="width:${w}"></span>`;
    }

    function renderCircle(size) {
        _injectStyles();
        const s = size || 40;
        return `<span class="skeleton-bone skeleton-bone--circle" style="width:${s}px;height:${s}px"></span>`;
    }

    // ── Composite renderers ─────────────────────────────────

    function renderCard() {
        _injectStyles();
        return `
            <div class="skeleton-bone--card">
                <div class="skeleton-card-header">
                    <span class="skeleton-bone skeleton-bone--line" style="width:45%;margin-bottom:0"></span>
                </div>
                <div class="skeleton-card-body">
                    <span class="skeleton-bone skeleton-bone--line" style="width:90%"></span>
                    <span class="skeleton-bone skeleton-bone--line" style="width:70%"></span>
                    <span class="skeleton-bone skeleton-bone--line" style="width:80%;margin-bottom:0"></span>
                </div>
            </div>`;
    }

    function renderKPIRow(count) {
        _injectStyles();
        const n = count || 4;
        let cards = '';
        for (let i = 0; i < n; i++) {
            cards += `
                <div class="skeleton-bone--card">
                    <div class="skeleton-card-body" style="padding:20px">
                        <span class="skeleton-bone skeleton-bone--line-sm" style="width:55%"></span>
                        <span class="skeleton-bone skeleton-kpi-value" style="width:40%"></span>
                        <span class="skeleton-bone skeleton-bone--line-sm" style="width:65%;margin-bottom:0"></span>
                    </div>
                </div>`;
        }
        return `<div class="skeleton-row">${cards}</div>`;
    }

    function renderTable(rows, cols) {
        _injectStyles();
        const r = rows || 8;
        const c = cols || 5;
        const widths = ['30%', '50%', '40%', '60%', '35%', '45%', '55%', '65%'];

        let thead = '<tr>';
        for (let j = 0; j < c; j++) {
            thead += `<th><span class="skeleton-bone" style="width:${widths[j % widths.length]}"></span></th>`;
        }
        thead += '</tr>';

        let tbody = '';
        for (let i = 0; i < r; i++) {
            tbody += '<tr>';
            for (let j = 0; j < c; j++) {
                // Vary widths per row for a natural look
                const w = widths[(i + j) % widths.length];
                tbody += `<td><span class="skeleton-bone" style="width:${w}"></span></td>`;
            }
            tbody += '</tr>';
        }

        return `
            <div class="card">
                <div class="card-body" style="padding:0;overflow:hidden">
                    <table class="table skeleton-table">
                        <thead>${thead}</thead>
                        <tbody>${tbody}</tbody>
                    </table>
                </div>
            </div>`;
    }

    // ── Page-level skeletons ─────────────────────────────────

    function _pageHeader(titleWidth) {
        return `
            <div class="page-header skeleton-page-header">
                <span class="skeleton-bone skeleton-bone--heading" style="width:${titleWidth || '30%'}"></span>
            </div>`;
    }

    function renderPage(type) {
        _injectStyles();

        switch (type) {

            // ── Dashboard: 4 KPI cards + 2 chart cards ──────
            case 'dashboard':
                return `
                    ${renderKPIRow(4)}
                    <div class="skeleton-row">
                        <div class="skeleton-bone--card">
                            <div class="skeleton-card-header">
                                <span class="skeleton-bone skeleton-bone--line" style="width:35%;margin-bottom:0"></span>
                            </div>
                            <div class="skeleton-card-body">
                                <span class="skeleton-bone skeleton-bone--chart"></span>
                            </div>
                        </div>
                        <div class="skeleton-bone--card">
                            <div class="skeleton-card-header">
                                <span class="skeleton-bone skeleton-bone--line" style="width:40%;margin-bottom:0"></span>
                            </div>
                            <div class="skeleton-card-body">
                                <span class="skeleton-bone skeleton-bone--chart"></span>
                            </div>
                        </div>
                    </div>`;

            // ── Table: header + 8-row / 5-col table ─────────
            case 'table':
                return `
                    ${_pageHeader('25%')}
                    ${renderTable(8, 5)}`;

            // ── Detail: header + 2-col info cards ───────────
            case 'detail':
                return `
                    ${_pageHeader('35%')}
                    <div class="skeleton-grid-2col">
                        <div class="skeleton-bone--card">
                            <div class="skeleton-card-header">
                                <span class="skeleton-bone skeleton-bone--line" style="width:50%;margin-bottom:0"></span>
                            </div>
                            <div class="skeleton-card-body">
                                <span class="skeleton-bone skeleton-bone--line" style="width:80%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:65%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:90%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:55%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:70%;margin-bottom:0"></span>
                            </div>
                        </div>
                        <div class="skeleton-bone--card">
                            <div class="skeleton-card-header">
                                <span class="skeleton-bone skeleton-bone--line" style="width:40%;margin-bottom:0"></span>
                            </div>
                            <div class="skeleton-card-body">
                                <span class="skeleton-bone skeleton-bone--line" style="width:75%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:60%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:85%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:50%"></span>
                                <span class="skeleton-bone skeleton-bone--line" style="width:70%;margin-bottom:0"></span>
                            </div>
                        </div>
                    </div>
                    <div class="skeleton-bone--card">
                        <div class="skeleton-card-header">
                            <span class="skeleton-bone skeleton-bone--line" style="width:30%;margin-bottom:0"></span>
                        </div>
                        <div class="skeleton-card-body">
                            <span class="skeleton-bone skeleton-bone--line" style="width:95%"></span>
                            <span class="skeleton-bone skeleton-bone--line" style="width:80%"></span>
                            <span class="skeleton-bone skeleton-bone--line" style="width:60%;margin-bottom:0"></span>
                        </div>
                    </div>`;

            // ── Grid: header + 3x2 card grid ────────────────
            case 'grid':
                return `
                    ${_pageHeader('28%')}
                    <div class="skeleton-grid-3x2">
                        ${renderCard()}${renderCard()}${renderCard()}
                        ${renderCard()}${renderCard()}${renderCard()}
                    </div>`;

            // ── Form: header + label/input pairs ────────────
            case 'form':
                return `
                    ${_pageHeader('22%')}
                    <div class="skeleton-bone--card">
                        <div class="skeleton-card-body">
                            <div class="skeleton-form-group">
                                <span class="skeleton-bone skeleton-bone--line-sm" style="width:18%;margin-bottom:6px"></span>
                                <span class="skeleton-bone skeleton-form-input" style="width:100%"></span>
                            </div>
                            <div class="skeleton-form-group">
                                <span class="skeleton-bone skeleton-bone--line-sm" style="width:22%;margin-bottom:6px"></span>
                                <span class="skeleton-bone skeleton-form-input" style="width:100%"></span>
                            </div>
                            <div class="skeleton-form-group">
                                <span class="skeleton-bone skeleton-bone--line-sm" style="width:15%;margin-bottom:6px"></span>
                                <span class="skeleton-bone skeleton-form-input" style="width:100%"></span>
                            </div>
                            <div class="skeleton-form-group">
                                <span class="skeleton-bone skeleton-bone--line-sm" style="width:25%;margin-bottom:6px"></span>
                                <span class="skeleton-bone skeleton-form-input" style="width:100%;height:100px"></span>
                            </div>
                            <div class="skeleton-form-group" style="margin-bottom:0">
                                <span class="skeleton-bone" style="width:120px;height:40px;border-radius:var(--radius-sm,6px)"></span>
                            </div>
                        </div>
                    </div>`;

            default:
                return renderCard();
        }
    }

    // ── Public API ───────────────────────────────────────────
    return {
        renderPage,
        renderCard,
        renderTable,
        renderKPIRow,
        renderLine,
        renderCircle
    };
})();
