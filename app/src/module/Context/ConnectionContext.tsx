
import { createContext } from "react";
import axios from 'axios';




type ServerType = {
    post : (to : string, data : {[name : string] : any} | any,opts? : {[name : string] : any},replace? : boolean) => Promise<any>,
    logout : () => Promise<any>,
    login : (gmail? : string )=> Promise<any>,
    isAuthenticated : boolean,
    upload : (data : {[name : string] : any})=>Promise<any>,
    address : string,
    credentials : {[name : string] : any}
}

type MyProvider = {
    Server : ServerType
}

function Server() {
    const serverurl = 'http://localhost:8060'
    const options = {
        withCredentials : true,
        validateStatus : (status : number)=>{
            return status >=200 && status <= 500;
        }
    }
    axios.interceptors.response.use((config)=>{
        cmd.isAuthenticated = config.status == 200 && config.config.url != serverurl + '/logout';
        
        return config;
    })

    function cmd(){

    }
    cmd.credentials = options;
    cmd.address = serverurl;
    cmd.isAuthenticated = false;

    cmd.upload = async(data : {[name : string] : any}) =>{
        return axios(data);
    }

    cmd.post = async (to : string,data : {[name : string] : any} | any = {},opts : {[name : string] : any} = {},replace = false) =>{
        console.log(to,data,opts,replace);
        return axios.post(serverurl + to,
            replace ? data : {
                ...data
            },
            {...options,...opts})

    }
    cmd.logout = async ()=>{
        return axios.post(serverurl + '/logout',{},options);
    }

    cmd.login = async (gmail : string = '')=>{
        return axios.post(serverurl + '/login',{gmail : gmail},options);
    }

    return cmd;
}


export const AxiosContext = createContext<MyProvider>({Server : Server()});

export function AxiosProvider(props : React.PropsWithChildren){
    return (
    <AxiosContext.Provider value = {{Server : Server()}}>
        {props.children}
    </AxiosContext.Provider>
    )
}

