import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory & Edge-Persistent Database Store
let disasterDB = {
  metrics: {
    totalRelieved: 45820,
    resourcesTons: 112,
    survivorsRescued: 2150,
    openNeeds: 89,
    gapsIdentified: 14,
  },
  gaps: [
    { category: 'Water', count: 9200, needed: 10000 },
    { category: 'Food', count: 7400, needed: 8000 },
    { category: 'Medical', count: 5600, needed: 6000 },
    { category: 'Shelter', count: 3800, needed: 4500 },
  ],
  resources: [
    { name: 'Water', tons: 42, percent: 37.5, color: '#0284c7' },
    { name: 'Food', tons: 38, percent: 33.9, color: '#ea580c' },
    { name: 'Medical', tons: 18, percent: 16.1, color: '#dc2626' },
    { name: 'Shelter', tons: 14, percent: 12.5, color: '#4f46e5' },
  ],
  fieldUpdates: [
    {
      id: 'rpt-101',
      org: 'World Aid Org [NGO]',
      type: 'rescue',
      title: 'NGO: Rescued 8 survivors',
      sector: 'Sector B-4 (Connaught Place)',
      timeAgo: '14m ago',
      timestamp: Date.now() - 14 * 60 * 1000,
      icon: '👥',
      lat: 28.6289,
      lng: 77.2065,
      qty: 8,
    },
    {
      id: 'rpt-102',
      org: 'World Aid Org [NGO]',
      type: 'food',
      title: 'NGO: 25 Kits Food',
      sector: 'Area A (Karol Bagh)',
      timeAgo: '21m ago',
      timestamp: Date.now() - 21 * 60 * 1000,
      icon: '📦',
      lat: 28.6510,
      lng: 77.1905,
      qty: 25,
    },
    {
      id: 'rpt-103',
      org: 'Gov Disaster Mgmt',
      type: 'underserved',
      title: 'Gov: Underserved Area',
      sector: 'D-12 (Old Delhi)',
      timeAgo: '34m ago',
      timestamp: Date.now() - 34 * 60 * 1000,
      icon: '⚠️',
      lat: 28.6560,
      lng: 77.2310,
      qty: 1,
    },
    {
      id: 'rpt-104',
      org: 'Red Cross',
      type: 'water',
      title: 'Red Cross: 250 Gal Clean Water',
      sector: 'Yamuna Riverfront North',
      timeAgo: '58m ago',
      timestamp: Date.now() - 58 * 60 * 1000,
      icon: '💧',
      lat: 28.6650,
      lng: 77.2450,
      qty: 250,
    },
    {
      id: 'rpt-105',
      org: 'UN Relief',
      type: 'medical',
      title: 'UN Relief: Field Triage Station Activated',
      sector: 'AIIMS Central Sector',
      timeAgo: '1h 22m ago',
      timestamp: Date.now() - 82 * 60 * 1000,
      icon: '🏥',
      lat: 28.5672,
      lng: 77.2100,
      qty: 40,
    },
  ],
  leaderboard: [
    { rank: 1, name: 'World Aid Org [NGO]', score: '8,450 pts', details: '(1,120 rescued)' },
    { rank: 2, name: 'Red Cross', score: '7,210 pts', details: '(980 rescued)' },
    { rank: 3, name: 'UN Relief', score: '5,900 pts', details: '(640 rescued)' },
    { rank: 4, name: 'LocalVol', score: '4,110 pts', details: '(410 rescued)' },
  ],
  connectivity: {
    ngoDevices: 42,
    loraMeshDevices: 3,
    govHubs: 18,
    edgeNodesActive: 9,
    edgeNodesTotal: 9,
    statusText: 'Syncing with Central Server',
    lastSync: new Date().toISOString(),
  },
  mapPoints: [
    { lat: 28.6289, lng: 77.2065, type: 'rescue', label: 'Sector B-4: 8 Survivors Rescued', intensity: 0.9 },
    { lat: 28.6510, lng: 77.1905, type: 'resource', label: 'Area A: 25 Food Kits Distributed', intensity: 0.75 },
    { lat: 28.6560, lng: 77.2310, type: 'underserved', label: 'D-12: Underserved Alert (Urgent Food/Water)', intensity: 1.0 },
    { lat: 28.6650, lng: 77.2450, type: 'relief', label: 'Riverfront North: Relief Supply Depot', intensity: 0.8 },
    { lat: 28.5672, lng: 77.2100, type: 'relief', label: 'AIIMS Hub: Medical Triage & Clean Water', intensity: 0.85 },
    { lat: 28.6350, lng: 77.2200, type: 'affected', label: 'Central Corridor: Flooded Access Route', intensity: 0.65 },
    { lat: 28.6180, lng: 77.1980, type: 'resource', label: 'Station Cache: Emergency Medical Kits', intensity: 0.75 },
    { lat: 28.6400, lng: 77.2500, type: 'underserved', label: 'East District: Power & Water Deficit', intensity: 0.95 },
    { lat: 28.6150, lng: 77.2080, type: 'rescue', label: 'Sector B-1: 14 Evacuees Transported', intensity: 0.9 },
  ],
};

