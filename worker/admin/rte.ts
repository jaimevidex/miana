// Toolbar extra do RTE: tamanho e cor.

export const RTE_FORMAT_CSS = `
.rte-swatch{width:22px;min-width:22px;height:22px;padding:0;border-radius:50%;border:1px solid #e5ded7}
.rte-swatch:hover{border-color:#8a2831}
.rte-btn.rte-size{min-width:34px;font-weight:700;line-height:1;font-family:Arial,Helvetica,sans-serif}
`;

export function rteFormatButtons(): string {
  return `
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn rte-size" data-font-size="13px" title="Texto pequeno" style="font-size:13px">A</button>
          <button type="button" class="rte-btn rte-size" data-font-size="16px" title="Texto normal" style="font-size:16px">A</button>
          <button type="button" class="rte-btn rte-size" data-font-size="20px" title="Texto grande" style="font-size:20px">A</button>
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn rte-swatch" data-color="#8a2831" title="Bordô" style="background:#8a2831"></button>
          <button type="button" class="rte-btn rte-swatch" data-color="#3b2a2a" title="Texto" style="background:#3b2a2a"></button>
          <button type="button" class="rte-btn rte-swatch" data-color="#8a7a74" title="Cinza" style="background:#8a7a74"></button>`;
}

export function rteFormatBindJs(): string {
  return `
      function mianaHexFromRgb(color) {
        if (!color) return '';
        var m = String(color).match(/^rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/i);
        if (!m) return String(color).trim().toLowerCase();
        return '#' + [m[1], m[2], m[3]].map(function(n) {
          return ('0' + Number(n).toString(16)).slice(-2);
        }).join('');
      }
      function mianaApplyEditorFont(el) {
        el.style.fontFamily = 'Arial, Helvetica, sans-serif';
      }
      function mianaConvertFontTags(editor) {
        editor.querySelectorAll('font').forEach(function(el) {
          var span = document.createElement('span');
          span.style.cssText = el.style.cssText;
          if (el.getAttribute('color')) span.style.color = el.getAttribute('color');
          mianaApplyEditorFont(span);
          while (el.firstChild) span.appendChild(el.firstChild);
          el.parentNode.replaceChild(span, el);
        });
      }
      function mianaApplyFontSize(editor, size) {
        editor.focus();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontSize', false, '7');
        editor.querySelectorAll('font[size="7"]').forEach(function(el) {
          var span = document.createElement('span');
          span.style.fontSize = size;
          mianaApplyEditorFont(span);
          while (el.firstChild) span.appendChild(el.firstChild);
          el.parentNode.replaceChild(span, el);
        });
        editor.querySelectorAll('span[style*="xxx-large"], span[style*="xx-large"]').forEach(function(el) {
          el.style.fontSize = size;
          mianaApplyEditorFont(el);
        });
      }
      function mianaApplyColor(editor, color) {
        editor.focus();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, color);
        mianaConvertFontTags(editor);
        editor.querySelectorAll('[style]').forEach(function(el) {
          if (!el.style.color) return;
          var hex = mianaHexFromRgb(el.style.color);
          if (hex === color.toLowerCase()) {
            el.style.color = color;
            mianaApplyEditorFont(el);
          }
        });
      }
      function mianaBindRteFormat(box, editor) {
        try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
        box.querySelectorAll('[data-font-size]').forEach(function(btn) {
          btn.addEventListener('mousedown', function(ev) { ev.preventDefault(); });
          btn.addEventListener('click', function() {
            mianaApplyFontSize(editor, btn.getAttribute('data-font-size'));
          });
        });
        box.querySelectorAll('[data-color]').forEach(function(btn) {
          btn.addEventListener('mousedown', function(ev) { ev.preventDefault(); });
          btn.addEventListener('click', function() {
            mianaApplyColor(editor, btn.getAttribute('data-color'));
          });
        });
      }
  `;
}
