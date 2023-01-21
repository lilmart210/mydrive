
import { AxiosContext } from "../Context/ConnectionContext"
import { useState,useContext, useEffect, FormEvent} from "react"
import { useNavigate } from "react-router-dom"

//admin only panel
export function AdminPanel(){
    const nav = useNavigate();
    const {Server} = useContext(AxiosContext);
    const [users, setUsers] = useState<Array<{[name : string] : any}>>([]);
    const [formvalue,setform] = useState<{[name : string] : any}>({});
    const [RootDirectory,setRoot] = useState('');

    //need to be able to edit
    const refreshUserlist = ()=>{
        Server.getUsers()
        .then((users)=>{
            setUsers(users.data);
        })
        .catch(()=>{})
    }
    useEffect(()=>{
        refreshUserlist();

        Server.getRoot()
        .then(apath=>{
            setRoot(apath.data)
        })
        .catch(()=>{})

    },[])

    const change = (e : FormEvent<HTMLInputElement>) => {
        const aname = e.currentTarget.name;
        const aval = e.currentTarget.value;
        const aform : {[name : string] : any} = {};
        aform[aname] = aval;

        setform({...formvalue,...aform});

    }

    const submitNewUser = () => {
        Server.addUser(formvalue.user)
        .then(()=>{
            refreshUserlist();
        })
        .catch(()=>{})

    }

    return (
        <div>
            <button onClick={()=>{nav('/home')}}>back</button>

            <div>
                <label>Absolute File Path</label>
                <input placeholder={RootDirectory} onChange={change}></input>
                <button>Submit DirPath</button>
            </div>
            <div>
                <table>
                    <thead>
                        <tr>
                            <td>Username</td>
                            <td>Password</td>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            users.map((item : {[name : string] : any},i)=>
                            <tr key = {i}>
                                <td>{item.gmail}</td>
                                <td>{item.password}</td>
                            </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>
            <input name = 'user' onChange = {change} placeholder="New User Name"></input>
            <button onClick={submitNewUser}>Update</button>
        </div>
    )
}