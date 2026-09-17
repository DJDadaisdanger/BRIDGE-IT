/**
 * BridgeIt - Disaster Relief Coordination Platform
 * Full-Stack Client Engine with Geolocation (India & Global GPS + IP Fallback),
 * Interactive Leaflet Mapping (Zero API Keys Required - Standard OpenStreetMap),
 * Full CRUD Operations for Field Reports, Sample Data Generator around User Location,
 * and Auto-Refresh Synchronization across all widgets.
 */

// Global application namespace
const BridgeIt = {
  dbKey: 'bridgeit_disaster_data_v1',
  map: null,
  heatLayer: null,
  markersLayer: null,
  operatorMarker: null,
  userCoords: null, // { lat, lng }
  currentCenter: [28.6139, 77.2090], // Default centered on India (New Delhi Hub)
  currentRegionName: 'India Command Hub (NCR)',
  activeFilter: 'all',
  autoRefreshTimer: null,
  autoRefreshEnabled: true,
  isMeshMode: false,
  apiOnline: true,
};

// Initial Seed Dataset (Defaults to India Disaster Coordination Hub)
const DEFAULT_SEED_DATA = {
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
      title: 'NGO: Rescued 8 survivors from perimeter',
      sector: 'Sector B-4 (Central)',
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
      title: 'NGO: 25 Kits Emergency Food Rations',
      sector: 'Area A (West Sector)',
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
      title: 'Gov: Critical Underserved Alert (Water Needed)',
      sector: 'D-12 (Old Ward)',
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
      title: 'Red Cross: 250 Gal Potable Water Dispensed',
      sector: 'Riverfront North Depot',
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
      title: 'UN Relief: Field Triage Station Operational',
      sector: 'AIIMS Central Hub',
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
    lastSync: new Date().toLocaleTimeString(),
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

/* --------------------------------------------------------------------------
   Database & LocalStorage CRUD Controller
   -------------------------------------------------------------------------- */
const DB = {
  init() {
    // 1. Initialize localStorage with mock data if not already present
    try {
      const stored = localStorage.getItem(BridgeIt.dbKey);
      if (!stored) {
        localStorage.setItem(BridgeIt.dbKey, JSON.stringify(DEFAULT_SEED_DATA));
      } else {
        // Validate coordinates in cached storage; if it was old NYC data, upgrade to India default
        const parsed = JSON.parse(stored);
        if (parsed.mapPoints && parsed.mapPoints[0] && parsed.mapPoints[0].lat > 40 && parsed.mapPoints[0].lat < 41) {
          localStorage.setItem(BridgeIt.dbKey, JSON.stringify(DEFAULT_SEED_DATA));
        }
      }
    } catch (e) {
      console.warn('localStorage access failed, fallback to memory', e);
    }

    // 2. Fetch fresh state from Express Backend API
    this.syncWithServer();

    // 3. Cross-tab synchronization listener
    window.addEventListener('storage', (e) => {
      if (e.key === BridgeIt.dbKey) {
        UI.refreshAll();
      }
    });
  },

  async syncWithServer() {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const serverData = await res.json();
        BridgeIt.apiOnline = true;
        this.saveLocally(serverData);
        UI.refreshAll();
        return serverData;
      }
    } catch (e) {
      BridgeIt.apiOnline = false;
      console.log('Using edge localStorage database (offline or server unreachable)');
    }
    return this.getLocally();
  },

  get() {
    return this.getLocally();
  },

  getLocally() {
    try {
      const data = localStorage.getItem(BridgeIt.dbKey);
      return data ? JSON.parse(data) : DEFAULT_SEED_DATA;
    } catch (e) {
      return DEFAULT_SEED_DATA;
    }
  },

  saveLocally(data) {
    try {
      localStorage.setItem(BridgeIt.dbKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  },

  // ==========================================
  // CRUD: CREATE (Add New Report)
  // ==========================================
  async addReport(reportData) {
    let newEntry = null;

    // Try posting to Express backend
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      if (res.ok) {
        const json = await res.json();
        newEntry = json.report;
        this.saveLocally(json.data);
        return newEntry;
      }
    } catch (e) {
      console.log('Posting via edge localStorage queue');
    }

    // LocalStorage Fallback CRUD
    const data = this.getLocally();
    const newId = 'rpt-' + (Date.now() % 100000);

    let icon = '📦';
    if (reportData.type === 'rescue') icon = '👥';
    if (reportData.type === 'underserved') icon = '⚠️';
    if (reportData.type === 'water') icon = '💧';
    if (reportData.type === 'medical') icon = '🏥';

    newEntry = {
      id: newId,
      org: reportData.org || 'World Aid Org [NGO]',
      type: reportData.type,
      title: `${(reportData.org || 'NGO').split(' ')[0]}: ${reportData.title}`,
      sector: reportData.sector || 'Sector Active',
      timeAgo: 'Just now',
      timestamp: Date.now(),
      icon: icon,
      lat: parseFloat(reportData.lat) || BridgeIt.currentCenter[0],
      lng: parseFloat(reportData.lng) || BridgeIt.currentCenter[1],
      qty: parseInt(reportData.qty) || 1,
    };

    data.fieldUpdates.unshift(newEntry);
    if (data.fieldUpdates.length > 25) data.fieldUpdates.pop();

    // Update KPI metrics
    if (reportData.type === 'rescue') {
      data.metrics.survivorsRescued += newEntry.qty;
      data.metrics.totalRelieved += newEntry.qty * 3;
      const orgItem = data.leaderboard.find(o => o.name.includes((reportData.org || '').split(' ')[0]));
      if (orgItem) {
        const curPts = parseInt(orgItem.score.replace(/[^0-9]/g, '')) || 8000;
        orgItem.score = (curPts + newEntry.qty * 15).toLocaleString() + ' pts';
      }
    } else if (reportData.type === 'underserved') {
      data.metrics.openNeeds += 1;
      data.metrics.gapsIdentified += 1;
    } else {
      data.metrics.totalRelieved += newEntry.qty * 4;
      data.metrics.resourcesTons = parseFloat((data.metrics.resourcesTons + newEntry.qty * 0.05).toFixed(1));
    }

    data.mapPoints.push({
      lat: newEntry.lat,
      lng: newEntry.lng,
      type: reportData.type === 'underserved' ? 'underserved' : (reportData.type === 'rescue' ? 'rescue' : 'resource'),
      label: `${newEntry.sector}: ${newEntry.title}`,
      intensity: 0.9,
    });

    data.connectivity.lastSync = new Date().toLocaleTimeString();

    this.saveLocally(data);
    return newEntry;
  },

  // ==========================================
  // CRUD: UPDATE (Modify Existing Report)
  // ==========================================
  async updateReport(id, updatedFields) {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        const json = await res.json();
        this.saveLocally(json.data);
        return json.report;
      }
    } catch (e) {
      console.log('Updating report locally');
    }

    // LocalStorage fallback update
    const data = this.getLocally();
    const item = data.fieldUpdates.find(r => r.id === id);
    if (item) {
      if (updatedFields.title !== undefined) item.title = updatedFields.title;
      if (updatedFields.sector !== undefined) item.sector = updatedFields.sector;
      if (updatedFields.qty !== undefined) item.qty = parseInt(updatedFields.qty) || item.qty;
      if (updatedFields.type !== undefined) {
        item.type = updatedFields.type;
        if (item.type === 'rescue') item.icon = '👥';
        else if (item.type === 'underserved') item.icon = '⚠️';
        else if (item.type === 'water') item.icon = '💧';
        else if (item.type === 'medical') item.icon = '🏥';
        else item.icon = '📦';
      }
      item.timeAgo = 'Updated just now';
      data.connectivity.lastSync = new Date().toLocaleTimeString();
      this.saveLocally(data);
      return item;
    }
    return null;
  },

  // ==========================================
  // CRUD: DELETE (Remove Report)
  // ==========================================
  async deleteReport(id) {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        this.saveLocally(json.data);
        return true;
      }
    } catch (e) {
      console.log('Deleting report locally');
    }

    const data = this.getLocally();
    const idx = data.fieldUpdates.findIndex(r => r.id === id);
    if (idx !== -1) {
      const removed = data.fieldUpdates.splice(idx, 1)[0];
      data.mapPoints = data.mapPoints.filter(p => !p.label.includes(removed.title));
      data.connectivity.lastSync = new Date().toLocaleTimeString();
      this.saveLocally(data);
      return true;
    }
    return false;
  },

  // ==========================================
  // Generate Rich Sample Data Around Coordinates
  // ==========================================
  generateSampleDataAround(lat, lng, locationName = 'Active Field Zone') {
    const samplePoints = [
      { lat: lat + 0.0055, lng: lng - 0.0042, type: 'rescue', label: `${locationName} Sector B-4: 8 Survivors Rescued`, intensity: 0.95 },
      { lat: lat - 0.0062, lng: lng + 0.0048, type: 'resource', label: `${locationName} Area A: 25 Food Kits Distributed`, intensity: 0.75 },
      { lat: lat + 0.0085, lng: lng + 0.0071, type: 'underserved', label: `${locationName} D-12: Underserved Alert (Urgent Food/Water)`, intensity: 1.0 },
      { lat: lat + 0.0125, lng: lng - 0.0094, type: 'relief', label: `${locationName} Hub North: Relief Supply Depot`, intensity: 0.8 },
      { lat: lat - 0.0091, lng: lng - 0.0065, type: 'affected', label: `${locationName}: Flooded Roadway Access`, intensity: 0.65 },
      { lat: lat - 0.0040, lng: lng - 0.0022, type: 'resource', label: `${locationName} Cache: Emergency Medical Kits`, intensity: 0.75 },
      { lat: lat + 0.0035, lng: lng + 0.0042, type: 'relief', label: `${locationName} Sector C-2: NGO Aid Distribution Site`, intensity: 0.85 },
      { lat: lat - 0.0145, lng: lng + 0.0112, type: 'underserved', label: `${locationName} South Sector: Power & Medical Deficit`, intensity: 0.95 },
      { lat: lat + 0.0068, lng: lng - 0.0078, type: 'rescue', label: `${locationName} Sector B-1: 14 Evacuees Transported`, intensity: 0.9 },
      { lat: lat - 0.0025, lng: lng + 0.0135, type: 'relief', label: `${locationName} East Hub: Clean Water Purification`, intensity: 0.8 },
    ];

    const sampleFeed = [
      {
        id: 'rpt-' + (Date.now() % 10000),
        org: 'World Aid Org [NGO]',
        type: 'rescue',
        title: `NGO: 8 Survivors Rescued (${locationName})`,
        sector: `${locationName} Sector B-4`,
        timeAgo: 'Just now',
        timestamp: Date.now() - 3 * 60 * 1000,
        icon: '👥',
        lat: lat + 0.0055,
        lng: lng - 0.0042,
        qty: 8,
      },
      {
        id: 'rpt-' + ((Date.now() + 1) % 10000),
        org: 'World Aid Org [NGO]',
        type: 'food',
        title: `NGO: 25 Food Kits Dispatched`,
        sector: `${locationName} Area A`,
        timeAgo: '12m ago',
        timestamp: Date.now() - 12 * 60 * 1000,
        icon: '📦',
        lat: lat - 0.0062,
        lng: lng + 0.0048,
        qty: 25,
      },
      {
        id: 'rpt-' + ((Date.now() + 2) % 10000),
        org: 'Gov Disaster Mgmt',
        type: 'underserved',
        title: `Gov: Underserved Alert (Water Needed)`,
        sector: `${locationName} D-12`,
        timeAgo: '28m ago',
        timestamp: Date.now() - 28 * 60 * 1000,
        icon: '⚠️',
        lat: lat + 0.0085,
        lng: lng + 0.0071,
        qty: 1,
      },
      {
        id: 'rpt-' + ((Date.now() + 3) % 10000),
        org: 'Red Cross',
        type: 'water',
        title: `Red Cross: 250 Gal Clean Water Dispensed`,
        sector: `${locationName} Waterfront`,
        timeAgo: '45m ago',
        timestamp: Date.now() - 45 * 60 * 1000,
        icon: '💧',
        lat: lat + 0.0125,
        lng: lng - 0.0094,
        qty: 250,
      },
      {
        id: 'rpt-' + ((Date.now() + 4) % 10000),
        org: 'UN Relief',
        type: 'medical',
        title: `UN Relief: Field Triage Station Activated`,
        sector: `${locationName} Central`,
        timeAgo: '1h 10m ago',
        timestamp: Date.now() - 70 * 60 * 1000,
        icon: '🏥',
        lat: lat - 0.0040,
        lng: lng - 0.0022,
        qty: 40,
      },
    ];

    const data = this.getLocally();
    data.mapPoints = samplePoints;
    data.fieldUpdates = sampleFeed;
    data.connectivity.lastSync = new Date().toLocaleTimeString();

    this.saveLocally(data);

    // Also push to server if reachable
    fetch('/api/relocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, locationName }),
    }).catch(() => {});

    return data;
  },

  async resetToDefaults() {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {}

    this.saveLocally(DEFAULT_SEED_DATA);
    UI.refreshAll();
    MapModule.updateLayers();
    UI.showToast('Database reset to initial disaster operations data.');
  },
};