// Initial copy for resets
const INITIAL_DEFAULT_DATA = JSON.parse(JSON.stringify(disasterDB));

// Helper: Seed points around a custom user location (e.g. in India or user GPS)
function generatePointsAroundCoords(lat: number, lng: number, locationName = 'Local Zone') {
  return [
    { lat: lat + 0.005, lng: lng - 0.004, type: 'rescue', label: `${locationName} Sector B-4: 8 Survivors Rescued`, intensity: 0.9 },
    { lat: lat - 0.006, lng: lng + 0.005, type: 'resource', label: `${locationName} Area A: 25 Food Kits Distributed`, intensity: 0.75 },
    { lat: lat + 0.008, lng: lng + 0.007, type: 'underserved', label: `${locationName} D-12: Underserved Alert (Urgent Need)`, intensity: 1.0 },
    { lat: lat + 0.012, lng: lng - 0.009, type: 'relief', label: `${locationName} Hub North: Relief Supply Depot`, intensity: 0.8 },
    { lat: lat - 0.009, lng: lng - 0.006, type: 'affected', label: `${locationName}: Flooded Roadway Access`, intensity: 0.65 },
    { lat: lat - 0.004, lng: lng - 0.002, type: 'resource', label: `${locationName} Cache: Emergency Medical Kits`, intensity: 0.75 },
    { lat: lat + 0.003, lng: lng + 0.004, type: 'relief', label: `${locationName} Sector C-2: NGO Aid Distribution Site`, intensity: 0.85 },
    { lat: lat - 0.015, lng: lng + 0.011, type: 'underserved', label: `${locationName} South: Power & Medical Deficit`, intensity: 0.95 },
    { lat: lat + 0.006, lng: lng - 0.007, type: 'rescue', label: `${locationName} Sector B-1: 14 Evacuees Transported`, intensity: 0.9 },
    { lat: lat - 0.002, lng: lng + 0.013, type: 'relief', label: `${locationName} East Hub: Clean Water Purification`, intensity: 0.8 },
  ];
}

// ==========================================
// REST API Routes
// ==========================================

// Health / Status check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'Edge-Server-Active',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// GET full disaster dataset
app.get('/api/data', (req, res) => {
  res.json(disasterDB);
});

