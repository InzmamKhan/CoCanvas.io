# 🎨 CoCanvas.io
*A real-time collaborative sketch whiteboard platform built for seamless concurrent brainstorming with minimal white neumorphic aesthetics.*

---

## Quick Links
- **Client Application (Frontend)**: `frontend/`
- **Server Gateway (Backend)**: `backend/`
- **Frontend Environment Config**: `frontend/.env`
- **Backend Environment Config**: `backend/.env`
- **Database Schemas & Models**: `backend/src/models/`
- **WebSocket Protocol Service**: `backend/src/services/websocket.service.js`

---

## Brief Description
CoCanvas.io is a lightweight, low-latency collaborative digital canvas designed to eliminate setup friction in fast-paced brainstorming meetings. Designed with an ultra-clean White Neumorphic visual language, it provides an intuitive MS Paint-inspired vector drawing toolkit where up to five team members can sketch, annotate, and iterate together simultaneously. Rooms are ephemeral and self-governing, featuring auto-generated credentials, real-time sync, and automated lifecycle destruction routines.

---

## Key Features
- **White Neumorphic Design Language**: Custom soft-shadow design tokens providing inset and elevated tactile interactive surfaces without visual clutter.
- **Unique Identity Generation**: Automated allocation of custom format User IDs (`USR_XXXXXX`) alongside guaranteed-unique usernames and password hashing.
- **Dynamic Welcome Generator**: Client landing view picks contextual greeting phrases dynamically from a dedicated hardcoded bank of welcome hooks.
- **Dual Security Room Architecture**: Instant public access rooms or private secured rooms protected by auto-generated 5-character high-entropy alphanumeric passwords (`[A-Z0-9]`).
- **Interactive Security Eye Switcher**: Header room monitor featuring a toggleable eye control to instantly reveal or obscure private credentials during presentations or streams.
- **MS Paint-Grade Vector Drawing Suite**:
  - Freehand precision pencil with sub-pixel interpolation.
  - Multi-thickness smooth brush strokes.
  - White-flood eraser calibrated to canvas base illumination.
  - Geometry generators: straight single-axis lines, directional indicator arrows, rectangles, and ellipses/circles.
  - Interior shape filling toggle (`Outline` vs `Filled`).
  - Inline absolute-positioned Canvas text annotation engine.
  - 20-swatch classic Microsoft Paint palette strip plus native color-depth selector.
  - Local and network-synced step-wise Undo and Redo stacks.
  - Whiteboard flush routine and client-side high-resolution PNG image export.
- **Strict Capacity Enforcer**: Hard server-level cap restricting active socket clients to exactly five peers per canvas instance.
- **Automated Lifecycle Self-Destruction**: Real-time departure tracking of the host. If the session owner disconnects, an automated 10-second synchronized destruction sequence fires across peers before database and cache purging.

---

## Architecture & System Design

The platform uses a decoupled dual-tier architecture adhering to strict Model-View-Controller (MVC) separation on the backend and single-directional reactive state flows on the frontend.

### 1. Architectural Directory Layout
```
CoCanvas.io/
├── backend/                       # REST API & WebSocket Server (MVC Architecture)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Mongoose database bootstrapper with memory fallback
│   │   ├── models/                # Persistence Schemas
│   │   │   ├── user.model.js      # User identity & authentication schema
│   │   │   └── room.model.js      # Room metadata & serialized canvas state schema
│   │   ├── controllers/           # HTTP Request Handlers
│   │   │   ├── auth.controller.js # Sign-up, identity hashing, session tokens
│   │   │   └── room.controller.js # Room initialization, credential verification
│   │   ├── middlewares/
│   │   │   └── auth.middleware.js # JSON Web Token signature verification
│   │   ├── routes/                # Endpoint Declarations
│   │   │   ├── auth.routes.js     # /api/auth routes
│   │   │   └── room.routes.js     # /api/rooms routes
│   │   ├── services/              # Core Business & Communication Logic
│   │   │   ├── websocket.service.js# Socket hub, message router, teardown timers
│   │   │   └── memoryStore.js     # Low-latency RAM store & local fallback engine
│   │   └── server.js              # Node.js HTTP + WS gateway orchestrator
│   └── package.json
│
└── frontend/                      # React 18 Single Page Application
    ├── src/
    │   ├── styles/
    │   │   └── neumorphic.css     # CSS custom properties, bevel & drop shadow tokens
    │   ├── services/
    │   │   ├── api.js             # Fetch wrapper with bearer token auto-injection
    │   │   ├── AuthContext.jsx    # React Context authenticating global user state
    │   │   └── websocket.js       # Client WebSocket connection lifecycle manager
    │   ├── components/            # Isolated Reusable Views & Modals
    │   │   ├── AuthModal.jsx      # Login and Registration modal
    │   │   ├── CreateRoomModal.jsx# Room creation, security mode selector
    │   │   └── JoinRoomModal.jsx  # Room ID & credential verification entry
    │   ├── pages/
    │   │   ├── HomePage.jsx       # Greeting hook view & room launchpad
    │   │   └── CanvasRoomPage.jsx # HTML5 Canvas, toolbars, participant monitor
    │   ├── App.jsx                # View router & session guard
    │   └── main.jsx               # React DOM entry point
    ├── vite.config.js
    └── package.json
```

