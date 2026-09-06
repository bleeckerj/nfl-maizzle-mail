// Email adaptation of nfl-backoffice/src/styles/numbered-register.css.
// Literal labels and table cells work without pseudo-elements or CSS counters.
export function renderNumberedRegister(block, ordered, renderInline) {
  const lines = block.split(/\r?\n/).filter(line => line.trim());
  const start = ordered ? Number(lines[0]?.match(/^\s*(\d+)\./)?.[1] || 1) : 1;
  const prefix = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
  const rows = lines.map((line, index) => {
    const label = String(start + index).padStart(2, '0');
    return `<tr role="listitem"><td class="correspondence-register-number" width="50" valign="top" aria-hidden="true">${label}</td><td class="correspondence-register-copy" valign="top">${renderInline(line.replace(prefix, '').trim())}</td></tr>`;
  }).join('');
  return rows ? `<table role="list" class="correspondence-list" data-correspondence-list="${ordered ? 'ordered' : 'unordered'}" width="100%" cellpadding="0" cellspacing="0" border="0"><tbody>${rows}</tbody></table>` : '';
}
