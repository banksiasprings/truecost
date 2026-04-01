/**
 * import.js — Vehicle import helpers for TrueCost
 */

var VehicleImport = (function () {

  function fromUrlParams() {
    var p = new URLSearchParams(location.search);
    if (!p.get('import')) return null;
    return {
      src:   p.get('src')   || 'url',
      url:   p.get('url')   || '',
      name:  p.get('name')  || '',
      make:  p.get('make')  || '',
      model: p.get('model') || '',
      year:  p.get('year')  ? parseInt(p.get('year'), 10)   : null,
      price: p.get('price') ? parseFloat(p.get('price'))    : null,
      fuel:  _normaliseFuel(p.get('fuel') || ''),
      trans: p.get('trans') || '',
      body:  p.get('body')  || '',
      cond:  p.get('cond')  || 'used',
      odo:   p.get('odo')   ? parseInt(p.get('odo'), 10)    : null,
      fc:    p.get('fc')    ? parseFloat(p.get('fc'))       : null,
    };
  }

  function fromSharedUrl(url) {
    if (!url) return null;
    var m = url.match(/\/cars\/details\/((\d{4})-([a-z0-9]+)-([a-z0-9]+)[^/]*)\//i);
    if (!m) return null;
    return {
      src:   'carsales',
      url:   url,
      year:  parseInt(m[2], 10),
      make:  _titleCase(m[3]),
      model: _titleCase(m[4]),
    };
  }

  function fromPastedText(text) {
    if (!text || text.trim().length < 10) return null;
    var d = { src: 'paste', raw: text };

    var ymm = text.match(/\b(20\d{2}|19\d{2})\s+([A-Z][a-zA-Z\-]+)\s+([A-Z][a-zA-Z\-]+)/);
    if (ymm) { d.year = parseInt(ymm[1], 10); d.make = ymm[2]; d.model = ymm[3]; }

    var price = text.match(/\$\s*([\d,]+)/);
    if (price) d.price = parseFloat(price[1].replace(/,/g, ''));

    var odo = text.match(/[Oo]dometer[\s\S]{0,20}?([\d,]+)\s*km/i) || text.match(/([\d,]+)\s*km\b/);
    if (odo) d.odo = parseInt(odo[1].replace(/,/g, ''), 10);

    var fc = text.match(/([\d.]+)\s*[Ll]\/100\s*km/);
    if (fc) d.fc = parseFloat(fc[1]);

    var fuelMatch = text.match(/\b(petrol|diesel|hybrid|electric|phev|lpg|premium\s+unleaded|unleaded)\b/i);
    if (fuelMatch) d.fuel = _normaliseFuel(fuelMatch[1]);

    if (/\bautomatic\b/i.test(text)) d.trans = 'Automatic';
    else if (/\bmanual\b/i.test(text)) d.trans = 'Manual';

    return (d.make || d.price || d.odo) ? d : null;
  }

  function applyToVehicle(data, vehicle) {
    if (!data || !vehicle) return vehicle;
    if (data.make)  vehicle.make  = data.make;
    if (data.model) vehicle.model = data.model;
    if (data.year)  vehicle.year  = data.year;
    if (data.price) vehicle.purchasePrice = data.price;
    if (data.fuel)  vehicle.fuelType = data.fuel;
    if (data.odo)   vehicle.annualKm = Math.round(data.odo / 5);
    if (data.fc)    vehicle.fuelConsumption = data.fc;
    if (data.name)  vehicle.nickname = data.name;
    return vehicle;
  }

  function renderEntryScreen() {
    return '<div class="import-entry">' +
      '<h3 style="margin-bottom:var(--space-4)">Import a Vehicle Listing</h3>' +
      '<p style="color:var(--color-text-muted);margin-bottom:var(--space-5)">' +
        'Choose how you want to bring in car details from a listing site.' +
      '</p>' +
      '<button class="btn btn-primary btn-full" id="import-paste-btn" style="margin-bottom:var(--space-3)">' +
        '&#128203; Paste Listing Text' +
      '</button>' +
      '<button class="btn btn-secondary btn-full" id="import-bookmarklet-btn" style="margin-bottom:var(--space-3)">' +
        '&#128278; Set Up Quick-Import Bookmark' +
      '</button>' +
      '<button class="btn btn-secondary btn-full" id="import-manual-btn">' +
        '&#9999;&#65039; Enter Details Manually' +
      '</button>' +
    '</div>';
  }

  function renderPasteScreen() {
    return '<div class="import-paste">' +
      '<h3 style="margin-bottom:var(--space-3)">Paste Listing Text</h3>' +
      '<p style="color:var(--color-text-muted);margin-bottom:var(--space-4);font-size:var(--font-size-sm)">' +
        'On Carsales (or any car site), select all the text on the listing page, copy it, ' +
        'then paste it below. TrueCost will extract the details automatically.' +
      '</p>' +
      '<textarea id="import-paste-text" rows="10" placeholder="Paste listing text here\u2026"' +
        ' style="width:100%;font-size:var(--font-size-sm);padding:var(--space-3);' +
        'border:1px solid var(--color-border);border-radius:var(--radius-md);' +
        'resize:vertical;box-sizing:border-box;font-family:inherit">' +
      '</textarea>' +
      '<button class="btn btn-primary btn-full" id="import-paste-parse-btn" style="margin-top:var(--space-4)">' +
        'Extract Details' +
      '</button>' +
      '<button class="btn btn-ghost btn-full" id="import-paste-back-btn" style="margin-top:var(--space-2)">' +
        '\u2190 Back' +
      '</button>' +
    '</div>';
  }

  function renderBookmarkletScreen() {
    var code = _bookmarkletCode();
    var hrefCode = code.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/\"/g, '&quot;');
    return '<style>' +
      '@keyframes bounce-up {' +
        '0%, 100% { transform: translateY(0); }' +
        '50% { transform: translateY(-8px); }' +
      '}' +
      '.import-arrow { animation: bounce-up 1.2s ease-in-out infinite; font-size: 2rem; display:block; text-align:center; margin-top:8px; }' +
    '</style>' +
    '<div class="import-bookmarklet">' +
      '<h3 style="margin-bottom:var(--space-4)">Set Up Quick-Import Bookmark</h3>' +
      '<div style="margin-bottom:var(--space-5)">' +
        '<p style="font-weight:600;margin-bottom:var(--space-2)">' +
          '<span style="background:var(--color-accent);color:#fff;border-radius:50%;width:1.5em;height:1.5em;display:inline-flex;align-items:center;justify-content:center;font-size:0.8em;margin-right:6px;flex-shrink:0">1</span>' +
          'Show your bookmarks bar' +
        '</p>' +
        '<p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin-bottom:var(--space-3)">First, make sure your bookmarks bar is visible:</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
          '<span style="background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:6px 14px;font-family:monospace;font-size:var(--font-size-sm);white-space:nowrap">\u2318 Shift B</span>' +
          '<span style="color:var(--color-text-muted);font-size:var(--font-size-xs)">Mac</span>' +
          '<span style="color:var(--color-text-muted);font-size:var(--font-size-xs)">\u2022</span>' +
          '<span style="background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:6px 14px;font-family:monospace;font-size:var(--font-size-sm);white-space:nowrap">Ctrl Shift B</span>' +
          '<span style="color:var(--color-text-muted);font-size:var(--font-size-xs)">Windows / Linux</span>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:var(--space-5)">' +
        '<p style="font-weight:600;margin-bottom:var(--space-2)">' +
          '<span style="background:var(--color-accent);color:#fff;border-radius:50%;width:1.5em;height:1.5em;display:inline-flex;align-items:center;justify-content:center;font-size:0.8em;margin-right:6px;flex-shrink:0">2</span>' +
          'Drag the button to it' +
        '</p>' +
        '<p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin-bottom:var(--space-3)">Drag this button up to your bookmarks bar:</p>' +
        '<div style="text-align:center;padding:var(--space-4) 0">' +
          '<a id="import-bookmarklet-drag" href="' + hrefCode + '"' +
            ' style="display:inline-block;padding:12px 24px;background:var(--color-accent);' +
            'color:#fff;border-radius:var(--radius-md);text-decoration:none;font-weight:700;' +
            'font-size:1.05rem;cursor:grab;box-shadow:0 2px 8px rgba(0,0,0,0.18)"' +
            ' onclick="event.preventDefault();alert(\'Drag this button to your bookmarks bar \u2014 don\\\'t click it here.\')">' +
            '&#9889; Add to TrueCost' +
          '</a>' +
          '<span class="import-arrow">\u2191</span>' +
          '<p style="color:var(--color-text-muted);font-size:var(--font-size-xs);margin-top:var(--space-2)">Drag it \u2014 don\u2019t click it here</p>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:var(--space-5);background:var(--color-bg-secondary);border-radius:var(--radius-md);padding:var(--space-4)">' +
        '<p style="font-weight:600;margin-bottom:var(--space-2)">' +
          '<span style="background:var(--color-accent);color:#fff;border-radius:50%;width:1.5em;height:1.5em;display:inline-flex;align-items:center;justify-content:center;font-size:0.8em;margin-right:6px;flex-shrink:0">3</span>' +
          'Use it on any car listing' +
        '</p>' +
        '<p style="color:var(--color-text-muted);font-size:var(--font-size-sm)">Done! Now go to any Carsales listing and tap the bookmark. It\'ll open TrueCost with the car\'s details already filled in.</p>' +
        '<p style="font-size:1.5rem;margin-top:var(--space-3);text-align:center">\uD83D\uDE97\u2192\uD83D\uDCF1</p>' +
      '</div>' +
      '<details style="margin-bottom:var(--space-4)">' +
        '<summary style="cursor:pointer;color:var(--color-text-muted);font-size:var(--font-size-sm);list-style:none;user-select:none;padding:var(--space-2) 0">' +
          '&#9658; Can\'t drag? Copy the code manually' +
        '</summary>' +
        '<div style="margin-top:var(--space-3)">' +
          '<textarea id="import-bookmarklet-code" rows="4" readonly' +
            ' style="width:100%;font-size:10px;padding:var(--space-2);' +
            'border:1px solid var(--color-border);border-radius:var(--radius-md);' +
            'resize:none;box-sizing:border-box;font-family:monospace;' +
            'background:var(--color-bg-secondary);word-break:break-all">' +
            code +
          '</textarea>' +
          '<button class="btn btn-secondary btn-full" id="import-bookmarklet-copy-btn" style="margin-top:var(--space-2)">' +
            'Copy Code' +
          '</button>' +
        '</div>' +
      '</details>' +
      '<button class="btn btn-ghost btn-full" id="import-bookmarklet-back-btn">' +
        '\u2190 Back' +
      '</button>' +
    '</div>';
  }
    function _bookmarkletCode() {
    return 'javascript:(function(){var d=null;[].forEach.call(document.querySelectorAll(\'script[type="application/ld+json"]\'),function(s){try{var p=JSON.parse(s.textContent);if(p[\'@type\']&&[].concat(p[\'@type\']).indexOf(\'Vehicle\')>-1)d=p;}catch(e){}});if(!d){alert(\'Please open a Carsales car listing first, then tap Add to TrueCost.\');return;}var t=document.body.innerText;var km=t.match(/Odometer[\\s\\S]{0,15}?([\\d,]+)\\s*km/i);var fc=t.match(/([\\d.]+)\\s*L\\/100km/i);var q=[];function a(k,v){if(v)q.push(encodeURIComponent(k)+\'=\'+encodeURIComponent(v));}a(\'import\',1);a(\'src\',\'carsales\');a(\'url\',location.href);a(\'name\',d.name);a(\'make\',d.brand&&d.brand.name);a(\'model\',d.model);a(\'year\',d.vehicleModelDate);a(\'price\',d.offers&&d.offers.price);a(\'fuel\',(d.fuelType||"").toLowerCase());a(\'trans\',d.vehicleTransmission);a(\'body\',d.bodyType);a(\'cond\',d.itemCondition&&d.itemCondition.indexOf(\'Used\')>-1?\'used\':\'new\');a(\'odo\',km?km[1].replace(/,/g,""):"");a(\'fc\',fc?fc[1]:"");window.open(\'https://banksiasprings.github.io/truecost/?\'+q.join(\'&\'),\'_blank\');})();';
  }

  function _normaliseFuel(s) {
    s = (s || '').toLowerCase().trim();
    if (!s) return '';
    if (s.indexOf('diesel')   > -1) return 'diesel';
    if (s.indexOf('electric') > -1) return 'electric';
    if (s.indexOf('phev')     > -1 || s.indexOf('plug') > -1) return 'phev';
    if (s.indexOf('hybrid')   > -1) return 'hybrid';
    if (s.indexOf('lpg')      > -1) return 'lpg';
    return 'petrol';
  }

  function _titleCase(s) {
    return (s || '').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  return {
    fromUrlParams:           fromUrlParams,
    fromSharedUrl:           fromSharedUrl,
    fromPastedText:          fromPastedText,
    applyToVehicle:          applyToVehicle,
    renderEntryScreen:       renderEntryScreen,
    renderPasteScreen:       renderPasteScreen,
    renderBookmarkletScreen: renderBookmarkletScreen,
  };

})();