### 2. Database Schema Design (MongoDB Atlas)

The persistent store is intentionally normalized into two core relational collections:

#### User Info Table (`User` Collection)
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `userid` | String | Unique, Indexed, Required | System-generated unique identifier (`USR_XXXXXX`) |
| `username` | String | Unique, Indexed, Required, Trimmed | Unique user display alias |
| `email` | String | Unique, Indexed, Required, Lowercase | Unique registered contact email address |
| `password` | String | Required | 10-round salted bcrypt password hash |
| `createdAt` | Date | Auto-generated | Account creation ISO timestamp |
| `updatedAt` | Date | Auto-generated | Account modification ISO timestamp |

#### Room Info Table (`Room` Collection)
| Field | Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `roomid` | String | Unique, Indexed, Required | System-generated room identifier (`ROOM-XXXXXX`) |
| `roomname` | String | Required, Trimmed | Human-readable room title |
| `roomHostid` | String | Indexed, Required | `userid` of the room creator |
| `roomHostName` | String | Optional | Cached display name of the room creator |
| `isPrivate` | Boolean | Default: `false` | Access model indicator (Public vs Private) |
| `password` | String | Default: `""` | 5-character high-entropy alphanumeric key (if Private) |
| `roomCreatedOnDate` | String | Required | Creation calendar date (`MMM DD, YYYY`) |
| `roomCreatedOnTime` | String | Required | Creation system clock time (`HH:MM:SS AM/PM`) |
| `canvasState` | Array | Default: `[]` | Serialized array of vector elements for cold joins |

### 3. Server Concurrency & Teardown Architecture
The backend maintains an active runtime registry (`Map<roomid, RoomSession>`). Each session maintains:
- A client registry map mapping `userid` to socket connections, flags, and names.
- An in-memory serialized vector stack ensuring instant zero-delay delta broadcasts without blocking on database disk writes.
- A debounced persistence worker committing elements to MongoDB Atlas asynchronously.
- A 10-second hardware timer triggered on host socket disconnect events. If the host reconnects before expiration, the destruction timer is cleared and peers receive a `DESTRUCTION_CANCELLED` message; otherwise, a `ROOM_DESTROYED` frame issues, remaining sockets terminate cleanly, and room documents are deleted from MongoDB Atlas.

---

## Data Flow

### Authentication & Room Provisioning Flow (HTTP / REST)

```
[User Browser]
      |
      |-- 1. POST /api/auth/register (username, email, password)
      v
[Express Controller: auth.controller.js]
      |
      |-- 2. Validate uniqueness -> Hash password with bcrypt -> Gen USR_XXXXXX
      v
[MongoDB Atlas: User Collection]
      |
      |-- 3. Document persisted
      v
[Express Controller]
      |
      |-- 4. Sign JWT with user claims -> Return Token + User profile
      v
[User Browser: LocalStorage AuthContext]
      |
      |-- 5. POST /api/rooms/create (Bearer JWT, roomname, isPrivate)
      v
[Express Controller: room.controller.js]
      |
      |-- 6. Gen ROOM-XXXXXX -> Gen 5-digit password if private -> Format date/time
      v
[MongoDB Atlas: Room Collection]
      |
      |-- 7. Persist Room document
      v
[Express Controller]
      |
      |-- 8. Return 201 Created with Room Metadata
      v
[User Browser: Enter Canvas Workspace]
```

### Real-Time Canvas Synchronization & Teardown Flow (WebSockets)

