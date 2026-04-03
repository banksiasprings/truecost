/**
 * import.js — Vehicle import helpers for TrueCost
 */
var VehicleImport = (function () {

  function fromUrlParams() {
    var p = new URLSearchParams(location.search);
    if (!p.get('import')) return null;
    return {
      src:       p.get('src')       || 'url',
      url:       p.get('url')       || '',
      name:      p.get('name')      || '',
      make:      p.get('make')      || '',
      model:     p.get('model')     || '',
      year:      p.get('year')      ? parseInt(p.get('year'), 10)    : null,
      price:     p.get('price')     ? parseFloat(p.get('price'))     : null,
      fuel:      _normaliseFuel(p.get('fuel') || ''),
      trans:     p.get('trans')     || '',
      body:      p.get('body')      || '',
      cond:      p.get('cond')      || 'used',
      odo:       p.get('odo')       ? parseInt(p.get('odo'), 10)     : null,
      fc:        p.get('fc')        ? parseFloat(p.get('fc'))        : null,
      drive:     p.get('drive')     || '',
      doors:     p.get('doors')     ? parseInt(p.get('doors'), 10)   : null,
      seats:     p.get('seats')     ? parseInt(p.get('seats'), 10)   : null,
      colour:    p.get('colour')    || '',
      engine:    p.get('engine')    || '',
      cylinders: p.get('cylinders') || '',
      battery:   p.get('battery')   ? parseFloat(p.get('battery'))  : null,
      range:     p.get('range')     ? parseInt(p.get('range'), 10)   : null,
      ancap:     p.get('ancap')     ? parseInt(p.get('ancap'), 10)   : null,
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


  function fromProxyUrl(url, onSuccess, onError) {
    var PROXY = "https://truecost-proxy.smcnichol.workers.dev";
    fetch(PROXY + "?url=" + encodeURIComponent(url))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.error) { onError(d.error); return; }
        if (d.year)    d.year    = parseInt(d.year, 10)    || null;
        if (d.price)   d.price   = parseFloat(d.price)     || null;
        if (d.odo)     d.odo     = parseInt(d.odo, 10)     || null;
        if (d.fc)      d.fc      = parseFloat(d.fc)        || null;
        if (d.battery) d.battery = parseFloat(d.battery)  || null;
        if (d.range)   d.range   = parseInt(d.range, 10)  || null;
        if (d.ancap)   d.ancap   = parseInt(d.ancap, 10)  || null;
        if (d.doors)   d.doors   = parseInt(d.doors, 10)  || null;
        if (d.seats)   d.seats   = parseInt(d.seats, 10)  || null;
        if (d.fuel)    d.fuel    = _normaliseFuel(d.fuel);
        if (d.drive)   d.drive   = _normaliseDrive(d.drive);
        onSuccess(d);
      })
      .catch(function() { onError('Could not reach import service. Check your connection.'); });
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

    var driveMatch = text.match(/\b(FWD|RWD|AWD|4WD|4x4|all[\s-]wheel drive|front[\s-]wheel drive|rear[\s-]wheel drive)\b/i);
    if (driveMatch) d.drive = _normaliseDrive(driveMatch[1]);

    var doorsMatch = text.match(/\b(\d)\s*[Dd]oor/);
    if (doorsMatch) d.doors = parseInt(doorsMatch[1], 10);

    var seatsMatch = text.match(/\b(\d)\s*[Ss]eat/);
    if (seatsMatch) d.seats = parseInt(seatsMatch[1], 10);

    var colourMatch = text.match(/[Cc]olou?r[\s:]+([A-Za-z][A-Za-z\s]{1,25}?)(?:\n|,|\.|$)/);
    if (colourMatch) d.colour = colourMatch[1].trim();

    var engineMatch = text.match(/\b(\d+\.\d+)\s*[Ll]\b/);
    if (engineMatch) d.engine = engineMatch[1] + 'L';

    var cylMatch = text.match(/\b([Vv]8|[Vv]6|[Vv]12|[Ii]4|[Ii]6|\d+[\s-][Cc]ylinder[s]?)\b/);
    if (cylMatch) d.cylinders = cylMatch[1];

    var battMatch = text.match(/[Bb]attery[\s\S]{0,30}?([\d.]+)\s*[Kk][Ww][Hh]/);
    if (battMatch) d.battery = parseFloat(battMatch[1]);

    var rangeMatch = text.match(/(?:[Rr]ange|WLTP(?:\s+[Rr]ange)?)[\s\S]{0,30}?(\d{2,4})\s*km/);
    if (rangeMatch) d.range = parseInt(rangeMatch[1], 10);

    var ancapMatch = text.match(/ANCAP[\s\S]{0,30}?(\d)[\s-]*(?:star|\/5)/i);
    if (!ancapMatch) ancapMatch = text.match(/(\d)[\s-]*[Ss]tar\s+ANCAP/i);
    if (ancapMatch) d.ancap = parseInt(ancapMatch[1], 10);

    return (d.make || d.price || d.odo) ? d : null;
  }

  function applyToVehicle(data, vehicle) {
    if (!data || !vehicle) return vehicle;
    if (data.make)      vehicle.make             = data.make;
    if (data.model)     vehicle.model            = data.model;
    if (data.year)      vehicle.year             = data.year;
    if (data.price)     vehicle.purchasePrice    = data.price;
    if (data.fuel)      vehicle.fuelType         = data.fuel;
    if (data.odo)       vehicle.purchaseOdometer = data.odo;
    if (data.fc)        vehicle.fuelConsumption  = data.fc;
    if (data.name)      vehicle.nickname         = data.name;
    if (data.drive)     vehicle.driveType        = data.drive;
    if (data.doors)     vehicle.doors            = data.doors;
    if (data.seats)     vehicle.seats            = data.seats;
    if (data.colour)    vehicle.colour           = data.colour;
    if (data.engine)    vehicle.engineSize       = data.engine;
    if (data.cylinders) vehicle.cylinders        = data.cylinders;
    if (data.battery)   vehicle.evBatteryKwh     = data.battery;
    if (data.range)     vehicle.evRangeKm        = data.range;
    if (data.ancap)     vehicle.ancap            = data.ancap;
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
      '<button class="btn btn-secondary btn-full" id="import-url-btn" style="margin-bottom:var(--space-3)">' +
        '&#128279; Paste a Carsales URL' +
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


  function renderUrlScreen() {
    return [
      '<div class="import-url">',
      '  <h3 style="margin-bottom:var(--space-3)">Import from URL</h3>',
      '  <p style="color:var(--color-text-muted);margin-bottom:var(--space-4);font-size:var(--font-size-sm)">',
      '    Copy the link from any Carsales listing and paste it below. Works on every device.',
      '  </p>',
      '  <input type="url" id="import-url-input" placeholder="https://www.carsales.com.au/cars/details/…"',
      '    style="width:100%;padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:var(--font-size-sm);box-sizing:border-box;font-family:inherit;margin-bottom:var(--space-4)">',
      '  <button class="btn btn-primary btn-full" id="import-url-fetch-btn">',
      '    Import Car Details',
      '  </button>',
      '  <button class="btn btn-ghost btn-full" id="import-url-back-btn" style="margin-top:var(--space-2)">',
      '    ← Back',
      '  </button>',
      '</div>',
    ].join('\n');
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

  function _normaliseDrive(s) {
    s = (s || '').toLowerCase().trim();
    if (s === 'fwd' || s.indexOf('front') > -1) return 'FWD';
    if (s === 'rwd' || s.indexOf('rear') > -1)  return 'RWD';
    if (s === 'awd' || s.indexOf('all') > -1)   return 'AWD';
    if (s.indexOf('4') > -1)                    return '4WD';
    return s.toUpperCase();
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
    fromProxyUrl:            fromProxyUrl,
    renderUrlScreen:         renderUrlScreen,
    renderPasteScreen:       renderPasteScreen,
  };
})();
