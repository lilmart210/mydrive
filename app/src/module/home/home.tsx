
import Background from '../../assets/HomeBackground.svg';
import {Outlet,Navigate,useNavigate} from 'react-router-dom'
import { useAuth0 } from "@auth0/auth0-react";
import './home.css'

export function Home(){
    const {loginWithRedirect,isAuthenticated} = useAuth0();
    const nav = useNavigate();


    const NavToProfile = ()=>{
        nav('/profile');
    }

    return (
        <div className='HomeLayout'>
            <div className='ScreenHeader'>
                <div>Logo</div>
                <input type='search' className='SearchBar'></input>
                <button onClick={()=>{nav('/profile')}}>profile</button>
            </div>
            <div className='LeftSearch'>
                <div className='LeftDirectory Widget'>
                    <button onClick={()=>{nav('/home/upload')}}>Upload</button>
                    <button onClick={()=>{nav('/home')}}>My Drive</button>
                    <button>Shared</button>
                    <button>Trash</button>
                    <button>Secret</button>
                    <button>Favorite</button>
                    <button onClick={()=>{nav('/logout')}}>Logout</button>
                </div>
                <div className='LeftArtifact Widget'>
                    <label>Whats good</label>
                    <label>Total Storage</label>
                </div>
            </div>
            <div className='FileDirectory'>
                {isAuthenticated ? <Outlet/> : <div className='Auth'>
                    <button onClick = {loginWithRedirect}>Login with auth0</button></div>}
            </div>
        </div>
    )
}
