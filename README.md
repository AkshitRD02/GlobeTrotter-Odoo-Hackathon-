# 🌍 GlobeTrotter - Intelligent Multi-City Travel Planner

GlobeTrotter is a premium web application designed to help travel enthusiasts plan, customize, and manage multi-city trip itineraries. Featuring a sleek modern glassmorphic interface, interactive calendar planning, budget tracking, and an administrative control panel, it offers a complete environment for travel coordination.

---

## 🚀 Live Demo
🌐 **Demo Link:** [Insert your deployed Vercel link here!] (e.g. `https://your-globetrotter-demo.vercel.app`)

---

## ✨ Features
* **Authentication & Sync**: Custom registration with profile picture upload (local file reader or presets) and credential verification to sync itineraries across devices.
* **Intelligent Itinerary Builder**: Add/remove multi-city stops, specify arrival/departure dates, and structure granular daily activities (tours, transit, meals).
* **Smart Budget Calculator**: Real-time aggregation of expenses across all stops compared against your preset trip budget.
* **Visual Travel Calendar**: An interactive monthly travel calendar showing planned travel periods and activities visually.
* **Admin Dashboard**: Manage user statuses, track global itineraries, and block/unblock accounts.

---

## 🛠️ Tech Stack
* **Frontend**: HTML5, Semantic CSS3 (Glassmorphism design language), Vanilla Javascript (ES6 Core router)
* **Backend**: Node.js, Express.js
* **Database**: Server-side JSON Database (`database.json`) for zero-dependency local configuration and setup

---

## ⚙️ How to Setup & Run Locally

### 1. Start the Backend API Server
1. Open your terminal and navigate to the project directory:
   ```bash
   cd GlobeTrotter
   ```
2. Install the required Node.js modules:
   ```bash
   npm install
   ```
3. Boot up the API server:
   ```bash
   npm start
   ```
   The backend will start running locally at `http://localhost:5001`.

### 2. Launch the Web Interface
Simply **double-click the `index.html` file** to open the user interface in your web browser, or use a local development server like Live Server in VS Code.

---

## 🔑 Test Credentials (Mock Accounts)
You can test the system with these pre-seeded test accounts:

### 👤 Administrator Account
* **Username / Email**: `admin` (or `admin@globetrotter.com`)
* **Password**: `admin`
*(Grants access to the special "Admin Panel" sidebar tab to block/unblock accounts)*

### 👤 Demo User Account
* **Email**: `jane.doe@example.com`
* **Password**: `password123`
