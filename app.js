/**
 * GlobeTrotter Frontend Core Logic
 */



class GlobeTrotterApp {
  constructor() {
    this.user = JSON.parse(localStorage.getItem('gt_user')) || null;
    this.trips = JSON.parse(localStorage.getItem('gt_trips')) || [];
    this.currentScreen = 'dashboard';
    
    // Editor State
    this.editingTripId = null;
    this.activeStopIndex = null;
    this.selectedPresetCover = PRESETS_COVERS[0];

    // Calendar State
    this.currentCalendarDate = new Date(2026, 7, 1); // August 2026

    // Admin State
    this.adminTab = 'users';
    this.usersDb = JSON.parse(localStorage.getItem('gt_users_db')) || [];

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.checkBackendStatus();
    
    // Try to sync with backend on startup
    if (this.user) {
      await this.syncTripsWithBackend();
    }
    
    this.updateUserSessionUI();
    this.renderPresetCovers();
    this.populateCityDropdowns();
    this.renderCommunityTrips();
    this.renderCalendar();
    
    // Initial router navigation
    const hash = window.location.hash.substring(1) || 'dashboard';
    if (this.user) {
      this.navigateTo(hash);
    } else {
      this.showAuth(true);
    }
  }

  // ==================== STATE MANAGEMENT ====================
  async checkBackendStatus() {
    const statusEl = document.getElementById('backend-status');
    if (!statusEl) return;
    try {
      const res = await fetch('http://localhost:5001/api/health');
      if (res.ok) {
        statusEl.className = 'backend-status-badge online';
        statusEl.querySelector('.status-text').textContent = 'Database Connected';
      } else {
        statusEl.className = 'backend-status-badge offline';
        statusEl.querySelector('.status-text').textContent = 'Backend Error';
      }
    } catch (err) {
      statusEl.className = 'backend-status-badge offline';
      statusEl.querySelector('.status-text').textContent = 'Backend Offline';
    }
  }

  saveState() {
    localStorage.setItem('gt_user', JSON.stringify(this.user));
    localStorage.setItem('gt_trips', JSON.stringify(this.trips));
    localStorage.setItem('gt_users_db', JSON.stringify(this.usersDb));
    this.persistStateToBackend();
  }

  async syncTripsWithBackend() {
    if (!this.user) return;
    try {
      const res = await fetch('http://localhost:5001/api/trips', {
        headers: { 'X-User-Email': this.user.email }
      });
      if (res.ok) {
        this.trips = await res.json();
        localStorage.setItem('gt_trips', JSON.stringify(this.trips));
      }
    } catch (err) {
      console.error('Failed to sync trips from backend:', err);
    }
  }

