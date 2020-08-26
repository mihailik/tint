import { findColor } from '../api/site/colors';

let pageColors = detectCurrentPageColors();

if (!pageColors || !pageColors.length) {
  pageColors = [{ name: 'Black', color: '#000000', strength: 100 }];
}

const selectedPageColor32 = parseInt(pageColors[0].color.slice(1), 16);
const selectedPageColorContrast =
  (
    ((selectedPageColor32 & 0xFF0000) >> 16) +
    ((selectedPageColor32 & 0x00FF00) >> 8) +
    (selectedPageColor32 & 0x0000FF)
  ) / 3 < 128 ? 0xFFFFFF : 0x000000;

document.body.style.background = colorCss(selectedPageColor32);
document.body.style.color = colorCss(selectedPageColorContrast);

document.body.style.display = 'grid';
document.body.style.gridTemplateRows = '1fr';
document.body.style.gridTemplateColumns = '1fr';
document.body.style.alignItems = 'top';
document.body.style.justifyItems = 'center';

const wrapperDiv = document.createElement('div');
wrapperDiv.style.gridColumn = '1';
wrapperDiv.style.gridRow = '1';
wrapperDiv.style.border = 'solid 3px ' + colorCss(selectedPageColorContrast);
wrapperDiv.style.padding = '1em';

const colorText = document.createElement('h1');
colorText.textContent = pageColors.sourceText || pageColors[0].name;
wrapperDiv.appendChild(colorText);
for (let i = 1; i < pageColors.length; i++) {
  const clr = pageColors[i];
  const altColorContainer = document.createElement('div');
  const altColorLink = document.createElement('a');
  altColorLink.textContent = clr.name;
  altColorLink.style.borderLeft = 'solid 1em ' + clr.color;
  altColorLink.style.paddingLeft = '0.5em';
  altColorLink.style.color = 'inherit';
  altColorLink.href = './' + clr.name;
  altColorContainer.appendChild(altColorLink);
  wrapperDiv.appendChild(altColorContainer);
}

document.body.appendChild(wrapperDiv);

function detectCurrentPageColors() {
  const trySources = [
    window.location.hash && window.location.hash.replace(/^#/, ''),
    window.location.search && window.location.search.replace(/^\?/, ''),
    window.location.pathname.split('/').slice(-1)[0]
  ];

  for (const t of trySources) {
    if (!t) continue;

    const colors = findColor(t) as (import('../api/site/colors').ColorMatch[] & { sourceText?: string });
    if (colors.length) {
      colors.sourceText = decodeURIComponent(t);
      return colors;
    }
  }
}

function colorCss(color32: number) {
  return '#' + (0x1000000 + color32).toString(16).slice(1);
}