# BurgirrHub
BurgirrHub is an online restaurant reservation system built with the MERN stack (MongoDB, Express, React, Node.js). It enables real-time bookings and allows customers to make reservations easily while also giving restaurant managers control over bookings through an admin dashboard.

----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
## How it works

### For Users (Customers)

1. **Homepage Access**
   - Users land on a clean landing page with sections like About, Menu, and Team (from `components/`).
   - Navigation is handled by a smooth scroll and React Router (`Navbar.jsx`).

2. **Menu Browsing**
   - Users can view available dishes and restaurant highlights via `Menu.jsx` and `Menu2.jsx`.

3. **Reservation Form**
   - From the reservation page (`Reservation.jsx`), users fill in:
     - Name, Date, Time, Phone, Email, and Branch
   - On submission:
     - Form data is sent via Axios to the backend API at `/api/reservations`.
     - A success message is displayed (`Success.jsx`), confirming reservation.

---

### For Manager (Admin Panel)

1. **Login Interface**
   - Managers can log in via `Manager.jsx`. *(Note: authentication logic can be expanded later.)*

2. **Dashboard Access**
   - `ManagerDashboard.jsx` fetches all reservations from the backend.
   - Data is displayed in tabular form with options to:
     - **View**, **Delete** (via `delete.js`)
     - **Monitor status** in real time

3. **Data Handling**
   - Reservations are pulled from MongoDB using backend routes (`reservationRoute.js`, `manager.js`).
   - `controller/reservation.js` handles core logic.
   - `models/reservation.js` defines the Mongoose schema.
   - `error/error.js` handles API exceptions gracefully.

---

### Backend Flow

1. **Database Connection**
   - `dbConnection.js` connects to MongoDB using environment variables from `config.env`.

2. **Routing & Controllers**
   - `/api/reservations` → Create and manage reservations
   - `/api/manager` → Get all reservations for the dashboard
   - Deletion handled via `/api/delete/:id`

3. **Deployment**
   - Backend is Vercel-ready via `vercel.json`.
   - Frontend build can be hosted on Vercel/Netlify.
  
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## File Structure
```
BurgirrHUB/
├── Backend/
│   ├── config/
│   │   └── config.env
│   ├── controller/
│   │   └── reservation.js
│   ├── database/
│   │   └── dbConnection.js
│   ├── error/
│   │   └── error.js
│   ├── models/
│   │   └── reservation.js
│   ├── routes/
│   │   ├── delete.js
│   │   ├── manager.js
│   │   └── reservationRoute.js
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json
│
├── Frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── About.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── HeroSection.jsx
│   │   │   ├── Menu.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Qualities.jsx
│   │   │   ├── Team.jsx
│   │   │   └── WhoAreWe.jsx
│   │   ├── Pages/
│   │   │   ├── Home/
│   │   │   │   └── Home.jsx
│   │   │   ├── ManagerDashboard/
│   │   │   │   └── ManagerDashboard.jsx
│   │   │   ├── ManagerLogin/
│   │   │   │   └── Manager.jsx
│   │   │   ├── Menu/
│   │   │   │   └── Menu2.jsx
│   │   │   ├── NotFound/
│   │   │   │   └── NotFound.jsx
│   │   │   ├── Reservation/
│   │   │   │   └── Reservation.jsx
│   │   │   └── Success/
│   │   │       └── Success.jsx
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── restApi.json
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
```

----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## Setup

### Clone the Repository

```bash
git clone https://github.com/Praneeth1265/BurgirrHUB.git
cd BurgirrHUB
```

### Backend Setup
```
cd backend
```
# Install backend dependencies
```
npm install
```
# Create a config.env file in /config directory with the following content:
# (replace with your own MongoDB credentials)

MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/burgirrhub
PORT=4000

# Start the backend server
```
node server.js
```

### Frontend Setup
```
cd frontend
```
# Install frontend dependencies
```
npm install
```
# Start the React development server
```
npm run dev
```
