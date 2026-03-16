/**
 * HelpTooltips — Contextual help tooltip system
 * Provides hover-activated tooltip cards for metrics and concepts
 */
const HelpTooltips = (() => {
    const tips = {
        compliance_rate: "Percentage of devices that meet all assigned compliance policies. Target: 95%+ for most organizations.",
        encryption_rate: "Percentage of devices with disk encryption (BitLocker/FileVault) enabled. Critical for data protection.",
        stale_devices: "Devices that haven't synced with Intune in 7+ days. May indicate offline, decommissioned, or lost devices.",
        conditional_access: "Azure AD policies that enforce security requirements (MFA, device compliance, location) before granting access to resources.",
        security_baselines: "Microsoft-recommended security configuration templates for Windows, Edge, and Defender. Based on industry best practices.",
        compliance_policies: "Rules that define the minimum requirements a device must meet (OS version, encryption, PIN) to be considered compliant.",
        config_profiles: "Settings pushed to devices for Wi-Fi, VPN, email, certificates, and device restrictions.",
        app_protection: "Policies that protect corporate data within apps (Outlook, Teams) without requiring device enrollment.",
        security_score: "Weighted score (0-100) based on compliance rate, encryption, CA policies, compliance policies, licensed users, and active users.",
        sla_status: "Service Level Agreement tracking. Green = meeting target, Yellow = within warning threshold, Red = breached.",
        trend_data: "Historical data captured daily via snapshots. Longer history = more accurate trends. Data stored locally in your browser.",
        gdap: "Granular Delegated Admin Privileges \u2014 Microsoft's model for partner access to customer tenants with scoped permissions.",
        autopilot: "Windows Autopilot streamlines device setup by pre-configuring devices in the cloud, reducing manual IT provisioning.",
        mfa_coverage: "Percentage of users with Multi-Factor Authentication enabled. Microsoft recommends 100% MFA coverage.",
        device_sync: "Last time the device checked in with Intune to receive policies and report status. Frequent sync = better management."
    };

    let styleInjected = false;
    let activeTooltip = null;

    function injectStyles() {
        if (styleInjected) return;
        styleInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            .help-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                font-size: 12px;
                line-height: 1;
                color: var(--ink-muted, #64748b);
                background: var(--gray-100, #f1f5f9);
                border: 1px solid var(--border, #e2e8f0);
                border-radius: 50%;
                cursor: help;
                user-select: none;
                vertical-align: middle;
                margin-left: 4px;
                transition: color 0.15s, background 0.15s;
            }

            .help-icon:hover {
                color: var(--primary, #2563eb);
                background: var(--gray-50, #f8fafc);
            }

            .help-inline {
                display: block;
                font-size: 12px;
                line-height: 1.4;
                color: var(--ink-muted, #64748b);
                margin-top: 4px;
            }

            .help-tooltip {
                position: absolute;
                z-index: 10000;
                max-width: 280px;
                padding: 10px 14px;
                background: #1e293b;
                color: #fff;
                font-size: 13px;
                line-height: 1.5;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
                pointer-events: none;
                opacity: 0;
                animation: helpTooltipFadeIn 150ms ease forwards;
            }

            .help-tooltip-arrow {
                position: absolute;
                width: 10px;
                height: 10px;
                background: #1e293b;
                transform: rotate(45deg);
                left: 50%;
                margin-left: -5px;
            }

            .help-tooltip--below .help-tooltip-arrow {
                top: -5px;
            }

            .help-tooltip--above .help-tooltip-arrow {
                bottom: -5px;
            }

            @keyframes helpTooltipFadeIn {
                from { opacity: 0; transform: translateY(4px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            .help-tooltip--above {
                animation-name: helpTooltipFadeInUp;
            }

            @keyframes helpTooltipFadeInUp {
                from { opacity: 0; transform: translateY(-4px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    function removeTooltip() {
        if (activeTooltip) {
            activeTooltip.remove();
            activeTooltip = null;
        }
    }

    function showTooltip(el) {
        removeTooltip();

        const key = el.getAttribute('data-help-tip');
        const text = tips[key];
        if (!text) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'help-tooltip';

        const arrow = document.createElement('div');
        arrow.className = 'help-tooltip-arrow';

        const content = document.createElement('span');
        content.textContent = text;

        tooltip.appendChild(arrow);
        tooltip.appendChild(content);
        document.body.appendChild(tooltip);
        activeTooltip = tooltip;

        const rect = el.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;

        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        const showBelow = spaceAbove < tipRect.height + 12 && spaceBelow >= tipRect.height + 12;

        let top;
        if (showBelow) {
            top = rect.bottom + scrollY + 8;
            tooltip.classList.add('help-tooltip--below');
        } else {
            top = rect.top + scrollY - tipRect.height - 8;
            tooltip.classList.add('help-tooltip--above');
        }

        let left = rect.left + scrollX + rect.width / 2 - tipRect.width / 2;
        const minLeft = scrollX + 8;
        const maxLeft = scrollX + document.documentElement.clientWidth - tipRect.width - 8;
        left = Math.max(minLeft, Math.min(left, maxLeft));

        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';

        // Adjust arrow to point at the trigger element
        const arrowLeft = rect.left + scrollX + rect.width / 2 - left;
        arrow.style.left = arrowLeft + 'px';
        arrow.style.marginLeft = '-5px';
    }

    function bindEvents() {
        document.addEventListener('mouseenter', function (e) {
            const target = e.target.closest('[data-help-tip]');
            if (target) showTooltip(target);
        }, true);

        document.addEventListener('mouseleave', function (e) {
            const target = e.target.closest('[data-help-tip]');
            if (target) removeTooltip();
        }, true);
    }

    return {
        tips: tips,

        render(key) {
            const text = tips[key];
            if (!text) return '';
            return '<span class="help-icon" data-help-tip="' + key + '" aria-label="Help: ' + key.replace(/_/g, ' ') + '">\u24D8</span>';
        },

        renderInline(key) {
            const text = tips[key];
            if (!text) return '';
            return '<span class="help-inline">' + text + '</span>';
        },

        addTip(key, text) {
            tips[key] = text;
        },

        getAllTips() {
            return Object.assign({}, tips);
        },

        init() {
            injectStyles();
            bindEvents();
        }
    };
})();