  async persistStateToBackend() {
    if (!this.user) return;
    try {
      for (const trip of this.trips) {
        await fetch('http://localhost:5001/api/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': this.user.email
          },
          body: JSON.stringify(trip)
        });
      }
    } catch (err) {
      console.error('Failed to persist trips to backend:', err);
    }
  }

  async syncAdminUsers() {
    if (!this.user) return;
    try {
      const res = await fetch('http://localhost:5001/api/admin/users', {
        headers: { 'X-User-Email': this.user.email }
      });
      if (res.ok) {
        this.usersDb = await res.json();
        localStorage.setItem('gt_users_db', JSON.stringify(this.usersDb));
      }
    } catch (err) {
      console.error('Failed to sync admin users:', err);
    }
  }

  async navigateTo(screenId) {
    if (!this.user) {
      this.showAuth(true);
      return;
    }

    // Restrict access to admin panel
    if (screenId === 'admin') {
      const emailLower = (this.user.email || '').toLowerCase().trim();
      const isAdmin = emailLower === 'admin' || emailLower === 'admin@globetrotter.com' || emailLower === 'admin@example.com';
      if (!isAdmin) {
        this.navigateTo('dashboard');
        return;
      }
    }

    this.currentScreen = screenId;
    window.location.hash = screenId;

    // Toggle Sidebar active link
    document.querySelectorAll('.menu-item').forEach(item => {
      if (item.getAttribute('data-screen') === screenId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle screens
    document.querySelectorAll('.app-screen').forEach(screen => {
      screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    // Refresh dynamic data lists
    await this.refreshScreenData(screenId);

    // Refresh lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  showAuth(show) {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    if (show) {
      authContainer.classList.add('active');
      appContainer.classList.remove('active');
    } else {
      authContainer.classList.remove('active');
      appContainer.classList.add('active');
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }

  async refreshScreenData(screenId) {
    switch (screenId) {
      case 'dashboard':
        await this.syncTripsWithBackend();
        this.renderDashboard();
        break;
      case 'my-trips':
        await this.syncTripsWithBackend();
        this.renderMyTrips();
        break;
      case 'itinerary-builder':
        this.renderItineraryBuilder();
        break;
      case 'itinerary-view':
        this.renderItineraryView();
        break;
      case 'search':
        this.renderSearch();
        break;
      case 'calendar':
        this.renderCalendar();
        break;
      case 'profile':
        this.renderProfile();
        break;
      case 'admin':
        await this.syncAdminUsers();
        this.renderAdmin();
        break;
    }
  }

  updateUserSessionUI() {
    if (this.user) {
      document.getElementById('user-name-sidebar').textContent = this.user.name;
      document.getElementById('user-email-sidebar').textContent = this.user.email;
      document.querySelectorAll('.user-greet-name').forEach(el => el.textContent = this.user.name);
      if (this.user.avatar) {
        document.getElementById('user-avatar-sidebar').src = this.user.avatar;
      }

      // Hide or show admin panel in navigation sidebar
      const emailLower = (this.user.email || '').toLowerCase().trim();
      const isAdmin = emailLower === 'admin' || emailLower === 'admin@globetrotter.com' || emailLower === 'admin@example.com';
      const adminMenuItem = document.querySelector('.menu-item[data-screen="admin"]');
      if (adminMenuItem) {
        adminMenuItem.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
      }

      this.showAuth(false);
    } else {
      this.showAuth(true);
    }
  }

  // ==================== EVENT LISTENERS ====================
  setupEventListeners() {
    // Auth Toggle Link
    document.getElementById('to-signup').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.remove('active');
      document.getElementById('signup-form').classList.add('active');
    });

    document.getElementById('to-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signup-form').classList.remove('active');
      document.getElementById('login-form').classList.add('active');
    });

    // Signup avatar presets selection
    document.querySelectorAll('.signup-avatar-option').forEach(img => {
      img.addEventListener('click', () => {
        document.querySelectorAll('.signup-avatar-option').forEach(el => el.classList.remove('selected'));
        img.classList.add('selected');
        document.getElementById('signup-avatar-url').value = img.getAttribute('data-avatar');
      });
    });

    // Signup custom file upload
    document.getElementById('signup-avatar-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          let customPreview = document.getElementById('signup-custom-avatar-preview');
          if (!customPreview) {
            customPreview = document.createElement('img');
            customPreview.id = 'signup-custom-avatar-preview';
            customPreview.className = 'signup-avatar-option';
            const label = document.querySelector('.avatar-upload-label');
            label.parentNode.insertBefore(customPreview, label);
          }
          customPreview.src = event.target.result;
          customPreview.setAttribute('data-avatar', event.target.result);
          
          document.querySelectorAll('.signup-avatar-option').forEach(el => el.classList.remove('selected'));
          customPreview.classList.add('selected');
          document.getElementById('signup-avatar-url').value = event.target.result;

          customPreview.addEventListener('click', () => {
            document.querySelectorAll('.signup-avatar-option').forEach(el => el.classList.remove('selected'));
            customPreview.classList.add('selected');
            document.getElementById('signup-avatar-url').value = customPreview.getAttribute('data-avatar');
          });
        };
        reader.readAsDataURL(file);
      }
    });

    // Profile settings avatar upload
    document.getElementById('profile-avatar-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          document.getElementById('profile-avatar-preview').src = event.target.result;
          this.user.avatar = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    // Login Form Submit
    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch('http://localhost:5001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Login failed');
          return;
        }

        const user = await res.json();
        this.user = user;
        this.saveState();
        this.updateUserSessionUI();
        await this.syncTripsWithBackend();
        this.navigateTo('dashboard');
      } catch (err) {
        console.error(err);
        alert('Could not connect to backend server. Make sure the server is running on port 5001.');
      }
    });

    // Signup Form Submit
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const avatarUrl = document.getElementById('signup-avatar-url').value;

      try {
        const res = await fetch('http://localhost:5001/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, avatar: avatarUrl })
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Registration failed');
          return;
        }

        const user = await res.json();
        this.user = user;
        this.saveState();
        this.updateUserSessionUI();
        await this.syncTripsWithBackend();
        this.navigateTo('dashboard');
      } catch (err) {
        console.error(err);
        alert('Could not connect to backend server. Make sure the server is running on port 5001.');
      }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.user = null;
      this.saveState();
      this.showAuth(true);
    });

    // Router click captures
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const screenId = item.getAttribute('data-screen');
        this.navigateTo(screenId);
      });
    });

    // Create Trip Submit
    document.getElementById('trip-create-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const newTrip = {
        id: this.editingTripId || 'trip-' + Date.now(),
        name: document.getElementById('trip-name').value,
        budgetLimit: parseFloat(document.getElementById('trip-budget-limit').value),
        startDate: document.getElementById('trip-start-date').value,
        endDate: document.getElementById('trip-end-date').value,
        description: document.getElementById('trip-description').value,
        coverImg: this.selectedPresetCover,
        stops: this.editingTripId ? (this.trips.find(t => t.id === this.editingTripId)?.stops || []) : []
      };

      if (this.editingTripId) {
        const index = this.trips.findIndex(t => t.id === this.editingTripId);
        this.trips[index] = newTrip;
      } else {
        this.trips.push(newTrip);
      }

      this.saveState();
      this.editingTripId = newTrip.id;
      this.navigateTo('itinerary-builder');
    });

    // Add Stop Modal Trigger & Form
    document.getElementById('btn-add-stop').addEventListener('click', () => {
      this.openModal('modal-add-stop');
    });

    document.getElementById('form-modal-add-stop').addEventListener('submit', (e) => {
      e.preventDefault();
      const cityId = document.getElementById('stop-city-select').value;
      const arrival = document.getElementById('stop-arrival-date').value;
      const departure = document.getElementById('stop-departure-date').value;

      const trip = this.trips.find(t => t.id === this.editingTripId);
      if (trip) {
        trip.stops.push({
          cityId,
          arrival,
          departure,
          activities: []
        });
        this.saveState();
        this.closeModal('modal-add-stop');
        this.renderItineraryBuilder();
      }
    });

    // Add Activity Modal Form
    document.getElementById('btn-add-activity').addEventListener('click', () => {
      this.openModal('modal-add-activity');
    });

    document.getElementById('form-modal-add-activity').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('activity-name').value;
      const category = document.getElementById('activity-category').value;
      const cost = parseFloat(document.getElementById('activity-cost').value);
      const date = document.getElementById('activity-date').value;
      const time = document.getElementById('activity-time').value;

      const trip = this.trips.find(t => t.id === this.editingTripId);
      if (trip && this.activeStopIndex !== null) {
        trip.stops[this.activeStopIndex].activities.push({ name, category, cost, date, time });
        this.saveState();
        this.closeModal('modal-add-activity');
        this.renderItineraryBuilder();
      }
    });

    // Connect Edit Stop / View Link triggers
    document.getElementById('btn-view-itinerary').addEventListener('click', () => {
      this.navigateTo('itinerary-view');
    });

    document.getElementById('btn-edit-trip-itinerary').addEventListener('click', () => {
      this.navigateTo('itinerary-builder');
    });

    // Search Controls Search Input Listener
    document.getElementById('search-destinations-input').addEventListener('input', () => {
      this.renderSearch();
    });

    document.getElementById('search-filter-region').addEventListener('change', () => {
      this.renderSearch();
    });

    document.getElementById('search-filter-cost').addEventListener('change', () => {
      this.renderSearch();
    });

    // Mobile navigation toggler
    document.getElementById('mobile-toggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('active');
    });

    // Profile Settings Form
    document.getElementById('profile-settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalEmail = this.user.email;
      const name = document.getElementById('profile-name').value;
      const email = document.getElementById('profile-email').value;
      const language = document.getElementById('profile-language').value;
      const currency = document.getElementById('profile-currency').value;

      if (this.user) {
        try {
          const res = await fetch('http://localhost:5001/api/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Email': originalEmail
            },
            body: JSON.stringify({ name, email, avatar: this.user.avatar, language, currency })
          });

          if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Failed to update profile');
            return;
          }

          const updated = await res.json();
          this.user = updated;
          this.saveState();
          this.updateUserSessionUI();
          alert('Profile details updated successfully!');
        } catch (err) {
          console.error(err);
          alert('Could not update profile on backend.');
        }
      }
    });

    // Profile Settings Delete Account
    document.getElementById('btn-delete-account').addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete your account? This action is permanent.')) {
        if (this.user) {
          try {
            await fetch('http://localhost:5001/api/profile', {
              method: 'DELETE',
              headers: { 'X-User-Email': this.user.email }
            });
          } catch (err) {
            console.error('Failed to delete account on backend:', err);
          }
        }
        this.user = null;
        this.trips = [];
        this.saveState();
        this.showAuth(true);
      }
    });

    // Month controls for Calendar view
    document.getElementById('calendar-prev-month').addEventListener('click', () => {
      this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
      this.renderCalendar();
    });

    document.getElementById('calendar-next-month').addEventListener('click', () => {
      this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
      this.renderCalendar();
    });

    // Admin Sub-Tab Controls
    const adminTabBtns = ['users', 'cities', 'activities', 'trends'];
    adminTabBtns.forEach(tab => {
      const btn = document.getElementById(`admin-tab-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => {
          adminTabBtns.forEach(t => {
            const el = document.getElementById(`admin-tab-${t}`);
            if (el) el.classList.remove('active');
          });
          btn.classList.add('active');
          this.adminTab = tab;
          this.renderAdmin();
        });
      }
    });

    // Admin Search input listener
    const adminSearch = document.getElementById('admin-search-input');
    if (adminSearch) {
      adminSearch.addEventListener('input', () => {
        this.renderAdmin();
      });
    }

    // Admin Actions Buttons
    ['group', 'filter', 'sort'].forEach(action => {
      const btn = document.getElementById(`btn-admin-${action}`);
      if (btn) {
        btn.addEventListener('click', () => {
          alert(`Admin command triggered: ${action.toUpperCase()}`);
        });
      }
    });
  }

  // ==================== DASHBOARD RENDERING ====================
  renderDashboard() {
    // Basic stats calculation
    let totalDestinations = 0;
    let totalBudget = 0;

    this.trips.forEach(t => {
      totalDestinations += t.stops.length;
      t.stops.forEach(s => {
        s.activities.forEach(act => {
          totalBudget += act.cost;
        });
      });
    });

    document.getElementById('stat-total-trips').textContent = this.trips.length;
    document.getElementById('stat-total-destinations').textContent = totalDestinations;
    document.getElementById('stat-total-budget').textContent = `$${totalBudget.toLocaleString()}`;

    // Render Recent Trips list (limit to 3)
    const recentList = document.getElementById('recent-trips-list');
    recentList.innerHTML = '';

    if (this.trips.length === 0) {
      recentList.innerHTML = `
        <div class="placeholder-box" style="padding: 30px;">
          <p>No trips planned yet. Click "Plan New Trip" to get started.</p>
        </div>
      `;
    } else {
      const sorted = [...this.trips].slice(0, 3);
      sorted.forEach(trip => {
        recentList.appendChild(this.createTripCard(trip));
      });
    }

    // Render Trending destination list
    const trendingList = document.getElementById('trending-cities');
    trendingList.innerHTML = '';
    
    CITIES_DB.slice(0, 4).forEach(city => {
      const el = document.createElement('div');
      el.className = 'trending-item';
      el.innerHTML = `
        <img src="${city.img}" class="trending-img" alt="${city.name}">
        <div class="trending-info">
          <h4>${city.name}, ${city.country}</h4>
          <p>${city.description}</p>
        </div>
        <span class="cost-rating">${city.costIndex}</span>
      `;
      trendingList.appendChild(el);
    });
  }

  // ==================== MY TRIPS LIST RENDERING ====================
  renderMyTrips() {
    const list = document.getElementById('full-trips-list');
    list.innerHTML = '';

    const filterVal = document.getElementById('trips-search-input').value.toLowerCase();
    const filtered = this.trips.filter(t => t.name.toLowerCase().includes(filterVal) || t.description.toLowerCase().includes(filterVal));

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="placeholder-box" style="grid-column: 1 / -1;">
          <i data-lucide="compass"></i>
          <p>No matching trips found.</p>
        </div>
      `;
    } else {
      filtered.forEach(trip => {
        list.appendChild(this.createTripCard(trip));
      });
    }
  }

  createTripCard(trip) {
    const card = document.createElement('div');
    card.className = 'trip-card';

    // Calculate total actual cost
    let estCost = 0;
    trip.stops.forEach(s => {
      s.activities.forEach(a => estCost += a.cost);
    });

    card.innerHTML = `
      <div class="trip-card-img" style="background-image: url('${trip.coverImg || PRESETS_COVERS[0]}')">
        <span class="trip-card-badge">${trip.stops.length} Stops</span>
      </div>
      <div class="trip-card-content">
        <h3>${trip.name}</h3>
        <div class="trip-card-dates">
          <i data-lucide="calendar"></i>
          <span>${trip.startDate} to ${trip.endDate}</span>
        </div>
        <p class="trip-card-desc">${trip.description || 'No description provided.'}</p>
        <div class="trip-card-footer">
          <div class="trip-card-budget">
            <span>Est. Cost / Limit</span>
            <span>$${estCost.toLocaleString()} / $${trip.budgetLimit.toLocaleString()}</span>
          </div>
          <div class="trip-card-actions">
            <button class="btn-icon" onclick="app.actionViewTrip('${trip.id}')" title="View Plan"><i data-lucide="eye"></i></button>
            <button class="btn-icon" onclick="app.actionEditTrip('${trip.id}')" title="Edit Plan"><i data-lucide="edit"></i></button>
            <button class="btn-icon danger" onclick="app.actionDeleteTrip('${trip.id}')" title="Delete Plan"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      </div>
    `;
    return card;
  }

  actionViewTrip(id) {
    this.editingTripId = id;
    this.navigateTo('itinerary-view');
  }

  actionEditTrip(id) {
    this.editingTripId = id;
    const trip = this.trips.find(t => t.id === id);
    if (trip) {
      document.getElementById('trip-name').value = trip.name;
      document.getElementById('trip-budget-limit').value = trip.budgetLimit;
      document.getElementById('trip-start-date').value = trip.startDate;
      document.getElementById('trip-end-date').value = trip.endDate;
      document.getElementById('trip-description').value = trip.description;
      this.selectedPresetCover = trip.coverImg;
      this.selectPresetCoverEl(trip.coverImg);
    }
    this.navigateTo('create-trip');
  }

  async actionDeleteTrip(id) {
    if (confirm('Are you sure you want to delete this trip itinerary?')) {
      this.trips = this.trips.filter(t => t.id !== id);
      if (this.user) {
        try {
          await fetch(`http://localhost:5001/api/trips/${id}`, {
            method: 'DELETE',
            headers: { 'X-User-Email': this.user.email }
          });
        } catch (err) {
          console.error('Failed to delete trip from backend:', err);
        }
      }
      this.saveState();
      this.refreshScreenData(this.currentScreen);
    }
  }

  // ==================== ITINERARY BUILDER ====================
  renderItineraryBuilder() {
    const trip = this.trips.find(t => t.id === this.editingTripId);
    if (!trip) {
      this.navigateTo('dashboard');
      return;
    }

    document.getElementById('builder-trip-name').textContent = `Build Itinerary: ${trip.name}`;
    document.getElementById('builder-trip-dates').textContent = `Dates: ${trip.startDate} to ${trip.endDate}`;

    // Render Stops Column
    const stopsList = document.getElementById('builder-stops-list');
    stopsList.innerHTML = '';

    if (trip.stops.length === 0) {
      stopsList.innerHTML = `
        <div class="placeholder-box" style="padding: 20px;">
          <p>No travel stops added yet. Click "Add Stop" above.</p>
        </div>
      `;
      this.activeStopIndex = null;
      this.toggleActivityColumn(false);
    } else {
      if (this.activeStopIndex === null || this.activeStopIndex >= trip.stops.length) {
        this.activeStopIndex = 0;
      }
      this.toggleActivityColumn(true);

      trip.stops.forEach((stop, index) => {
        const cityInfo = CITIES_DB.find(c => c.id === stop.cityId);
        const card = document.createElement('div');
        card.className = `stop-card ${this.activeStopIndex === index ? 'active' : ''}`;
        card.innerHTML = `
          <h4>${cityInfo ? cityInfo.name : 'Unknown City'}</h4>
          <p>${stop.arrival} to ${stop.departure}</p>
          <button class="stop-card-delete" onclick="event.stopPropagation(); app.deleteStop(${index})">
            <i data-lucide="trash-2"></i>
          </button>
        `;
        card.addEventListener('click', () => {
          this.activeStopIndex = index;
          this.renderItineraryBuilder();
        });
        stopsList.appendChild(card);
      });
    }

    // Render Activities Column
    this.renderBuilderActivities();
  }

  toggleActivityColumn(active) {
    const placeholder = document.getElementById('no-stop-placeholder');
    const actList = document.getElementById('builder-activities-list');
    const addActBtn = document.getElementById('btn-add-activity');

    if (active) {
      placeholder.classList.add('hidden');
      actList.classList.remove('hidden');
      addActBtn.removeAttribute('disabled');
    } else {
      placeholder.classList.remove('hidden');
      actList.classList.add('hidden');
      addActBtn.setAttribute('disabled', 'true');
    }
  }

  renderBuilderActivities() {
    const trip = this.trips.find(t => t.id === this.editingTripId);
    if (!trip || this.activeStopIndex === null) return;

    const stop = trip.stops[this.activeStopIndex];
    const cityInfo = CITIES_DB.find(c => c.id === stop.cityId);
    document.getElementById('builder-active-stop-name').textContent = cityInfo ? cityInfo.name : 'Selected Stop';

    const list = document.getElementById('builder-activities-list');
    list.innerHTML = '';

    if (stop.activities.length === 0) {
      list.innerHTML = `
        <div class="placeholder-box" style="padding: 30px;">
          <p>No activities scheduled yet. Click "Add Activity" to plan your day.</p>
        </div>
      `;
    } else {
      stop.activities.forEach((act, actIndex) => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="act-meta">
            <div class="act-icon ${act.category}">
              <i data-lucide="${this.getCategoryIcon(act.category)}"></i>
            </div>
            <div class="act-info">
              <h4>${act.name}</h4>
              <p>${act.date} | Start: ${act.time}</p>
            </div>
          </div>
          <div class="act-cost-action">
            <span class="act-price">$${act.cost}</span>
            <button class="btn-icon danger btn-sm" onclick="app.deleteActivity(${actIndex})">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `;
        list.appendChild(item);
      });
    }
  }

  deleteStop(index) {
    const trip = this.trips.find(t => t.id === this.editingTripId);
    if (trip) {
      trip.stops.splice(index, 1);
      this.saveState();
      this.activeStopIndex = null;
      this.renderItineraryBuilder();
    }
  }

  deleteActivity(actIndex) {
    const trip = this.trips.find(t => t.id === this.editingTripId);
    if (trip && this.activeStopIndex !== null) {
      trip.stops[this.activeStopIndex].activities.splice(actIndex, 1);
      this.saveState();
      this.renderItineraryBuilder();
    }
  }

  getCategoryIcon(category) {
    switch (category) {
      case 'transport': return 'train';
      case 'lodging': return 'hotel';
      case 'meals': return 'utensils';
      default: return 'map';
    }
  }

  // ==================== ITINERARY VIEW & BUDGET RENDERING ====================
  renderItineraryView() {
    const trip = this.trips.find(t => t.id === this.editingTripId);
    if (!trip) {
      this.navigateTo('dashboard');
      return;
    }

    document.getElementById('view-trip-name').textContent = trip.name;
    document.getElementById('view-trip-dates').textContent = `${trip.startDate} to ${trip.endDate}`;

    // Calculate Costs and breakdowns
    let totalCost = 0;
    let transportCost = 0;
    let lodgingCost = 0;
    let activitiesCost = 0;
    let mealsCost = 0;

    trip.stops.forEach(s => {
      s.activities.forEach(a => {
        totalCost += a.cost;
        if (a.category === 'transport') transportCost += a.cost;
        else if (a.category === 'lodging') lodgingCost += a.cost;
        else if (a.category === 'meals') mealsCost += a.cost;
        else activitiesCost += a.cost;
      });
    });

    document.getElementById('budget-total-cost').textContent = `$${totalCost.toLocaleString()}`;
    document.getElementById('budget-limit-value').textContent = `$${trip.budgetLimit.toLocaleString()}`;
    
    // Progress Bar Fill
    const pct = Math.min((totalCost / trip.budgetLimit) * 100, 100);
    const fillEl = document.getElementById('budget-progress-bar');
    fillEl.style.width = `${pct}%`;
    if (totalCost > trip.budgetLimit) {
      fillEl.style.background = 'var(--danger)';
      document.getElementById('overbudget-alert').classList.remove('hidden');
      document.getElementById('overbudget-amount').textContent = `$${(totalCost - trip.budgetLimit).toLocaleString()}`;
    } else {
      fillEl.style.background = 'var(--grad-primary)';
      document.getElementById('overbudget-alert').classList.add('hidden');
    }

    // Cost Breakdown update
    document.getElementById('breakdown-transport').textContent = `$${transportCost}`;
    document.getElementById('breakdown-lodging').textContent = `$${lodgingCost}`;
    document.getElementById('breakdown-activities').textContent = `$${activitiesCost}`;
    document.getElementById('breakdown-meals').textContent = `$${mealsCost}`;

    // Custom Chart conic gradient representation
    const donutChart = document.getElementById('budget-donut-chart');
    document.getElementById('donut-center-pct').textContent = `${Math.round(pct)}%`;
    
    if (totalCost > 0) {
      const transPct = (transportCost / totalCost) * 360;
      const lodgPct = (lodgingCost / totalCost) * 360;
      const actPct = (activitiesCost / totalCost) * 360;
      
      const val1 = transPct;
      const val2 = val1 + lodgPct;
      const val3 = val2 + actPct;
      
      donutChart.style.background = `conic-gradient(
        #3B82F6 0deg ${val1}deg,
        var(--secondary) ${val1}deg ${val2}deg,
        var(--primary) ${val2}deg ${val3}deg,
        var(--warning) ${val3}deg 360deg
      )`;
    } else {
      donutChart.style.background = `rgba(255,255,255,0.06)`;
    }

    // Render Timeline View list
    const timelineContent = document.getElementById('trip-timeline-content');
    timelineContent.innerHTML = '';

    if (trip.stops.length === 0) {
      timelineContent.innerHTML = `
        <div class="placeholder-box">
          <p>No cities added to the plan yet.</p>
        </div>
      `;
    } else {
      trip.stops.forEach(stop => {
        const cityInfo = CITIES_DB.find(c => c.id === stop.cityId);
        const block = document.createElement('div');
        block.className = 'timeline-stop-block';
        block.innerHTML = `
          <h3>${cityInfo ? cityInfo.name : 'Unknown City'}</h3>
          <p class="stop-sub">Arrival: ${stop.arrival} | Departure: ${stop.departure}</p>
          <div class="timeline-items">
            ${stop.activities.length === 0 ? '<p style="font-size:0.9rem; color:var(--text-muted);">No activities scheduled for this stop.</p>' : ''}
            ${stop.activities.map(act => `
              <div class="timeline-item">
                <span class="timeline-dot"></span>
                <div class="timeline-content">
                  <div>
                    <strong>${act.name}</strong>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Time: ${act.time} | Date: ${act.date}</p>
                  </div>
                  <span style="font-weight:700;">$${act.cost}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        timelineContent.appendChild(block);
      });
    }
  }

  // ==================== SEARCH SCREEN RENDERING ====================
  renderSearch() {
    const container = document.getElementById('search-results-container');
    container.innerHTML = '';

    const query = document.getElementById('search-destinations-input').value.toLowerCase();
    const region = document.getElementById('search-filter-region').value;
    const cost = document.getElementById('search-filter-cost').value;

    const filtered = CITIES_DB.filter(city => {
      const matchQ = city.name.toLowerCase().includes(query) || city.country.toLowerCase().includes(query) || city.description.toLowerCase().includes(query);
      const matchR = region === '' || city.region === region;
      const matchC = cost === '' || city.costIndex === cost;
      return matchQ && matchR && matchC;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="placeholder-box" style="grid-column: 1 / -1;">
          <p>No matching cities found. Try another search filter.</p>
        </div>
      `;
    } else {
      filtered.forEach(city => {
        const card = document.createElement('div');
        card.className = 'city-search-card';
        card.innerHTML = `
          <div class="city-search-img" style="background-image: url('${city.img}')"></div>
          <div class="city-search-body">
            <div>
              <h3>${city.name}, ${city.country}</h3>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">${city.description}</p>
              <div class="city-meta-tags">
                <span class="badge badge-success">${city.costIndex} Cost</span>
                <span class="badge badge-warning">${city.popularity} Popular</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-block btn-sm" onclick="app.searchAddCity('${city.id}')">
              <i data-lucide="plus"></i> Add to Active Trip
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    }
  }

  searchAddCity(cityId) {
    if (this.trips.length === 0) {
      alert('Please create a trip first from the Dashboard before adding stops.');
      this.navigateTo('create-trip');
      return;
    }

    if (!this.editingTripId) {
      this.editingTripId = this.trips[0].id;
    }

    const trip = this.trips.find(t => t.id === this.editingTripId);
    if (trip) {
      trip.stops.push({
        cityId,
        arrival: trip.startDate,
        departure: trip.endDate,
        activities: []
      });
      this.saveState();
      alert(`Added stops in ${CITIES_DB.find(c => c.id === cityId).name} to "${trip.name}"!`);
      this.navigateTo('itinerary-builder');
    }
  }

  // ==================== CALENDAR RENDERING ====================
  renderCalendar() {
    const daysContainer = document.getElementById('calendar-days-container');
    if (!daysContainer) return;
    daysContainer.innerHTML = '';

    const dateLabel = document.getElementById('calendar-month-year');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    dateLabel.textContent = `${months[month]} ${year}`;

    // Get first day of the month
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Render empty slots
    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day empty';
      daysContainer.appendChild(cell);
    }

    // Render actual days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.innerHTML = `<span class="day-number">${day}</span>`;

      // Check if any trip overlaps this day
      const currentCellDate = new Date(year, month, day);
      
      this.trips.forEach(trip => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        
        // Remove time factor for simple comparison
        currentCellDate.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        if (currentCellDate >= start && currentCellDate <= end) {
          const tag = document.createElement('div');
          tag.className = 'calendar-trip-tag';
          tag.textContent = trip.name;
          tag.title = trip.name;
          cell.appendChild(tag);
        }
      });

      daysContainer.appendChild(cell);
    }
  }

  // ==================== COMMUNITY SCREEN ====================
  renderCommunityTrips() {
    const container = document.getElementById('community-itineraries-container');
    if (!container) return;
    container.innerHTML = '';

    COMMUNITY_TRIPS.forEach(comm => {
      const card = document.createElement('div');
      card.className = 'trip-card';
      card.innerHTML = `
        <div class="trip-card-img" style="background-image: url('${comm.img}')">
          <span class="trip-card-badge">${comm.stopsCount} Cities</span>
        </div>
        <div class="trip-card-content">
          <h3>${comm.name}</h3>
          <p style="font-size:0.8rem; color:var(--secondary); margin-bottom:8px;">Shared by: @${comm.creator}</p>
          <p class="trip-card-desc">${comm.description}</p>
          <div class="trip-card-footer">
            <div class="trip-card-budget">
              <span>Duration / Est. Cost</span>
              <span>${comm.duration} Days / $${comm.cost}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="app.actionViewCommunityTrip('${comm.id}')">
              Explore Plan
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  actionViewCommunityTrip(commId) {
    const comm = COMMUNITY_TRIPS.find(c => c.id === commId);
    if (!comm) return;

    this.currentSharedTrip = comm;

    document.getElementById('shared-trip-name').textContent = comm.name;
    document.getElementById('shared-trip-creator').textContent = `Created by: @${comm.creator}`;
    document.getElementById('shared-total-cost').textContent = `$${comm.cost}`;
    document.getElementById('shared-total-duration').textContent = `${comm.duration} Days`;
    document.getElementById('shared-total-stops').textContent = `${comm.stopsCount} Stops`;

    // Render timeline
    const timelineContent = document.getElementById('shared-timeline-content');
    timelineContent.innerHTML = '';

    comm.stops.forEach(stop => {
      const cityInfo = CITIES_DB.find(c => c.id === stop.cityId);
      const block = document.createElement('div');
      block.className = 'timeline-stop-block';
      block.innerHTML = `
        <h3>${cityInfo ? cityInfo.name : 'Unknown City'}</h3>
        <p class="stop-sub">Planned stops</p>
        <div class="timeline-items">
          ${stop.activities.map(act => `
            <div class="timeline-item">
              <span class="timeline-dot"></span>
              <div class="timeline-content">
                <div>
                  <strong>${act.name}</strong>
                </div>
                <span style="font-weight:700;">$${act.cost}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      timelineContent.appendChild(block);
    });

    // Hook copy trip button
    document.getElementById('btn-copy-shared-trip').onclick = () => {
      const newTrip = {
        id: 'trip-' + Date.now(),
        name: `Copy of: ${comm.name}`,
        budgetLimit: comm.cost + 1000,
        startDate: '2026-08-10',
        endDate: '2026-08-22',
        description: `Imported from @${comm.creator}'s community itinerary.`,
        coverImg: comm.img,
        stops: JSON.parse(JSON.stringify(comm.stops)) // deep copy
      };
      
      this.trips.push(newTrip);
      this.saveState();
      alert(`Copied trip: "${newTrip.name}" successfully to your dashboard!`);
      this.navigateTo('my-trips');
    };

    this.navigateTo('shared-view');
  }

  // ==================== USER PROFILE RENDERING ====================
  renderProfile() {
    document.getElementById('profile-name').value = this.user.name;
    document.getElementById('profile-email').value = this.user.email;
    document.getElementById('profile-language').value = this.user.language;
    document.getElementById('profile-currency').value = this.user.currency;
    if (this.user.avatar) {
      document.getElementById('profile-avatar-preview').src = this.user.avatar;
    }

    const savedContainer = document.getElementById('saved-destinations-container');
    savedContainer.innerHTML = '';

    if (!this.user.savedDestinations || this.user.savedDestinations.length === 0) {
      savedContainer.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">No saved destinations yet.</p>`;
    } else {
      this.user.savedDestinations.forEach(cityId => {
        const city = CITIES_DB.find(c => c.id === cityId);
        if (city) {
          const el = document.createElement('div');
          el.className = 'trending-item';
          el.innerHTML = `
            <img src="${city.img}" class="trending-img" alt="${city.name}">
            <div class="trending-info">
              <h4>${city.name}</h4>
              <p>${city.country}</p>
            </div>
            <button class="btn-icon danger btn-sm" onclick="app.removeSavedDestination('${cityId}')">
              &times;
            </button>
          `;
          savedContainer.appendChild(el);
        }
      });
    }
  }

  removeSavedDestination(cityId) {
    this.user.savedDestinations = this.user.savedDestinations.filter(id => id !== cityId);
    this.saveState();
    this.renderProfile();
  }

  // ==================== PRESET COVERS IMAGE SELECTION ====================
  renderPresetCovers() {
    const grid = document.getElementById('cover-presets-grid');
    grid.innerHTML = '';
    
    PRESETS_COVERS.forEach((url, i) => {
      const opt = document.createElement('div');
      opt.className = `preset-option ${url === this.selectedPresetCover ? 'selected' : ''}`;
      opt.style.backgroundImage = `url('${url}')`;
      opt.addEventListener('click', () => {
        this.selectedPresetCover = url;
        this.selectPresetCoverEl(url);
      });
      grid.appendChild(opt);
    });
  }

  selectPresetCoverEl(selectedUrl) {
    document.querySelectorAll('.preset-option').forEach(el => {
      const styleBg = el.style.backgroundImage;
      if (styleBg.includes(selectedUrl)) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  // ==================== CITIES SELECT DROP DOWN POPULATING ====================
  populateCityDropdowns() {
    const select = document.getElementById('stop-city-select');
    select.innerHTML = '';
    CITIES_DB.forEach(city => {
      const opt = document.createElement('option');
      opt.value = city.id;
      opt.textContent = `${city.name} (${city.country})`;
      select.appendChild(opt);
    });
  }

  // ==================== MODAL HELPER HANDLERS ====================
  openModal(id) {
    document.getElementById(id).classList.add('active');
  }

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  // ==================== ADMIN PANEL RENDERING ====================
  renderAdmin() {
    const container = document.getElementById('admin-content-container');
    if (!container) return;
    container.innerHTML = '';

    const query = document.getElementById('admin-search-input') ? document.getElementById('admin-search-input').value.toLowerCase() : '';

    if (this.adminTab === 'users') {
      // Render Manage Users Table
      const filteredUsers = this.usersDb.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query) || u.role.toLowerCase().includes(query));
      
      let tableHtml = `
        <div class="admin-table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Trips Planned</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      if (filteredUsers.length === 0) {
        tableHtml += `
          <tr>
            <td colspan="6" style="text-align:center; color:var(--text-muted); padding:32px;">No users matching search query.</td>
          </tr>
        `;
      } else {
        filteredUsers.forEach(u => {
          tableHtml += `
            <tr>
              <td>
                <div class="admin-user-cell">
                  <img src="${u.avatar}" class="admin-avatar" alt="${u.name}">
                  <div>
                    <strong>${u.name}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${u.email}</div>
                  </div>
                </div>
              </td>
              <td><span class="badge admin-badge-role">${u.role}</span></td>
              <td><span class="badge ${u.status === 'Active' ? 'badge-success' : 'badge-warning'}">${u.status}</span></td>
              <td><strong>${u.tripsCount}</strong> Trips</td>
              <td>${u.joined}</td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-secondary btn-sm" onclick="alert('Viewing all trips for ${u.name}...')" style="padding:4px 8px; font-size:0.75rem;"><i data-lucide="eye" style="width:12px; height:12px; margin-right:4px;"></i> View Trips</button>
                  <button class="btn btn-danger-outline btn-sm" onclick="app.adminToggleBlockUser('${u.id}')" style="padding:4px 8px; font-size:0.75rem;"><i data-lucide="${u.status === 'Active' ? 'ban' : 'check'}" style="width:12px; height:12px; margin-right:4px;"></i> ${u.status === 'Active' ? 'Block' : 'Unblock'}</button>
                </div>
              </td>
            </tr>
          `;
        });
      }
      
      tableHtml += `
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = tableHtml;

    } else if (this.adminTab === 'cities') {
      // Render Popular Cities
      const filteredCities = CITIES_DB.filter(c => c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query));
      
      let citiesHtml = `<div class="search-results-grid" style="margin-top:20px;">`;
      filteredCities.forEach(city => {
        // compute popularity count based on active trips stops
        let count = 0;
        this.trips.forEach(t => {
          t.stops.forEach(s => {
            if (s.cityId === city.id) count++;
          });
        });
        // add mock trend factor
        count += (city.id === 'paris' ? 14 : city.id === 'london' ? 9 : 4);
        
        citiesHtml += `
          <div class="city-search-card">
            <div class="city-search-img" style="background-image: url('${city.img}')"></div>
            <div class="city-search-body">
              <div>
                <h3>${city.name}, ${city.country}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">${city.description}</p>
                <div class="city-meta-tags" style="margin-top:12px;">
                  <span class="badge badge-success">${city.costIndex} Cost Index</span>
                  <span class="badge badge-warning" style="background:rgba(139, 92, 246, 0.15); color:var(--primary);">${count} Active Bookings</span>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      citiesHtml += `</div>`;
      container.innerHTML = citiesHtml;

    } else if (this.adminTab === 'activities') {
      // Popular Activities listing
      const allActs = [
        { name: 'Louvre Museum Tour', city: 'Paris', category: 'activities', bookings: 24, cost: 45 },
        { name: 'Eiffel Tower Access', city: 'Paris', category: 'activities', bookings: 42, cost: 36 },
        { name: 'London Eye Flight', city: 'London', category: 'activities', bookings: 18, cost: 35 },
        { name: 'Vatican Museum Guided Tour', city: 'Rome', category: 'activities', bookings: 15, cost: 55 },
        { name: 'Shibuya Crossing Photo Walk', city: 'Tokyo', category: 'activities', bookings: 31, cost: 25 },
        { name: 'Broadway Show Tickets', city: 'New York', category: 'activities', bookings: 12, cost: 110 }
      ];
      
      const filteredActs = allActs.filter(a => a.name.toLowerCase().includes(query) || a.city.toLowerCase().includes(query));
      
      let actsHtml = `<div class="activities-list" style="margin-top:20px;">`;
      filteredActs.forEach(act => {
        actsHtml += `
          <div class="activity-item">
            <div class="act-meta">
              <div class="act-icon ${act.category}">
                <i data-lucide="map"></i>
              </div>
              <div class="act-info">
                <h4>${act.name}</h4>
                <p>Location: ${act.city} | Cost: $${act.cost}</p>
              </div>
            </div>
            <div class="act-cost-action">
              <span class="badge badge-success" style="background:rgba(20, 184, 166, 0.15); color:var(--secondary);">${act.bookings} Booked Times</span>
            </div>
          </div>
        `;
      });
      actsHtml += `</div>`;
      container.innerHTML = actsHtml;

    } else if (this.adminTab === 'trends') {
      // Trends & Analytics
      container.innerHTML = `
        <div class="admin-analytics-grid">
          
          <div class="admin-chart-card">
            <h3>Monthly Registrations</h3>
            <div class="bar-chart-container">
              <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height: 40%">
                  <span class="chart-bar-value">120</span>
                </div>
                <span class="chart-bar-label">May</span>
              </div>
              <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height: 65%">
                  <span class="chart-bar-value">210</span>
                </div>
                <span class="chart-bar-label">Jun</span>
              </div>
              <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height: 85%">
                  <span class="chart-bar-value">340</span>
                </div>
                <span class="chart-bar-label">Jul</span>
              </div>
              <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height: 100%">
                  <span class="chart-bar-value">480</span>
                </div>
                <span class="chart-bar-label">Aug</span>
              </div>
            </div>
          </div>

          <div class="admin-chart-card">
            <h3>Daily Active Travelers</h3>
            <svg class="line-chart-svg" viewBox="0 0 400 160">
              <line x1="0" y1="40" x2="400" y2="40" class="line-chart-grid" stroke="rgba(255,255,255,0.08)"/>
              <line x1="0" y1="80" x2="400" y2="80" class="line-chart-grid" stroke="rgba(255,255,255,0.08)"/>
              <line x1="0" y1="120" x2="400" y2="120" class="line-chart-grid" stroke="rgba(255,255,255,0.08)"/>
              <path d="M 30 140 L 90 110 L 150 120 L 210 80 L 270 50 L 330 70 L 370 30" class="line-chart-line" stroke="var(--primary)" fill="none" stroke-width="3"/>
              <circle cx="30" cy="140" r="5" class="line-chart-dot" title="Day 1: 15 users" fill="var(--secondary)"/>
              <circle cx="90" cy="110" r="5" class="line-chart-dot" title="Day 2: 24 users" fill="var(--secondary)"/>
              <circle cx="150" cy="120" r="5" class="line-chart-dot" title="Day 3: 20 users" fill="var(--secondary)"/>
              <circle cx="210" cy="80" r="5" class="line-chart-dot" title="Day 4: 42 users" fill="var(--secondary)"/>
              <circle cx="270" cy="50" r="5" class="line-chart-dot" title="Day 5: 60 users" fill="var(--secondary)"/>
              <circle cx="330" cy="70" r="5" class="line-chart-dot" title="Day 6: 48 users" fill="var(--secondary)"/>
              <circle cx="370" cy="30" r="5" class="line-chart-dot" title="Day 7: 85 users" fill="var(--secondary)"/>
            </svg>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:12px;">Active logins peaked during Euro Summer events on Day 5 & 7.</p>
          </div>

          <div class="admin-chart-card">
            <h3>Trip Type Distributions</h3>
            <div style="display:flex; justify-content:space-around; align-items:center; width:100%; margin-top:20px;">
              <div class="custom-donut-chart" style="width:130px; height:130px; background:conic-gradient(var(--primary) 0% 50%, var(--secondary) 50% 80%, var(--warning) 80% 100%);">
                <div class="donut-center" style="width:96px; height:96px;">
                  <strong style="font-size:1.1rem;">64 Total</strong>
                  <span style="font-size:0.65rem; color:var(--text-muted)">Created</span>
                </div>
              </div>
              <div style="text-align:left; font-size:0.85rem; display:flex; flex-direction:column; gap:6px;">
                <div><span class="bullet activities"></span> 50% Sightseeing</div>
                <div><span class="bullet lodging"></span> 30% Adventure</div>
                <div><span class="bullet meals"></span> 20% Beach Resort</div>
              </div>
            </div>
          </div>

        </div>
      `;
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  async adminToggleBlockUser(userId) {
    const user = this.usersDb.find(u => u.id === userId);
    if (user) {
      const newStatus = user.status === 'Active' ? 'Blocked' : 'Active';
      if (this.user) {
        try {
          const res = await fetch(`http://localhost:5001/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Email': this.user.email
            },
            body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
            const updated = await res.json();
            user.status = updated.status;
          } else {
            const errData = await res.json();
            alert('Failed to update status: ' + errData.error);
            return;
          }
        } catch (err) {
          console.error(err);
          alert('Failed to update status on backend.');
          return;
        }
      } else {
        user.status = newStatus;
      }
      this.saveState();
      this.renderAdmin();
    }
  }
}

// Instantiate App
const app = new GlobeTrotterApp();
window.app = app;
