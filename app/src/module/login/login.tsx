


//making a request to backend at /login will check if authenticated.

import { useState,useEffect,FormEvent,useContext} from 'react'
import {Outlet,Navigate,useNavigate} from 'react-router-dom';
import axios from 'axios';
import { AxiosContext } from '../Context/ConnectionContext';

//import './login.css';

//gmail must be present in body even if just checking authentication
export function Login(props? : {[setAuth : string] : (abool : boolean)=>void}) {
    const [formstate,setFormstate] = useState<{[name : string] : any}>({});
    const [message,setMessage] = useState("");
    const nav = useNavigate();
    const {Server} = useContext(AxiosContext);
    

    const changeHandler = (event :FormEvent<HTMLInputElement>)=>{
        event.currentTarget;
        const aname = event.currentTarget.name;
        const avalue = event.currentTarget.value;
        const pckg = {...formstate};
        pckg[aname] = avalue;
        setFormstate(pckg);
    }

    const submit = ()=>{

        Server.login(formstate)
        .then(data => {
            const stat = data.status == 200;
            if(stat){
                nav('/home');
            }else {
                setMessage("Failed to login");
            }
        })
        .catch(()=>{});

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
                    type = 'email'
                    onChange={changeHandler}
                />
                <label>password</label>
                <input name = 'password' type={'password'} onChange={changeHandler}></input>
                <button onClick={submit}>Submit</button>
                <button onClick={()=>{nav('/signup')}}>signup</button>
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
            //await Server.logout();
        Server.login()
        .then(data =>setAuth(data.status == 200))
        .catch(()=>{});
        
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


export function AdminProtected(props : {[name : string] : any}){
    const {Server} = useContext(AxiosContext);
    const [isAdmin,setAdmin] = useState(false);
    const nav = useNavigate();

    useEffect(()=>{
        Server.RequestAdmin()
        .then(()=>{
            const adminAuth = Server.isAdmin && Server.isAuthenticated
            setAdmin(adminAuth);
            adminAuth ? nav('/admin') : nav('/');
        })
        .catch(()=>{});

    },[])


    return isAdmin ? <Outlet/> : <label>You are not Allowed</label>
}

//React.HTMLAttributes<HTMLDivElement>.style?: React.CSSProperties |

const signupstyle : React.CSSProperties = {
    display : 'flex',
    flexDirection : 'column',
    maxWidth : '30vw',
    maxHeight : '60 vh',

}

export function SignUp(){
    const {Server} = useContext(AxiosContext);
    const [msgResp,setResp] = useState('');
    const [data,setdata] = useState<{[name : string] : any}>({});
    const nav = useNavigate();


    const change = (e : FormEvent<HTMLInputElement>) => {
        const aname = e.currentTarget.name;
        const aval = e.currentTarget.value;
        const newpack : {[name : string] : any}= {};
        newpack[aname] = aval;
        setdata({...data , ...newpack});
    }

    const click = ()=>{
        const isequal = data.password && data.password == data.confirm;

        !isequal && data.password && setResp("Password not the same")
        !isequal && !data.password && setResp("Invalid Password")

        isequal && Server.Signup(data)
        .then((rep)=>{
            if(rep.status == 200){
                nav('/home');
            }else {
                setResp('You Are Not Authorized')
            }
        })
        .catch(()=>{});
    }

    return (
        <div>
            <div style={signupstyle}>
                <label>Sign up</label>
                <label>{msgResp}</label>
                <input onChange={change} name = 'gmail' type={'email'} placeholder ='email'></input>
                <input onChange={change} name = 'password' type={'password'} placeholder = 'password'/>
                <input onChange={change} name = 'confirm' type={'password'} placeholder = 'Confirm Password'/>
                <button onClick={click}>Submit</button>
                <button onClick={()=>nav('/')}>back</button>
            </div>
        </div>
    )
}