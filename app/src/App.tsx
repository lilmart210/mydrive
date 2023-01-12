import { useState } from 'react'

import {Route,Routes,Navigate} from 'react-router-dom';
import {Home} from './module/home/home'
import { Login,Logout,MyProtected} from './module/login/login';

import { Header } from './module/Header/Header';
import { Auth0Provider } from "@auth0/auth0-react";

import { AxiosContext } from './module/Context/ConnectionContext';
import { AxiosProvider } from './module/Context/ConnectionContext';
import { Upload } from './module/browser/Upload';
import { Browser } from './module/browser/Browser';

//port number 5173

function App() {

  return (

      <AxiosProvider >
        <Routes>
          <Route path = "/" element = {<MyProtected></MyProtected>}>
            <Route path = 'home/' element = {<Home></Home>}>
              <Route path = '' element = {<Browser></Browser>}/>
              <Route path = 'upload' element = {<Upload></Upload>}/>
              <Route path = 'admin' element = {<div>You don't have permission</div>}/>
              <Route path = '*' element = {<Navigate to = ''></Navigate>}/>
            </Route>
            <Route path = 'logout' element = {<Logout></Logout>}/>
          </Route>
          <Route path = '*' element = {<Navigate to = '/'/>}/>
        </Routes>
      </AxiosProvider>

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