// POST new relief activity report
app.post('/api/reports', (req, res) => {
  try {
    const { type, org, sector, title, qty, lat, lng } = req.body;
    const parsedQty = parseInt(qty) || 1;
    const parsedLat = parseFloat(lat) || 40.7300;
    const parsedLng = parseFloat(lng) || -73.9900;

    let icon = '📦';
    if (type === 'rescue') icon = '👥';
    if (type === 'underserved') icon = '⚠️';
    if (type === 'water') icon = '💧';
    if (type === 'medical') icon = '🏥';

    const newReport = {
      id: 'rpt-' + (Date.now() % 100000),
      org: org || 'World Aid Org [NGO]',
      type: type || 'rescue',
      title: `${(org || 'NGO').split(' ')[0]}: ${title || 'Field Activity Dispatched'}`,
      sector: sector || 'Sector Center',
      timeAgo: 'Just now',
      timestamp: Date.now(),
      icon,
      lat: parsedLat,
      lng: parsedLng,
      qty: parsedQty,
    };

    // Update Field Updates
    disasterDB.fieldUpdates.unshift(newReport);
    if (disasterDB.fieldUpdates.length > 25) {
      disasterDB.fieldUpdates.pop();
    }

    // Update KPI Metrics
    if (type === 'rescue') {
      disasterDB.metrics.survivorsRescued += parsedQty;
      disasterDB.metrics.totalRelieved += parsedQty * 3;
      const orgItem = disasterDB.leaderboard.find(o => o.name.includes((org || '').split(' ')[0]));
      if (orgItem) {
        const curPts = parseInt(orgItem.score.replace(/[^0-9]/g, '')) || 8000;
        orgItem.score = (curPts + parsedQty * 15).toLocaleString() + ' pts';
      }
    } else if (type === 'underserved') {
      disasterDB.metrics.openNeeds += 1;
      disasterDB.metrics.gapsIdentified += 1;
    } else {
      disasterDB.metrics.totalRelieved += parsedQty * 4;
      disasterDB.metrics.resourcesTons = parseFloat((disasterDB.metrics.resourcesTons + parsedQty * 0.05).toFixed(1));
    }

    // Add map point
    disasterDB.mapPoints.push({
      lat: parsedLat,
      lng: parsedLng,
      type: type === 'underserved' ? 'underserved' : (type === 'rescue' ? 'rescue' : 'resource'),
      label: `${newReport.sector}: ${newReport.title}`,
      intensity: 0.9,
    });

    disasterDB.connectivity.lastSync = new Date().toISOString();

    res.status(201).json({
      success: true,
      report: newReport,
      data: disasterDB,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit report' });
  }
});

// PUT update existing field report (CRUD - Update)
app.put('/api/reports/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, sector, qty, status, type } = req.body;
    const report = disasterDB.fieldUpdates.find(r => r.id === id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (title !== undefined) report.title = title;
    if (sector !== undefined) report.sector = sector;
    if (qty !== undefined) report.qty = parseInt(qty) || report.qty;
    if (type !== undefined) report.type = type;
    if (status !== undefined) (report as any).status = status;
    report.timeAgo = 'Updated just now';

    disasterDB.connectivity.lastSync = new Date().toISOString();

    res.json({
      success: true,
      report,
      data: disasterDB,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to update report' });
  }
});

// DELETE field report (CRUD - Delete)
app.delete('/api/reports/:id', (req, res) => {
  try {
    const { id } = req.params;
    const idx = disasterDB.fieldUpdates.findIndex(r => r.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const removed = disasterDB.fieldUpdates.splice(idx, 1)[0];
    // Also remove matching map point if exists
    disasterDB.mapPoints = disasterDB.mapPoints.filter(p => !p.label.includes(removed.title));
    disasterDB.connectivity.lastSync = new Date().toISOString();

    res.json({
      success: true,
      removedId: id,
      data: disasterDB,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to delete report' });
  }
});

// GET user network geolocation without browser CORS restrictions
app.get('/api/my-location', async (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = (Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0]).trim();

    let geo: any = null;
    if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('10.') && !ip.startsWith('192.168.')) {
      try {
        const fetchRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`);
        if (fetchRes.ok) {
          const data = (await fetchRes.json()) as any;
          if (data && data.status === 'success' && data.lat && data.lon) {
            geo = {
              lat: data.lat,
              lng: data.lon,
              city: data.city || 'Your Area',
              region: data.regionName || '',
              country: data.country || 'India',
              name: `${data.city || 'Active Zone'}, ${data.country || 'India'}`,
            };
          }
        }
      } catch (e) {
        console.warn('Server IP geo lookup error:', e);
      }
    }

    if (!geo) {
      geo = {
        lat: 28.6139,
        lng: 77.2090,
        city: 'New Delhi',
        region: 'NCR',
        country: 'India',
        name: 'India - New Delhi (NCR)',
      };
    }

    res.json({ success: true, ...geo });
  } catch (err: any) {
    res.json({
      success: true,
      lat: 28.6139,
      lng: 77.2090,
      city: 'New Delhi',
      region: 'NCR',
      country: 'India',
      name: 'India - New Delhi (NCR)',
    });
  }
});

// Relocate Disaster Zone (e.g. When user provides coordinates or India GPS)
app.post('/api/relocate', (req, res) => {
  try {
    const { lat, lng, locationName } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude required' });
    }

    const newPoints = generatePointsAroundCoords(lat, lng, locationName || 'Local Region');
    disasterDB.mapPoints = newPoints;

    // Update field update coordinates to match location
    disasterDB.fieldUpdates = disasterDB.fieldUpdates.map((item, idx) => {
      const offsetLat = (idx % 2 === 0 ? 0.004 : -0.004) * (idx + 1);
      const offsetLng = (idx % 2 === 0 ? -0.003 : 0.005) * (idx + 1);
      return {
        ...item,
        lat: lat + offsetLat,
        lng: lng + offsetLng,
        sector: `${locationName || 'Local'} Sector ${String.fromCharCode(65 + idx)}-${idx + 1}`,
      };
    });

    res.json({
      success: true,
      center: { lat, lng },
      data: disasterDB,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Relocation failed' });
  }
});

// POST reset to defaults
app.post('/api/reset', (req, res) => {
  disasterDB = JSON.parse(JSON.stringify(INITIAL_DEFAULT_DATA));
  res.json({ success: true, message: 'Database reset to initial disaster operations data', data: disasterDB });
});

// ==========================================
// Vite & Static Asset Handling
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BridgeIt Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
