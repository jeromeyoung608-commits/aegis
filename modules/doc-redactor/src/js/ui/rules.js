// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * Right rail, "Rules" tab: grouped toggles with live hit counts.
 */

import { escapeHtml } from '../core/utils.js';
import { GROUP_LABELS } from '../detect/rules.de.js';

export function renderRules(container, rules, ruleState, counts) {
  if (!container) return;

  let html = '';
  let group = null;

  for (const rule of rules) {
    if (rule.group !== group) {
      group = rule.group;
      html += `<div class="rule-group-label">${escapeHtml(GROUP_LABELS[group] || group)}</div>`;
    }

    const on = ruleState[rule.id] !== false;
    const count = counts[rule.id] || 0;

    html += `
      <div class="rule-row ${on ? 'is-on' : 'is-off'}" data-rule="${rule.id}" role="switch"
           aria-checked="${on}" tabindex="0">
        <span class="rule-check"></span>
        <span class="rule-text">
          <span class="rule-name">${escapeHtml(rule.label)}</span>
          <span class="rule-ex">${escapeHtml(rule.example)}</span>
        </span>
        <span class="rule-count ${count ? '' : 'is-zero'}">${count}</span>
        <span class="rule-sev sev-${rule.severity}"></span>
      </div>`;
  }

  container.innerHTML = html;
}