/* --------------------------------------------------------------------------
   UI Rendering and State Updates
   -------------------------------------------------------------------------- */
const UI = {
  refreshAll() {
    const data = DB.get();
    this.renderKPIs(data.metrics);
    this.renderBarChart(data.gaps);
    this.renderResourceBreakdown(data.resources);
    this.renderLiveFeed(data.fieldUpdates);
    this.renderLeaderboard(data.leaderboard);
    this.renderConnectivity(data.connectivity);
    this.updateCoordsBadge();
    if (MapModule.initialized) {
      MapModule.updateLayers();
    }
  },

  renderKPIs(metrics) {
    const elRelieved = document.getElementById('kpi-total-relieved');
    const elResources = document.getElementById('kpi-resources-dist');
    const elRescued = document.getElementById('kpi-survivors-rescued');
    const elNeeds = document.getElementById('kpi-open-needs');
    const elGapsHeader = document.getElementById('gaps-identified-count');

    if (elRelieved) elRelieved.textContent = Number(metrics.totalRelieved).toLocaleString();
    if (elResources) elResources.textContent = `${metrics.resourcesTons}T`;
    if (elRescued) elRescued.textContent = Number(metrics.survivorsRescued).toLocaleString();
    if (elNeeds) elNeeds.textContent = metrics.openNeeds;
    if (elGapsHeader) elGapsHeader.textContent = metrics.gapsIdentified || 14;
  },

  renderBarChart(gaps) {
    const plotArea = document.getElementById('bar-chart-plot');
    if (!plotArea) return;

    const maxScale = 10000;
    plotArea.innerHTML = '';

    gaps.forEach((gap) => {
      const heightPercent = Math.min(100, Math.max(10, Math.round((gap.count / maxScale) * 100)));

      const barGroup = document.createElement('div');
      barGroup.className = 'chart-bar-group';
      barGroup.innerHTML = `
        <div class="chart-bar-tooltip">${gap.category}: ${gap.count.toLocaleString()} (Target: ${gap.needed.toLocaleString()})</div>
        <div class="chart-bar" style="height: ${heightPercent}%;"></div>
      `;
      plotArea.appendChild(barGroup);
    });
  },

  renderResourceBreakdown(resources) {
    const progressBar = document.getElementById('resource-progress-bar');
    const statList = document.getElementById('resource-stat-list');
    if (!progressBar || !statList) return;

    progressBar.innerHTML = '';
    statList.innerHTML = '';

    resources.forEach((res) => {
      const seg = document.createElement('div');
      seg.className = `progress-segment seg-${res.name.toLowerCase()}`;
      seg.style.width = `${res.percent}%`;
      seg.title = `${res.name}: ${res.tons}T (${res.percent}%)`;
      progressBar.appendChild(seg);

      const item = document.createElement('div');
      item.className = 'resource-stat-item';
      item.innerHTML = `
        <span class="stat-item-name">${res.name}</span>
        <span class="stat-item-qty">${res.tons}T (${res.percent}%)</span>
      `;
      statList.appendChild(item);
    });
  },

  renderLiveFeed(updates) {
    const list = document.getElementById('live-feed-list');
    if (!list) return;

    list.innerHTML = '';

    if (!updates || updates.length === 0) {
      list.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px;">No active field updates. Add one below!</div>';
      return;
    }

    updates.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'feed-item';
      row.innerHTML = `
        <div class="feed-left">
          <span class="feed-icon">${item.icon || '📦'}</span>
          <div class="feed-text">
            <div>${this.escapeHTML(item.title)}</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:500;">${this.escapeHTML(item.sector)}</div>
          </div>
        </div>
        <div class="feed-right">
          <span class="feed-time">${this.calculateTimeAgo(item.timestamp) || item.timeAgo}</span>
          <div class="feed-actions">
            <button class="btn-feed-action btn-zoom" title="Zoom to location on map" aria-label="Zoom to location">
              🔍
            </button>
            <button class="btn-feed-action btn-edit" title="Edit this report" aria-label="Edit report">
              ✏️
            </button>
            <button class="btn-feed-action btn-delete" title="Dismiss / Delete report" aria-label="Delete report">
              🗑️
            </button>
          </div>
        </div>
      `;

      // Zoom to map point
      row.querySelector('.btn-zoom')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.lat && item.lng && BridgeIt.map) {
          BridgeIt.map.setView([item.lat, item.lng], 15, { animate: true });
          UI.showToast(`Centered on ${item.sector}`);
        }
      });

      // Edit report modal
      row.querySelector('.btn-edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        UI.openEditModal(item);
      });

      // Delete report
      row.querySelector('.btn-delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Remove report "${item.title}"?`)) {
          await DB.deleteReport(item.id);
          UI.refreshAll();
          UI.showToast('Field report removed from database.');
        }
      });

      // Click on row body pans to location
      row.addEventListener('click', () => {
        if (item.lat && item.lng && BridgeIt.map) {
          BridgeIt.map.setView([item.lat, item.lng], 15, { animate: true });
        }
      });

      list.appendChild(row);
    });
  },

  renderLeaderboard(ranks) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    list.innerHTML = '';

    ranks.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.innerHTML = `
        <div>
          <span class="leaderboard-rank">${r.rank}.</span>
          <span class="leaderboard-name">${this.escapeHTML(r.name)}</span>
        </div>
        <span class="leaderboard-pts">${this.escapeHTML(r.score)} <small style="color:var(--text-muted);font-weight:normal;">${this.escapeHTML(r.details || '')}</small></span>
      `;
      list.appendChild(item);
    });
  },

  renderConnectivity(conn) {
    const elNgo = document.getElementById('conn-ngo-devices');
    const elGov = document.getElementById('conn-gov-hubs');
    const elEdge = document.getElementById('conn-edge-nodes');
    const elSync = document.getElementById('conn-sync-text');

    if (elNgo) elNgo.textContent = `${conn.ngoDevices} Connected (${conn.loraMeshDevices} via LoRa Mesh)`;
    if (elGov) elGov.textContent = `${conn.govHubs} Online`;
    if (elEdge) elEdge.textContent = `${conn.edgeNodesActive}/${conn.edgeNodesTotal} Active`;
    if (elSync) {
      const timeStr = conn.lastSync ? ` (Synced: ${conn.lastSync})` : '';
      elSync.textContent = `${conn.statusText}${timeStr}`;
    }
  },

  updateCoordsBadge() {
    const badge = document.getElementById('active-coords-badge');
    if (badge && BridgeIt.currentCenter) {
      const lat = BridgeIt.currentCenter[0].toFixed(4);
      const lng = BridgeIt.currentCenter[1].toFixed(4);
      const latDir = lat >= 0 ? 'N' : 'S';
      const lngDir = lng >= 0 ? 'E' : 'W';
      badge.textContent = `Center: ${Math.abs(lat)}° ${latDir}, ${Math.abs(lng)}° ${lngDir}`;
    }
  },

  openEditModal(item) {
    const modal = document.getElementById('edit-report-modal');
    if (!modal) return;

    document.getElementById('edit-report-id').value = item.id;
    document.getElementById('edit-report-title').value = item.title;
    document.getElementById('edit-report-sector').value = item.sector;
    document.getElementById('edit-report-qty').value = item.qty || 1;
    document.getElementById('edit-report-type').value = item.type || 'rescue';

    modal.classList.remove('hidden');
  },

  closeEditModal() {
    const modal = document.getElementById('edit-report-modal');
    if (modal) modal.classList.add('hidden');
  },

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span><span>${this.escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  calculateTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

/* --------------------------------------------------------------------------
   Interactive Leaflet Map Module (100% Free OpenStreetMap Raster Layer)
   -------------------------------------------------------------------------- */
const MapModule = {
  initialized: false,

  init() {
    const container = document.getElementById('map-container');
    if (!container || typeof L === 'undefined') return;

    // Initialize Leaflet Map
    BridgeIt.map = L.map('map-container', {
      center: BridgeIt.currentCenter,
      zoom: 13,
      zoomControl: false,
    });

    // Zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(BridgeIt.map);

    // Free Standard OpenStreetMap Tiles (No API key needed)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(BridgeIt.map);

    // Marker layers
    BridgeIt.markersLayer = L.layerGroup().addTo(BridgeIt.map);

    // Click anywhere on map autofills report coordinates
    BridgeIt.map.on('click', (e) => {
      const lat = e.latlng.lat.toFixed(4);
      const lng = e.latlng.lng.toFixed(4);

      const latInput = document.getElementById('report-lat');
      const lngInput = document.getElementById('report-lng');
      if (latInput && lngInput) {
        latInput.value = lat;
        lngInput.value = lng;
      }

      UI.showToast(`Coordinates picked: ${lat}, ${lng}`);
    });

    this.initialized = true;
    this.updateLayers();

    // Trigger auto-location detection on startup
    LocationModule.detectLocation(true);
  },

  updateLayers() {
    if (!BridgeIt.map || !this.initialized) return;
    const data = DB.get();

    // 1. Heatmap layer
    const showReliefHeat = document.getElementById('layer-relief')?.checked ?? true;
    const showGapsHeat = document.getElementById('layer-gaps')?.checked ?? false;
    const showRescueHeat = document.getElementById('layer-rescue')?.checked ?? false;

    const heatPoints = [];
    data.mapPoints.forEach((pt) => {
      let include = false;
      if (showReliefHeat && (pt.type === 'relief' || pt.type === 'resource')) include = true;
      if (showGapsHeat && pt.type === 'underserved') include = true;
      if (showRescueHeat && pt.type === 'rescue') include = true;

      if (!showReliefHeat && !showGapsHeat && !showRescueHeat) include = true;

      if (include) {
        heatPoints.push([pt.lat, pt.lng, pt.intensity || 0.8]);
      }
    });

    if (typeof L.heatLayer === 'function') {
      if (BridgeIt.heatLayer) {
        BridgeIt.map.removeLayer(BridgeIt.heatLayer);
      }
      BridgeIt.heatLayer = L.heatLayer(heatPoints, {
        radius: 38,
        blur: 24,
        maxZoom: 16,
        gradient: {
          0.2: '#3b82f6',
          0.4: '#10b981',
          0.6: '#fbbf24',
          0.8: '#f97316',
          1.0: '#ef4444',
        },
      }).addTo(BridgeIt.map);
    }

    // 2. Geotagged Pins
    if (BridgeIt.markersLayer) {
      BridgeIt.markersLayer.clearLayers();

      data.mapPoints.forEach((pt) => {
        let iconHtml = '';
        let bgColor = '#2563eb';
        let size = 26;

        if (pt.type === 'rescue') {
          bgColor = '#0284c7';
          iconHtml = `<div class="map-marker-pin" style="background:${bgColor};width:${size}px;height:${size}px;font-size:12px;">👥</div>`;
        } else if (pt.type === 'resource') {
          bgColor = '#d97706';
          iconHtml = `<div class="map-marker-pin" style="background:${bgColor};width:${size}px;height:${size}px;font-size:12px;">📦</div>`;
        } else if (pt.type === 'underserved') {
          bgColor = '#dc2626';
          iconHtml = `<div class="map-marker-pin map-pulse" style="background:${bgColor};width:${size}px;height:${size}px;font-size:12px;">🔴</div>`;
        } else if (pt.type === 'affected') {
          bgColor = '#ea580c';
          iconHtml = `<div class="map-marker-pin" style="background:${bgColor};width:${size}px;height:${size}px;font-size:12px;">🟠</div>`;
        } else {
          bgColor = '#2563eb';
          iconHtml = `<div class="map-marker-pin" style="background:${bgColor};width:${size}px;height:${size}px;font-size:12px;">🔵</div>`;
        }

        const customIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([pt.lat, pt.lng], { icon: customIcon });

        marker.bindPopup(`
          <div style="font-size:12px;min-width:180px;">
            <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${pt.label}</div>
            <div style="color:#64748b;font-size:11px;margin-bottom:8px;">GPS: ${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}</div>
            <div style="display:inline-block;padding:2px 6px;border-radius:4px;background:#f1f5f9;font-weight:600;color:#334155;font-size:10.5px;">Active Disaster Node</div>
          </div>
        `);

        BridgeIt.markersLayer.addLayer(marker);
      });
    }

    // 3. User Operator Station Beacon
    if (BridgeIt.userCoords) {
      if (BridgeIt.operatorMarker) {
        BridgeIt.map.removeLayer(BridgeIt.operatorMarker);
      }
      const opIcon = L.divIcon({
        html: `
          <div class="map-operator-marker" title="Your Live Operator Location">
            <div class="operator-center-dot"></div>
            <div class="operator-pulse-ring"></div>
          </div>
        `,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      BridgeIt.operatorMarker = L.marker([BridgeIt.userCoords.lat, BridgeIt.userCoords.lng], { icon: opIcon });
      BridgeIt.operatorMarker.bindPopup(`
        <div style="font-size:12px;font-weight:700;color:#2563eb;">
          📍 Operator Command Station (Your Location)
          <div style="font-weight:normal;color:#64748b;font-size:11px;margin-top:4px;">
            Lat: ${BridgeIt.userCoords.lat.toFixed(4)}, Lng: ${BridgeIt.userCoords.lng.toFixed(4)}
          </div>
        </div>
      `);
      BridgeIt.operatorMarker.addTo(BridgeIt.map);
    }
  },
};

/* --------------------------------------------------------------------------
   Location & Geolocation Module (GPS + IP Fallback + Test Data Generation)
   -------------------------------------------------------------------------- */
const LocationModule = {
  async detectLocation(silent = false) {
    const btn = document.getElementById('btn-detect-gps');
    const chip = document.getElementById('chip-detect-gps');
    if (btn) {
      btn.classList.add('locating');
      btn.innerHTML = '<span>📡</span> <span>Detecting GPS...</span>';
    }
    if (chip) {
      chip.classList.add('locating');
      chip.textContent = '📡 Detecting...';
    }

    let detected = false;
    const finish = (lat, lng, locationName, isGPS = true) => {
      if (detected) return;
      detected = true;
      this.applyLocation(lat, lng, locationName, isGPS);
    };

    // Parallel Server Lookup: backend /api/my-location resolves IP reliably without client CORS limits
    const serverLookupPromise = fetch('/api/my-location')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.lat && data.lng) {
          return data;
        }
        return null;
      })
      .catch(() => null);

    // Try browser GPS if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          finish(lat, lng, 'Your GPS Location', true);
        },
        async (err) => {
          console.warn('Browser GPS permission declined or restricted. Falling back to network IP resolution...', err.message);
          const serverGeo = await serverLookupPromise;
          if (serverGeo) {
            finish(serverGeo.lat, serverGeo.lng, serverGeo.name || `${serverGeo.city}, ${serverGeo.country}`, false);
          } else {
            finish(28.6139, 77.2090, 'India Command Hub (NCR)', false);
          }
        },
        { enableHighAccuracy: false, timeout: 3500, maximumAge: 60000 }
      );
    } else {
      const serverGeo = await serverLookupPromise;
      if (serverGeo) {
        finish(serverGeo.lat, serverGeo.lng, serverGeo.name || `${serverGeo.city}, ${serverGeo.country}`, false);
      } else {
        finish(28.6139, 77.2090, 'India Command Hub (NCR)', false);
      }
    }

    // Timeout safety fallback: ensure it never hangs more than 3.5 seconds
    setTimeout(async () => {
      if (!detected) {
        const serverGeo = await serverLookupPromise;
        if (serverGeo) {
          finish(serverGeo.lat, serverGeo.lng, serverGeo.name || `${serverGeo.city}, ${serverGeo.country}`, false);
        } else {
          finish(28.6139, 77.2090, 'India Command Hub (NCR)', false);
        }
      }
    }, 3500);
  },

  applyLocation(lat, lng, locationName, isGPS = true) {
    BridgeIt.userCoords = { lat, lng };
    BridgeIt.currentCenter = [lat, lng];
    BridgeIt.currentRegionName = locationName;

    // Generate sample data around this location so the map and feeds immediately display real test points
    DB.generateSampleDataAround(lat, lng, locationName);

    if (BridgeIt.map) {
      BridgeIt.map.setView([lat, lng], 13, { animate: true });
      MapModule.updateLayers();
    }
    UI.refreshAll();

    // Autofill modal coordinates
    const latInput = document.getElementById('report-lat');
    const lngInput = document.getElementById('report-lng');
    if (latInput) latInput.value = lat.toFixed(4);
    if (lngInput) lngInput.value = lng.toFixed(4);

    const titleEl = document.getElementById('zone-title');
    if (titleEl) titleEl.textContent = `Active Disaster Zone (${locationName})`;

    const zoneBadge = document.getElementById('quick-zone-badge');
    if (zoneBadge) zoneBadge.textContent = `📍 Active: ${locationName}`;

    // Synchronize select dropdown
    const select = document.getElementById('region-select');
    if (select) {
      if (locationName.includes('Delhi')) select.value = 'india-delhi';
      else if (locationName.includes('Mumbai')) select.value = 'india-mumbai';
      else if (locationName.includes('Bengaluru')) select.value = 'india-bengaluru';
      else if (locationName.includes('Kolkata')) select.value = 'india-kolkata';
      else if (locationName.includes('Chennai')) select.value = 'india-chennai';
      else if (locationName.includes('Hyderabad')) select.value = 'india-hyderabad';
      else if (locationName.includes('Pune')) select.value = 'india-pune';
      else select.value = 'gps';
    }

    this.resetBtn();
    UI.showToast(`Centered on ${locationName} (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`);
  },

  setRegionPreset(presetKey) {
    const presets = {
      'gps': null,
      'india-delhi': { lat: 28.6139, lng: 77.2090, name: 'India - New Delhi (NCR)' },
      'india-mumbai': { lat: 19.0760, lng: 72.8777, name: 'India - Mumbai Coast' },
      'india-bengaluru': { lat: 12.9716, lng: 77.5946, name: 'India - Bengaluru Tech Hub' },
      'india-kolkata': { lat: 22.5726, lng: 88.3639, name: 'India - Kolkata East' },
      'india-chennai': { lat: 13.0827, lng: 80.2707, name: 'India - Chennai South' },
      'india-hyderabad': { lat: 17.3850, lng: 78.4867, name: 'India - Hyderabad Hub' },
      'india-pune': { lat: 18.5204, lng: 73.8567, name: 'India - Pune Sector' },
      'global-ref': { lat: 40.7306, lng: -73.9925, name: 'Global Reference Grid (NYC)' },
    };

    if (presetKey === 'gps') {
      this.detectLocation(false);
      return;
    }

    const target = presets[presetKey];
    if (target) {
      BridgeIt.currentCenter = [target.lat, target.lng];
      BridgeIt.currentRegionName = target.name;
      this.applyLocation(target.lat, target.lng, target.name, false);
    }
  },

  resetBtn() {
    const btn = document.getElementById('btn-detect-gps');
    if (btn) {
      btn.classList.remove('locating');
      btn.innerHTML = '<span>📍</span> <span>Detect My GPS Location</span>';
    }
    const chip = document.getElementById('chip-detect-gps');
    if (chip) {
      chip.classList.remove('locating');
      chip.textContent = '📍 Detect GPS';
    }
  },
};

