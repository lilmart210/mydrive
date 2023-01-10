import { useState } from 'react'

import {Route,Routes,Navigate} from 'react-router-dom';
import {Home} from './module/home/home'
import { Login,Logout,MyProtected} from './module/login/login';

import { Header } from './module/Header/Header';
import { Auth0Provider } from "@auth0/auth0-react";

import { AxiosContext } from './module/Context/ConnectionContext';
import { AxiosProvider } from './module/Context/ConnectionContext';
import { Upload } from './module/browser/Upload';

//port number 5173

function App() {

  return (
    <Auth0Provider
      domain="currupt.us.auth0.com"
      clientId="VmMFrPK3XrHBEkd2MF1rKD9U4zvMsHcx"
      redirectUri={'http://localhost:5173/drive'}
      audience="https://currupt.us.auth0.com/api/v2/"
      scope="read:current_user update:current_user_metadata"
    >
      <AxiosProvider >
        <Routes>
          <Route path = "/" element = {<MyProtected></MyProtected>}>
            <Route path = 'home/' element = {<Home></Home>}>
              <Route path = 'upload' element = {<Upload></Upload>}/>
            </Route>
            <Route path = 'admin' element = {<div>You don't have permission</div>}/>
            <Route path = 'logout' element = {<Logout></Logout>}/>
          </Route>
          <Route path = '*' element = {<Navigate to = '/'/>}/>
        </Routes>
      </AxiosProvider>
    </Auth0Provider>

  )
}
//<Route path = '/login' element = {<Login></Login>}/>

/*
        <Route path = '/' element = {<Home></Home>}>
          <Route path = '/drive' element ={<div>drive</div>}/>
          <Route path = '/profile' element = {<div>profile</div>}/>
        </Route>
*/


export default App
