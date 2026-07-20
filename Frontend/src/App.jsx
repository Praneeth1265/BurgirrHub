import React from 'react'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './Pages/Home/Home';
import NotFound from './Pages/NotFound/NotFound';
import Success from './Pages/Success/Success';
import './App.css'
import Reservation from './Pages/Reservation/Reservation';
import Menu2 from './Pages/Menu/Menu2'
import Login from './Pages/Login/Login';
import ManagerLogin from './Pages/Login/ManagerLogin';
import ManagerDashboard from './Pages/ManagerDashboard/ManagerDashboard';
import OrderMenu from './Pages/Order/OrderMenu';
import Checkout from './Pages/Order/Checkout';
import OrderSuccess from './Pages/Order/OrderSuccess';
import OrderHistory from './Pages/Order/OrderHistory';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

const App = () => {
  return (
    <>
      <AuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path='/' element={<Home/>}/>
              <Route path='/success' element={<Success/>}/>
              <Route path='*' element={<NotFound/>}/>
              <Route path='/reservations' element={<Reservation/>}/>
              <Route path='/menu2' element={<Menu2/>}/>
              <Route path="/login" element={<Login />} />
              <Route path="/manager-access" element={<ManagerLogin />} />
              <Route
                path="/manager-dashboard"
                element={
                  <RequireAuth roles={["staff", "admin"]}>
                    <ManagerDashboard />
                  </RequireAuth>
                }
              />
              <Route path='/order' element={<OrderMenu/>}/>
              <Route
                path='/order/checkout'
                element={
                  <RequireAuth>
                    <Checkout/>
                  </RequireAuth>
                }
              />
              <Route path='/order/success' element={<OrderSuccess/>}/>
              <Route
                path='/orders/history'
                element={
                  <RequireAuth>
                    <OrderHistory/>
                  </RequireAuth>
                }
              />
            </Routes>
            <Toaster/>
          </Router>
        </CartProvider>
      </AuthProvider>
    </>
  )
}

export default App
