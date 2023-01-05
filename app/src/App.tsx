import { useState } from 'react'

import {Route,Routes} from 'react-router-dom';
import {Home} from './module/home/home'

import { Header } from './module/Header/Header';



function App() {

  return (
    <>
      <Header></Header>
      <Routes>
        <Route path = '/' element = {<Home></Home>}/>
      </Routes>
    </>
  )
}

export default App