```
[Client A (Host)]                    [Server WebSocket Hub]                    [Client B (Peer)]
       |                                       |                                       |
       |-- 1. wss:// Connect ----------------->|                                       |
       |-- 2. Frame: JOIN_ROOM --------------->|                                       |
       |                                       |-- 3. Register socket & verify < 5 peers
       |<-- 4. Frame: JOIN_SUCCESS ------------|                                       |
       |      (initial canvasState)            |                                       |
       |                                       |<-- 5. wss:// Connect & JOIN_ROOM -----|
       |                                       |-- 6. Frame: JOIN_SUCCESS ------------>|
       |<-- 7. Frame: USER_JOINED -------------|-- 7. Frame: USER_JOINED ------------->|
       |                                       |                                       |
       |-- 8. Canvas Pointer Move (Draw)       |                                       |
       |-- 9. Frame: DRAW_STEP --------------->|                                       |
       |      (stroke/shape/text vector)       |-- 10. Append memory buffer            |
       |                                       |-- 11. Async DB Update to MongoDB      |
       |                                       |-- 12. Broadcast REMOTE_DRAW_STEP ---->|
       |                                       |                                       |-- 13. Re-render Canvas
       |                                       |                                       |       Context 2D
       |-- 14. Host Browser Closes / Leaves -->|                                       |
       |                                       |-- 15. Detect Host socket drop         |
       |                                       |-- 16. Start 10-second countdown timer |
       |                                       |-- 17. Broadcast DESTRUCTION_WARNING ->|
       |                                       |-- 18. Ticks: 9s, 8s... 0s ----------->|
       |                                       |                                       |
       |                                       |-- 19. Timer expires:                  |
       |                                       |       - Execute Room.deleteOne()      |
       |                                       |       - Purge memory registry         |
       |                                       |-- 20. Frame: ROOM_DESTROYED --------->|
       |                                       |-- 21. Terminate client connection --->|
       |                                       |                                       |-- 22. Alert & redirect
       |                                       |                                               to Home Screen
```

---

## Tech Stack

### Frontend Architecture
- **React 18 (18.3.1)**: Declarative view rendering utilizing concurrent mode features and optimal DOM diffing.
- **Vite 6**: Fast ESM frontend tooling and build pipeline with optimized chunking.
- **HTML5 Canvas 2D API**: High-frequency vector rendering engine processing direct paths, geometric bounding boxes, raster transformations, and multi-user pointer operations.
- **Lucide React**: Vector iconography set embedded within interactive controls.
- **CSS3 Neumorphic Design System**: Custom dual surface lighting model (`#f0f3f8` surface base, `#d1d9e6` convex shadows, and `#ffffff` ambient light reflections).

### Backend Architecture
- **Node.js (Runtime v20+)**: Event-driven asynchronous execution model.
- **Express.js (4.21.2)**: Structured MVC framework managing HTTP routing, CORS configurations, and API payload parsers.
- **ws (8.18.0)**: Low-overhead, high-performance WebSocket implementation managing raw RFC 6455 framing and connection pooling.
- **Mongoose (8.9.5)**: Object data modeling library providing schema validation, type enforcement, and query building for MongoDB.
- **bcryptjs (3.0.3)**: Cryptographic password hashing utilizing adaptive key derivation algorithms.
- **jsonwebtoken (9.0.2)**: HMAC SHA256 stateless access token generation and authorization parsing.
- **dotenv (16.4.7)**: Decoupled environment variable injector.

---

## Getting Started / Local Development

### Prerequisites
- Node.js installed (v18.0.0 or higher recommended).
- npm installed (v9.0.0 or higher).
- A MongoDB database instance (local MongoDB server or MongoDB Atlas cluster connection URI).

### 1. Repository Setup
Clone the repository to your local development environment:
```bash
git clone https://github.com/InzmamKhan/CoCanvas.io.git
cd CoCanvas.io
```

### 2. Backend Configuration & Launch
1. Open a terminal and change directory to `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Populate `backend/.env`:
   ```env
   PORT = 5000
   MONGODB_URI = mongodb+srv://<username>:<password>@cluster0.mongodb.net/cocanvas?retryWrites=true&w=majority
   JWT_SECRET = cocanvas_development_super_secret_jwt_key_2026
   CLIENT_URL = http://localhost:5173
   ```
   *Note: If `MONGODB_URI` is left unpopulated, the server automatically boots with the built-in memory fallback store for offline development.*
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API and WebSocket server will run on `http://localhost:5000`.

### 3. Frontend Configuration & Launch
1. Open a second terminal window and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure `frontend/.env` is configured for local networking:
   ```env
   VITE_API_URL = http://localhost:5000
   VITE_WS_URL = ws://localhost:5000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your web browser and visit `http://localhost:5173`.
