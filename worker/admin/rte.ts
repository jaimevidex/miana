// Toolbar extra do RTE: tamanho e cor.

export const RTE_FORMAT_CSS = `
.rte-swatch{width:22px;min-width:22px;height:22px;padding:0;border-radius:50%;border:1px solid #e5ded7}
.rte-swatch:hover{border-color:#8a2831}
`;

export function rteFormatButtons(): string {
  return `
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn" data-font-size="13px" title="Texto pequeno">A-</button>
          <button type="button" class="rte-btn" data-font-size="16px" title="Texto normal">A</button>
          <button type="button" class="rte-btn" data-font-size="20px" title="Texto grande">A+</button>
          <span class="rte-sep"></span>
          <button type="button" class="rte-btn rte-swatch" data-color="#8a2831" title="Bordô" style="background:#8a2831"></button>
          <button type="button" class="rte-btn rte-swatch" data-color="#3b2a2a" title="Texto" style="background:#3b2a2a"></button>
          <button type="button" class="rte-btn rte-swatch" data-color="#8a7a74" title="Cinza" style="background:#8a7a74"></button>`;
}

export function rteFormatBindJs(): string {
  return `
      function mianaApplyFontSize(editor, size) {
        editor.focus();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontSize', false, '7');
        editor.querySelectorAll('font[size="7"]').forEach(function(el){
          var span = document.createElement('span');
          span.style.fontSize = size;
          while (el.firstChild) span.appendChild(el.firstChild);
          el.parentNode.replaceChild(span, el);
        });
        editor.querySelectorAll('span[style*="xxx-large"], span[style*="xx-large"]').forEach(function(el){
          el.style.fontSize = size;
        });
      }
      function mianaApplyColor(editor, color) {
        editor.focus();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, color);
      }
      function mianaBindRteFormat(box, editor) {
        box.querySelectorAll('[data-font-size]').forEach(function(btn){
          btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
          btn.addEventListener('click', function(){
            mianaApplyFontSize(editor, btn.getAttribute('data-font-size'));
          });
        });
        box.querySelectorAll('[data-color]').forEach(function(btn){
          btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
          btn.addEventListener('click', function(){
            mianaApplyColor(editor, btn.getAttribute('data-color'));
          });
        });
      }
  `;
}
