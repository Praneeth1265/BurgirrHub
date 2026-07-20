import React from 'react'
import HeroSection from '../../components/HeroSection'
import About from '../../components/About'
import Qualities from '../../components/Qualities'
import Menu from '../../components/Menu'
import WhoAreWe from '../../components/WhoAreWe'
import Team from '../../components/Team'
import Footer from '../../components/Footer'
import Navbar from '../../components/Navbar'
import ReservationReminder from '../../components/ReservationReminder'

const Home = () => {
  return (
    <>
      <Navbar/>
      <HeroSection/>
      <About/>
      <Qualities/>
      <Menu/>
      <WhoAreWe/>
      <Team/>
      <Footer/>
      <ReservationReminder/>
    </>
  )
}

export default Home