/* --------------------------------------------------------------------------
   Auto-Refresh & Background Mesh Sync Engine
   -------------------------------------------------------------------------- */
const SyncEngine = {
  start() {
    if (BridgeIt.autoRefreshTimer) clearInterval(BridgeIt.autoRefreshTimer);

    const interval = BridgeIt.autoRefreshInterval || 10000;
    BridgeIt.autoRefreshTimer = setInterval(() => {
      if (!BridgeIt.autoRefreshEnabled) return;
      this.tick();
    }, interval);
  },

  async tick() {
    const spinIcon = document.querySelector('.spin-icon');
    const manualBtn = document.getElementById('btn-manual-sync');
    if (spinIcon) spinIcon.classList.add('spinning');
    if (manualBtn) manualBtn.classList.add('rotating');

    // Sync database with server
    await DB.syncWithServer();

    // Occasionally simulate incoming field packet via LoRa mesh
    if (Math.random() > 0.6) {
      this.simulateIncomingMeshPacket();
    }

    // Refresh all UI widgets
    UI.refreshAll();

    setTimeout(() => {
      if (spinIcon) spinIcon.classList.remove('spinning');
      if (manualBtn) manualBtn.classList.remove('rotating');
    }, 1000);
  },

  simulateIncomingMeshPacket() {
    const data = DB.get();
    const packetTypes = [
      { type: 'water', title: 'Relayed 40 Water Gallons', sector: 'Sector C-3', icon: '💧', qty: 40 },
      { type: 'rescue', title: 'Search Team: 3 Evacuated Safely', sector: 'Area East', icon: '👥', qty: 3 },
      { type: 'food', title: 'Field Drop: 15 Food Ration Packs', sector: 'Grid 4', icon: '📦', qty: 15 },
    ];
    const pick = packetTypes[Math.floor(Math.random() * packetTypes.length)];

    const offsetLat = (Math.random() - 0.5) * 0.015;
    const offsetLng = (Math.random() - 0.5) * 0.015;

    const simulated = {
      id: 'mesh-' + (Date.now() % 10000),
      org: 'Edge Mesh Node #3',
      type: pick.type,
      title: `Mesh: ${pick.title}`,
      sector: `${BridgeIt.currentRegionName || 'Local'} Sector ${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
      timeAgo: 'Just now',
      timestamp: Date.now(),
      icon: pick.icon,
      lat: BridgeIt.currentCenter[0] + offsetLat,
      lng: BridgeIt.currentCenter[1] + offsetLng,
      qty: pick.qty,
    };

    data.fieldUpdates.unshift(simulated);
    if (data.fieldUpdates.length > 25) data.fieldUpdates.pop();
    DB.saveLocally(data);
  },

  triggerManualSync() {
    this.tick();
    UI.showToast('Database & mesh synced across all widgets.');
  },
};

/* --------------------------------------------------------------------------
   Event Handlers & User Interactions (Making all buttons functional)
   -------------------------------------------------------------------------- */
function setupEventHandlers() {
  // --- Helper to open/close modals cleanly ---
  const toggleModal = (modalId, show) => {
    const el = document.getElementById(modalId);
    if (!el) return;
    if (show) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  };

  // Close modals when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add('hidden');
      }
    });
  });

  // --- Modal 1: Add New Report ---
  const modalAdd = document.getElementById('report-modal');
  const btnOpenModal = document.getElementById('btn-open-report-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const formReport = document.getElementById('form-new-report');

  const openAddModal = () => {
    if (modalAdd) {
      modalAdd.classList.remove('hidden');
      const latInput = document.getElementById('report-lat');
      const lngInput = document.getElementById('report-lng');
      if (latInput && !latInput.value) latInput.value = BridgeIt.currentCenter[0].toFixed(4);
      if (lngInput && !lngInput.value) lngInput.value = BridgeIt.currentCenter[1].toFixed(4);
    }
  };

  const closeAddModal = () => {
    if (modalAdd) modalAdd.classList.add('hidden');
  };

  if (btnOpenModal) btnOpenModal.addEventListener('click', openAddModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeAddModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeAddModal);

  // Quick Use Live GPS in Report Modal
  const btnFillCoordsGps = document.getElementById('btn-modal-use-gps');
  if (btnFillCoordsGps) {
    btnFillCoordsGps.addEventListener('click', () => {
      if (BridgeIt.userCoords) {
        document.getElementById('report-lat').value = BridgeIt.userCoords.lat.toFixed(4);
        document.getElementById('report-lng').value = BridgeIt.userCoords.lng.toFixed(4);
        UI.showToast('Filled coordinates from your live location!');
      } else {
        LocationModule.detectLocation(false);
      }
    });
  }

  // Handle Add Form Submission (CRUD: Create)
  if (formReport) {
    formReport.addEventListener('submit', async (e) => {
      e.preventDefault();

      const type = document.getElementById('report-type')?.value || 'rescue';
      const org = document.getElementById('report-org')?.value || 'World Aid Org [NGO]';
      const sector = document.getElementById('report-sector')?.value || 'Sector Center';
      const title = document.getElementById('report-title')?.value || 'Field Activity Dispatched';
      const qty = document.getElementById('report-qty')?.value || '1';
      const lat = document.getElementById('report-lat')?.value || BridgeIt.currentCenter[0];
      const lng = document.getElementById('report-lng')?.value || BridgeIt.currentCenter[1];

      await DB.addReport({ type, org, sector, title, qty, lat, lng });

      UI.refreshAll();
      closeAddModal();
      formReport.reset();

      UI.showToast(`Report broadcasted: "${title}" (${sector})`);
    });
  }

  // --- Modal 2: Edit Report ---
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');
  const formEditReport = document.getElementById('form-edit-report');

  if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', () => UI.closeEditModal());
  if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', () => UI.closeEditModal());

  // Handle Edit Form Submission (CRUD: Update)
  if (formEditReport) {
    formEditReport.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-report-id').value;
      const title = document.getElementById('edit-report-title').value;
      const sector = document.getElementById('edit-report-sector').value;
      const qty = document.getElementById('edit-report-qty').value;
      const type = document.getElementById('edit-report-type').value;

      await DB.updateReport(id, { title, sector, qty, type });
      UI.closeEditModal();
      UI.refreshAll();
      UI.showToast(`Report updated: "${title}"`);
    });
  }

  // --- Modal 3: Notifications Modal ---
  const btnNotifs = document.getElementById('btn-notifications');
  const btnCloseNotif = document.getElementById('btn-close-notif-modal');
  const btnCloseNotifAct = document.getElementById('btn-close-notif-action');
  const btnClearNotifs = document.getElementById('btn-clear-notifs');

  if (btnNotifs) btnNotifs.addEventListener('click', () => toggleModal('notifications-modal', true));
  if (btnCloseNotif) btnCloseNotif.addEventListener('click', () => toggleModal('notifications-modal', false));
  if (btnCloseNotifAct) btnCloseNotifAct.addEventListener('click', () => toggleModal('notifications-modal', false));

  if (btnClearNotifs) {
    btnClearNotifs.addEventListener('click', () => {
      const container = document.getElementById('notif-list-container');
      if (container) {
        container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No active alerts. All items marked as resolved.</div>';
      }
      const badge = document.querySelector('.notification-badge');
      if (badge) badge.style.display = 'none';
      UI.showToast('All notifications cleared.');
    });
  }

  // --- Modal 4: Operator Profile Modal & Role Switcher ---
  const btnUserProfile = document.getElementById('btn-user-profile');
  const userNameBadge = document.querySelector('.user-name-badge');
  const btnCloseProfile = document.getElementById('btn-close-profile-modal');
  const btnCloseProfileAct = document.getElementById('btn-close-profile-action');
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const selectRole = document.getElementById('select-profile-role');

  const openProfile = () => toggleModal('user-profile-modal', true);
  if (btnUserProfile) btnUserProfile.addEventListener('click', openProfile);
  if (userNameBadge) {
    userNameBadge.style.cursor = 'pointer';
    userNameBadge.addEventListener('click', openProfile);
  }
  if (btnCloseProfile) btnCloseProfile.addEventListener('click', () => toggleModal('user-profile-modal', false));
  if (btnCloseProfileAct) btnCloseProfileAct.addEventListener('click', () => toggleModal('user-profile-modal', false));

  if (btnSaveProfile && selectRole) {
    btnSaveProfile.addEventListener('click', () => {
      const [org, name, role] = selectRole.value.split('|');
      const nameBadge = document.querySelector('.user-name-badge');
      const orgBadge = document.querySelector('.user-org-badge');
      const profileName = document.getElementById('profile-operator-name');
      const profileRole = document.getElementById('profile-operator-role');
      const profileOrgVal = document.getElementById('profile-org-val');

      if (nameBadge) nameBadge.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${name}`;
      if (orgBadge) orgBadge.textContent = `Logged in as: ${org}`;
      if (profileName) profileName.textContent = name;
      if (profileRole) profileRole.textContent = role;
      if (profileOrgVal) profileOrgVal.textContent = org;

      toggleModal('user-profile-modal', false);
      UI.showToast(`Switched operator identity to ${name} (${org})`);
    });
  }

  // --- Modal 5: Field Units & Responders ---
  const btnCloseResp = document.getElementById('btn-close-resp-modal');
  const btnCloseRespAct = document.getElementById('btn-close-resp-action');
  if (btnCloseResp) btnCloseResp.addEventListener('click', () => toggleModal('responders-modal', false));
  if (btnCloseRespAct) btnCloseRespAct.addEventListener('click', () => toggleModal('responders-modal', false));

  // --- Modal 6: Audit Log & Ledger ---
  const btnCloseAudit = document.getElementById('btn-close-audit-modal');
  const btnCloseAuditAct = document.getElementById('btn-close-audit-action');
  const btnExportLog = document.getElementById('btn-export-log');
  if (btnCloseAudit) btnCloseAudit.addEventListener('click', () => toggleModal('audit-log-modal', false));
  if (btnCloseAuditAct) btnCloseAuditAct.addEventListener('click', () => toggleModal('audit-log-modal', false));

  if (btnExportLog) {
    btnExportLog.addEventListener('click', () => {
      const logData = {
        station: 'NODE-09-DELHI-NCR',
        exportedAt: new Date().toISOString(),
        currentRegion: BridgeIt.currentRegionName,
        center: BridgeIt.currentCenter,
        data: DB.get(),
      };
      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bridgeit-audit-log-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.showToast('Exported edge audit log to JSON.');
    });
  }

  // --- Modal 7: Settings Modal ---
  const btnCloseSettings = document.getElementById('btn-close-settings-modal');
  const btnCloseSettingsAct = document.getElementById('btn-close-settings-action');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => toggleModal('settings-modal', false));
  if (btnCloseSettingsAct) btnCloseSettingsAct.addEventListener('click', () => toggleModal('settings-modal', false));

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const rateSelect = document.getElementById('setting-refresh-rate');
      if (rateSelect) {
        BridgeIt.autoRefreshInterval = parseInt(rateSelect.value, 10);
        SyncEngine.start();
      }
      toggleModal('settings-modal', false);
      UI.showToast(`Saved settings: Auto-sync set to ${BridgeIt.autoRefreshInterval / 1000}s interval.`);
    });
  }

  // --- Modal 8: Organizations Directory ---
  const btnCloseOrgs = document.getElementById('btn-close-orgs-modal');
  const btnCloseOrgsAct = document.getElementById('btn-close-orgs-action');
  if (btnCloseOrgs) btnCloseOrgs.addEventListener('click', () => toggleModal('orgs-modal', false));
  if (btnCloseOrgsAct) btnCloseOrgsAct.addEventListener('click', () => toggleModal('orgs-modal', false));

  // --- Command Center Tab Switching ---
  const ccTabs = document.querySelectorAll('.cc-tab');
  const switchCCTab = (targetId) => {
    ccTabs.forEach((t) => {
      const isTarget = t.getAttribute('data-target') === targetId;
      t.classList.toggle('active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    document.querySelectorAll('.cc-panel').forEach((panel) => {
      panel.style.display = 'none';
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(targetId);
    if (activePanel) {
      activePanel.style.display = 'block';
      activePanel.classList.add('active');
    }

    if (targetId === 'panel-resources') UI.renderResources();
    else if (targetId === 'panel-gaps') UI.renderGaps();
    else if (targetId === 'panel-units') UI.renderLeaderboard();
  };

  ccTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      switchCCTab(targetId);
    });
  });

  // --- Quick Location Chips in Emergency Bar ---
  const chipGps = document.getElementById('chip-detect-gps');
  if (chipGps) {
    chipGps.addEventListener('click', () => {
      document.querySelectorAll('.loc-chip').forEach((c) => c.classList.remove('active'));
      chipGps.classList.add('active');
      LocationModule.detectLocation(false);
    });
  }

  document.querySelectorAll('.loc-chip[data-preset]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.loc-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const preset = chip.getAttribute('data-preset');
      LocationModule.setRegionPreset(preset);
    });
  });

  // --- Sub-Navigation Tabs ---
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const tabName = tab.getAttribute('data-tab');
      if (tabName === 'Dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        switchCCTab('panel-feed');
      } else if (tabName === 'Field Updates') {
        switchCCTab('panel-feed');
        const target = document.getElementById('panel-feed');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          target.classList.add('widget-highlight');
          setTimeout(() => target.classList.remove('widget-highlight'), 1800);
        }
      } else if (tabName === 'Resources') {
        switchCCTab('panel-resources');
        const target = document.getElementById('panel-resources');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          target.classList.add('widget-highlight');
          setTimeout(() => target.classList.remove('widget-highlight'), 1800);
        }
      } else if (tabName === 'Map View') {
        const target = document.getElementById('map-container');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (BridgeIt.map) BridgeIt.map.invalidateSize();
        }
      } else if (tabName === 'Organizations') {
        toggleModal('orgs-modal', true);
      } else if (tabName === 'Reports') {
        openAddModal();
      }
    });
  });

  // --- Left Rail Buttons ---
  const railBtns = document.querySelectorAll('.rail-btn');
  if (railBtns.length >= 4) {
    // 1. Dashboard
    railBtns[0].addEventListener('click', () => {
      railBtns.forEach((b) => b.classList.remove('active'));
      railBtns[0].classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // 2. First Responders & Field Units
    railBtns[1].addEventListener('click', () => {
      toggleModal('responders-modal', true);
    });
    // 3. Audit Log & Incident Reports
    railBtns[2].addEventListener('click', () => {
      toggleModal('audit-log-modal', true);
    });
    // 4. System Settings
    railBtns[3].addEventListener('click', () => {
      toggleModal('settings-modal', true);
    });
  }

  // --- Location / GPS Detection Button ---
  const btnDetectGps = document.getElementById('btn-detect-gps');
  if (btnDetectGps) {
    btnDetectGps.addEventListener('click', () => LocationModule.detectLocation(false));
  }

  // --- Operations Hub Region Dropdown ---
  const regionSelect = document.getElementById('region-select');
  if (regionSelect) {
    regionSelect.addEventListener('change', (e) => {
      LocationModule.setRegionPreset(e.target.value);
    });
  }

  // --- Auto-Sync Toggle ---
  const autoSyncBtn = document.getElementById('btn-toggle-auto-sync');
  if (autoSyncBtn) {
    autoSyncBtn.addEventListener('click', () => {
      BridgeIt.autoRefreshEnabled = !BridgeIt.autoRefreshEnabled;
      if (BridgeIt.autoRefreshEnabled) {
        autoSyncBtn.classList.add('active');
        autoSyncBtn.innerHTML = '<span class="auto-sync-dot"></span><span>Auto-Sync: ON (10s)</span>';
        UI.showToast('Auto-Sync enabled (syncing every 10s).');
      } else {
        autoSyncBtn.classList.remove('active');
        autoSyncBtn.innerHTML = '<span class="auto-sync-dot" style="background:#94a3b8;"></span><span>Auto-Sync: PAUSED</span>';
        UI.showToast('Auto-Sync paused.');
      }
    });
  }

  // --- Manual Sync Button ---
  const btnManualSync = document.getElementById('btn-manual-sync');
  if (btnManualSync) {
    btnManualSync.addEventListener('click', () => SyncEngine.triggerManualSync());
  }

  // --- Map Filter Checkboxes ---
  ['layer-relief', 'layer-gaps', 'layer-rescue'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => MapModule.updateLayers());
    }
  });

  // --- Time Slider Dropdown ---
  const timeFilterSelect = document.getElementById('time-filter-select');
  if (timeFilterSelect) {
    timeFilterSelect.addEventListener('change', (e) => {
      BridgeIt.timeFilter = e.target.value;
      UI.refreshAll();
      MapModule.updateLayers();
      UI.showToast(`Filtered map & feed to: ${e.target.options[e.target.selectedIndex].text}`);
    });
  }

  // --- Area Search Filter & Search Button ---
  const areaSearch = document.getElementById('map-area-search');
  const btnMapSearch = document.getElementById('btn-map-search');

  const executeAreaSearch = () => {
    if (!areaSearch || !BridgeIt.map) return;
    const term = areaSearch.value.trim().toLowerCase();
    if (!term) return;

    // Search existing disaster points first
    const data = DB.get();
    const match = data.mapPoints.find((p) => p.label.toLowerCase().includes(term));
    if (match) {
      BridgeIt.map.setView([match.lat, match.lng], 15, { animate: true });
      UI.showToast(`Found sector: "${match.label}"`);
      return;
    }

    // Common city / sector coordinates search dictionary
    const knownLocations = {
      'delhi': [28.6139, 77.2090],
      'new delhi': [28.6139, 77.2090],
      'ncr': [28.6139, 77.2090],
      'connaught': [28.6315, 77.2167],
      'karol bagh': [28.6517, 77.1906],
      'aiims': [28.5672, 77.2100],
      'mumbai': [19.0760, 72.8777],
      'bengaluru': [12.9716, 77.5946],
      'bangalore': [12.9716, 77.5946],
      'kolkata': [22.5726, 88.3639],
      'chennai': [13.0827, 80.2707],
      'hyderabad': [17.3850, 78.4867],
      'pune': [18.5204, 73.8567],
      'sector b-4': [28.6180, 77.2120],
      'sector d-12': [28.6250, 77.2020],
      'sector a-1': [28.6100, 77.2050],
    };

    const locKey = Object.keys(knownLocations).find((k) => term.includes(k) || k.includes(term));
    if (locKey) {
      const coords = knownLocations[locKey];
      BridgeIt.map.setView(coords, 14, { animate: true });
      UI.showToast(`Navigated to: ${locKey.toUpperCase()} (${coords[0].toFixed(2)}, ${coords[1].toFixed(2)})`);
    } else {
      UI.showToast(`No exact grid match for "${term}". Showing nearest active nodes.`);
    }
  };

  if (areaSearch) {
    areaSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeAreaSearch();
      }
    });
    areaSearch.addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      if (term.length >= 3) executeAreaSearch();
    });
  }

  if (btnMapSearch) {
    btnMapSearch.addEventListener('click', executeAreaSearch);
  }

  // --- Quick Action Buttons in Widget 4 ---
  const btnQuickRescue = document.getElementById('btn-quick-rescue');
  const btnQuickFood = document.getElementById('btn-quick-food');
  const btnQuickWater = document.getElementById('btn-quick-water');
  const btnQuickAlert = document.getElementById('btn-quick-alert');

  if (btnQuickRescue) {
    btnQuickRescue.addEventListener('click', async () => {
      await DB.addReport({
        type: 'rescue',
        org: 'World Aid Org [NGO]',
        sector: `${BridgeIt.currentRegionName || 'NCR'} Perimeter`,
        title: 'Emergency Extraction: 8 Survivors Rescued',
        qty: '8',
        lat: BridgeIt.currentCenter[0] + (Math.random() - 0.5) * 0.01,
        lng: BridgeIt.currentCenter[1] + (Math.random() - 0.5) * 0.01,
      });
      UI.refreshAll();
      UI.showToast('Logged: 8 Survivors Rescued! (+8 to KPI tally)');
    });
  }

  if (btnQuickFood) {
    btnQuickFood.addEventListener('click', async () => {
      await DB.addReport({
        type: 'food',
        org: 'World Aid Org [NGO]',
        sector: `${BridgeIt.currentRegionName || 'NCR'} Depot`,
        title: 'Ration Pack Drop: 25 Kits Distributed',
        qty: '25',
        lat: BridgeIt.currentCenter[0] + (Math.random() - 0.5) * 0.01,
        lng: BridgeIt.currentCenter[1] + (Math.random() - 0.5) * 0.01,
      });
      UI.refreshAll();
      UI.showToast('Logged: 25 Food Kits Distributed.');
    });
  }

  if (btnQuickWater) {
    btnQuickWater.addEventListener('click', async () => {
      await DB.addReport({
        type: 'water',
        org: 'Red Cross / Red Crescent',
        sector: `${BridgeIt.currentRegionName || 'NCR'} Sector 7`,
        title: 'Water Tanker Relief: 250 Gallons Potable Supply',
        qty: '250',
        lat: BridgeIt.currentCenter[0] + (Math.random() - 0.5) * 0.01,
        lng: BridgeIt.currentCenter[1] + (Math.random() - 0.5) * 0.01,
      });
      UI.refreshAll();
      UI.showToast('Logged: 250 Gal Potable Water Dispensed.');
    });
  }

  if (btnQuickAlert) {
    btnQuickAlert.addEventListener('click', async () => {
      await DB.addReport({
        type: 'underserved',
        org: 'Gov Recon Team',
        sector: `${BridgeIt.currentRegionName || 'NCR'} Outskirts`,
        title: 'Critical Resource Gap: Urgent Supplies Needed',
        qty: '1',
        lat: BridgeIt.currentCenter[0] + (Math.random() - 0.5) * 0.01,
        lng: BridgeIt.currentCenter[1] + (Math.random() - 0.5) * 0.01,
      });
      UI.refreshAll();
      UI.showToast('Broadcasted Priority Gap Alert across regional mesh!');
    });
  }

  // --- Sync Status Toggle ---
  const syncPill = document.getElementById('sync-status-pill');
  if (syncPill) {
    syncPill.addEventListener('click', () => {
      BridgeIt.isMeshMode = !BridgeIt.isMeshMode;
      const textEl = syncPill.querySelector('.status-text');

      if (BridgeIt.isMeshMode) {
        syncPill.classList.add('mesh-mode');
        if (textEl) textEl.textContent = 'Sync Status: LoRa Mesh (Offline Queue)';
        UI.showToast('Switched to Decentralized LoRa Mesh Mode.');
      } else {
        syncPill.classList.remove('mesh-mode');
        if (textEl) textEl.textContent = 'Sync Status: Edge Connected - Active Ops';
        UI.showToast('Reconnected to Regional Edge Hub.');
      }
    });
  }

  // --- Reset database button ---
  const btnReset = document.getElementById('btn-reset-db');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Reset database to initial disaster operations data?')) {
        toggleModal('settings-modal', false);
        DB.resetToDefaults();
      }
    });
  }
}

/* --------------------------------------------------------------------------
   Initialization on DOM Ready
   -------------------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  DB.init();
  UI.refreshAll();
  MapModule.init();
  setupEventHandlers();
  SyncEngine.start();
});
