import { useState } from 'react'

import {Route,Routes,Navigate,Outlet} from 'react-router-dom';
import {Home} from './module/home/home'
import { Login,Logout,AdminProtected,SignUp} from './module/login/login';

import { Header } from './module/Header/Header';
import { Auth0Provider } from "@auth0/auth0-react";

import { AxiosContext,AxiosProvider,ProtectView } from './module/Context/ConnectionContext';
import { Upload } from './module/browser/Upload';
import { Browser } from './module/browser/Browser';
import { AdminPanel } from './module/browser/Admin';
import { Profile } from './module/home/profile';

//port number 5173

function App() {

  return (

      <AxiosProvider>
        <Routes>
          <Route path = "/" element = {<ProtectView></ProtectView>}>
            <Route path = '/home' element = {<Home></Home>}>
              <Route path = '/home/' element = {<Browser></Browser>}/>
              <Route path = '/home/upload' element = {<Upload></Upload>}/>
              <Route path = '/home/admin' element = {<div>You don't have permission</div>}/>
              <Route path = '/home/*' element = {<Navigate to = '/home'></Navigate>}/>
            </Route>
            
            <Route path = '/logout' element = {<Logout></Logout>}/>
            <Route path = '/profile' element = {<Profile></Profile>}/>

            <Route path = '/admin' element = {<AdminProtected></AdminProtected>}>
              <Route path = '/admin/' element = {<AdminPanel></AdminPanel>}></Route>
            </Route>
          </Route>

          <Route path = '/signup' element = {<SignUp></SignUp>}/>
          <Route path = '/login' element = {<Login></Login>}/>
          <Route path = '*' element = {<Navigate to = '/home'/>}/>
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
