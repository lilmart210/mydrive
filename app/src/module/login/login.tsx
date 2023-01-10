


//making a request to backend at /login will check if authenticated.

import { useState,useEffect,FormEvent,useContext} from 'react'
import {Outlet,Navigate,useNavigate} from 'react-router-dom';
import axios from 'axios';
import { AxiosContext } from '../Context/ConnectionContext';

import './login.css';

//gmail must be present in body even if just checking authentication
export function Login(props? : {[setAuth : string] : (abool : boolean)=>void}) {
    const [formstate,setFormstate] = useState<{[name : string] : any}>({});
    const [message,setMessage] = useState("");
    const nav = useNavigate();
    const {Server} = useContext(AxiosContext);

    function tryLogin(aname : string) : Promise<boolean>{
        return Server.login(aname).then(data => {return data.status == 200});
    }
    

    const changeHandler = (event :FormEvent<HTMLInputElement>)=>{
        event.currentTarget;
        const aname = event.currentTarget.name;
        const avalue = event.currentTarget.value;
        const pckg = {...formstate};
        pckg[aname] = avalue;
        setFormstate(pckg);
    }

    const submit = ()=>{
        tryLogin(formstate.gmail).then((data)=>{
            if(data){
                nav('/home');
            }else {
                setMessage("Failed to login");
            }
        })
    }

    return (
        <div className = "LoginPage">
            <div className = "LoginPanel">
                <label>{message}</label>
                <label>
                    gmail
                </label>
                <input
                    name = 'gmail'
                    type = 'text'
                    onChange={changeHandler}
                />
            
                <button onClick={submit}>Submit</button>
            </div>
        </div>
    )
}

//if authenticated, outlet to the desired place
export function MyProtected(props? : {[auth : string] : boolean}) {
    let [isAuth, setAuth] = useState(props?.auth || false);
    const {Server} = useContext(AxiosContext);
    const nav = useNavigate();
    
    //try to authenticate first
    //otherwise navigate to homepage
    useEffect(()=>{
        //check to see if valid session token exists in session cookie
        //by asking the server if we are logged in
        const auto = async function(){
            //await Server.logout();
            const resp = await Server.login().then(data =>setAuth(data.status == 200));
        }
        auto()
    },[isAuth])

    return Server.isAuthenticated ? <Outlet/> : <Login></Login>;
    //return isAuth ? <Navigate to = '/home' replace/> : <Navigate to = '/login' replace/>
}

export function Logout(){
    const {Server} = useContext(AxiosContext);
    const nav = useNavigate();

    useEffect(()=>{
        Server.logout().then(()=>{
            nav('/home');
        });
    },[])

    return <div>Logging out</div>
}