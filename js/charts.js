/* ============================================================
   Charts — Lightweight SVG chart helpers for the dashboard
   No external dependencies — pure inline SVG generation
   ============================================================ */

const Charts = {

  /* ---- Donut Chart ----
     data: [{ label, value, color }]
     opts: { size, thickness, showLegend, title }
  */
  donut(data, opts = {}) {
    const size = opts.size || 160;
    const thickness = opts.thickness || 28;
    const r = (size - thickness) / 2;
    const cx = size / 2, cy = size / 2;
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) {
      return `<div style="text-align:center;padding:16px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--gray-200)" stroke-width="${thickness}"/>
          <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="14" fill="var(--ink-tertiary)">No data</text>
        </svg>
      </div>`;
    }

    let offset = 0;
    const circumference = 2 * Math.PI * r;
    const arcs = data.filter(d => d.value > 0).map(d => {
      const pct = d.value / total;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const rotation = offset * 360 - 90;
      offset += pct;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${d.color}" stroke-width="${thickness}"
        stroke-dasharray="${dash} ${gap}"
        transform="rotate(${rotation} ${cx} ${cy})"
        style="transition:stroke-dasharray 0.6s ease;"/>`;
    }).join('');

    const centerLabel = opts.centerLabel || total;
    const centerSub = opts.centerSub || '';

    const legend = opts.showLegend !== false ? `
      <div style="display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:center;margin-top:8px;">
        ${data.filter(d => d.value > 0).map(d => `
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${d.color};flex-shrink:0;"></span>
            <span class="text-xs text-muted">${d.label}: ${d.value} (${Math.round(d.value / total * 100)}%)</span>
          </div>
        `).join('')}
      </div>` : '';

    return `
      <div style="text-align:center;">
        ${opts.title ? `<div class="text-xs text-muted fw-500 mb-2">${opts.title}</div>` : ''}
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--gray-100)" stroke-width="${thickness}"/>
          ${arcs}
          <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--ink)">${centerLabel}</text>
          ${centerSub ? `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="var(--ink-tertiary)">${centerSub}</text>` : ''}
        </svg>
        ${legend}
      </div>`;
  },

  /* ---- Horizontal Bar Chart ----
     data: [{ label, value, color?, maxLabel? }]
     opts: { max, height, barHeight, showValues }
  */
  barH(data, opts = {}) {
    const max = opts.max || Math.max(...data.map(d => d.value), 1);
    const barH = opts.barHeight || 20;
    const gap = 8;

    return `<div style="display:flex;flex-direction:column;gap:${gap}px;">
      ${data.map(d => {
        const pct = Math.round((d.value / max) * 100);
        const color = d.color || 'var(--primary)';
        return `<div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span class="text-xs fw-500">${d.label}</span>
            <span class="text-xs text-muted">${d.maxLabel || d.value}</span>
          </div>
          <div style="height:${barH}px;background:var(--gray-100);border-radius:${barH / 2}px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:${barH / 2}px;transition:width 0.5s ease;min-width:${d.value > 0 ? '4px' : '0'};"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },

  /* ---- Vertical Bar Chart ----
     data: [{ label, value, color? }]
     opts: { height, barWidth, showValues }
  */
  barV(data, opts = {}) {
    const height = opts.height || 140;
    const barW = opts.barWidth || 32;
    const max = Math.max(...data.map(d => d.value), 1);
    const gap = 6;
    const totalW = data.length * (barW + gap);

    const bars = data.map((d, i) => {
      const barH = Math.max(2, (d.value / max) * height);
      const color = d.color || 'var(--primary)';
      const x = i * (barW + gap);
      return `
        <rect x="${x}" y="${height - barH}" width="${barW}" height="${barH}" rx="4" fill="${color}" opacity="0.85">
          <title>${d.label}: ${d.value}</title>
        </rect>
        ${opts.showValues !== false ? `<text x="${x + barW / 2}" y="${height - barH - 4}" text-anchor="middle" font-size="10" fill="var(--ink-secondary)" font-weight="500">${d.value}</text>` : ''}
        <text x="${x + barW / 2}" y="${height + 14}" text-anchor="middle" font-size="9" fill="var(--ink-tertiary)">${d.label}</text>
      `;
    }).join('');

    return `<svg width="${totalW}" height="${height + 20}" viewBox="0 0 ${totalW} ${height + 20}" style="overflow:visible;">
      ${bars}
    </svg>`;
  },

  /* ---- Line / Area Chart ----
     data: [{ label, value }]
     opts: { width, height, color, fill, showDots }
  */
  line(data, opts = {}) {
    if (!data || data.length < 2) return '<div class="text-xs text-muted">Not enough data</div>';
    const w = opts.width || 300;
    const h = opts.height || 100;
    const pad = 20;
    const color = opts.color || 'var(--primary)';
    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value), 0);
    const range = max - min || 1;

    const points = data.map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (d.value - min) / range) * (h - 2 * pad);
      return { x, y, ...d };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

    const dots = opts.showDots !== false ? points.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${color}" stroke="var(--surface)" stroke-width="2">
        <title>${p.label}: ${p.value}</title>
      </circle>`
    ).join('') : '';

    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${opts.fill !== false ? `<path d="${areaD}" fill="${color}" opacity="0.08"/>` : ''}
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
  },

  /* ---- Gauge / Semi-circle ----
     value: 0-100
     opts: { size, color, label }
  */
  gauge(value, opts = {}) {
    const size = opts.size || 120;
    const thickness = 12;
    const r = (size - thickness) / 2;
    const cx = size / 2, cy = size / 2 + 10;
    const circumference = Math.PI * r; // half circle
    const dash = (value / 100) * circumference;
    const color = opts.color || (value >= 80 ? 'var(--success)' : value >= 60 ? 'var(--warning)' : 'var(--danger)');

    return `<div style="text-align:center;">
      <svg width="${size}" height="${size * 0.65}" viewBox="0 0 ${size} ${size * 0.65}">
        <path d="M ${thickness / 2} ${cy} A ${r} ${r} 0 0 1 ${size - thickness / 2} ${cy}"
          fill="none" stroke="var(--gray-100)" stroke-width="${thickness}" stroke-linecap="round"/>
        <path d="M ${thickness / 2} ${cy} A ${r} ${r} 0 0 1 ${size - thickness / 2} ${cy}"
          fill="none" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round"
          stroke-dasharray="${dash} ${circumference}" style="transition:stroke-dasharray 0.6s ease;"/>
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ink)">${value}%</text>
      </svg>
      ${opts.label ? `<div class="text-xs text-muted" style="margin-top:-4px;">${opts.label}</div>` : ''}
    </div>`;
  },

  /* ---- Sparkline (inline mini chart) ---- */
  sparkline(values, opts = {}) {
    if (!values || values.length < 2) return '';
    const w = opts.width || 80;
    const h = opts.height || 24;
    const color = opts.color || 'var(--primary)';
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = 2 + (1 - (v - min) / range) * (h - 4);
      return `${x},${y}`;
    }).join(' ');

    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
};
