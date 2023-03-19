
import { AxiosContext } from "../Context/ConnectionContext"
import { useState,useContext, useEffect, FormEvent, useRef} from "react"
import { useNavigate } from "react-router-dom"

//admin only panel
export function AdminPanel(){
    const nav = useNavigate();
    const {getMeta} = useContext(AxiosContext);

    const [users, setUsers] = useState<Array<{[name : string] : any}>>([]);
    const [formvalue,setform] = useState<{[name : string] : any}>({});
    const [RootDirectory,setRoot] = useState('');

    type aUser = {admin? : string,email? : string,username? : string,whitelist? : string};
    const [init,setInit] = useState<Array<aUser>>([])
    const selRef = useRef<HTMLSelectElement>(null);
    const [selUser,setUser] = useState<aUser | undefined>({})

    useEffect(()=>{
        getMeta()
        .then((data)=>{
            //admin email usernam whitelist
            if(data.status){
                console.log(data.data); 
                setInit(data.data)
            }
        })
    },[])

    const change = (e : FormEvent<HTMLInputElement>) => {
        const aname = e.currentTarget.name;
        const aval = e.currentTarget.value;
        const aform : {[name : string] : any} = {};
        aform[aname] = aval;

        setform({...formvalue,...aform});

    }

    const submitNewUser = () => {

    }

    function editUser(){
        const targ = selRef.current?.value;
        const userdata = init.find((item)=>item.email == targ)
        setUser(userdata);
    }
    function saveall(){
        
    }

    return (
        <div className = "LoginPage">
            <div className='LoginPanel bigger'>
                <h1>Form Data</h1>
                
                <button onClick={()=>{nav('/home')}}>back</button>
                <select name = "updates" ref={selRef}>
                    {
                        init.map((item : any,i)=>{
                            return <option key = {i} value = {item.email}>
                                {item.email}
                            </option>
                        })
                    }
                </select>
                
                <button onClick={editUser} >get</button>
                {
                    selUser?.username && 
                    <div className={'Mygrid'}>
                        <div><p>username</p><input type = {'text'} defaultValue={selUser.username}></input></div>
                        <div><p>email</p><input type = {'email'} defaultValue={selUser.email}></input></div>
                        <div><p>admin</p><input type ={'checkbox'}defaultValue={selUser.admin}></input></div>
                        <div><p>whitelist</p><input type={'checkbox'} defaultValue={selUser.whitelist}></input></div>
                    </div>
                }
                <button onClick={saveall}>save</button>
            </div>
        </div>
    )
}