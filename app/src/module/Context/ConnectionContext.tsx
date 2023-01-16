
import { createContext } from "react";
import axios from 'axios';


const delim = "haha";

type ServerType = {
    post : (to : string, data : {[name : string] : any} | any,opts? : {[name : string] : any},replace? : boolean) => Promise<any>,
    get : (to : string,opts : {[name : string] : any})=>Promise<any>,
    logout : () => Promise<any>,
    login : (gmail? : string )=> Promise<any>,
    isAuthenticated : boolean,
    upload : (data : {[name : string] : any})=>Promise<any>,
    address : string,
    credentials : {[name : string] : any},
    dir : (apath : string) => Promise<any>,
    mkdir : (apath : string, aname : string) => Promise<any>,
    getImg : (apath : string, aname : string,compression : string) => Promise<any>,
    toNetworkImage : (apath : string, aname : string) => string,
    controller : AbortController,
    InitController : Function,
} & Function

type MyProvider = {
    Server : ServerType
}

function Server() {
    function cmd(){
        console.log(headers);
        
    }
    cmd.controller = new AbortController();

    cmd.InitController = function(){
        const controller = new AbortController();
        cmd.controller = controller;
    }


    const serverurl = 'http://localhost:8060'
    const options = {
        withCredentials : true,
        validateStatus : (status : number)=>{
            return status >=200 && status <= 500;
        }
    }
    let headers : any = null;

    axios.interceptors.response.use((config)=>{
        //ignore 404 errors
        cmd.isAuthenticated = config.status == 200 && config.config.url != serverurl + '/logout';
        cmd.isAuthenticated = cmd.isAuthenticated || config.status == 404;
        headers = config.headers;

        return config;
    })
    

    cmd.credentials = options;
    cmd.address = serverurl;
    cmd.isAuthenticated = false;

    cmd.upload = async(data : {[name : string] : any}) =>{
        return axios(data);
    }
    cmd.get = async(to : string,opts : {[name : string] : any} = {})=>{
        return axios.get(to,{...options,...opts});
    }

    cmd.post = async (to : string,data : {[name : string] : any} | any = {},opts : {[name : string] : any} = {},replace = false) =>{
        //console.log(to,data,opts,replace);
        return axios.post(serverurl + to,
            replace ? data : {
                ...data
            },
            {...options,...opts})

    }
    //response type : arraybuffer, blob, document, json, stream, text
    cmd.logout = async ()=>{
        return axios.post(serverurl + '/logout',{},options);
    }

    cmd.login = async (gmail : string = '')=>{
        return axios.post(serverurl + '/login',{gmail : gmail},options);
    }

    cmd.dir = async (apath : string = '/') =>{
        return cmd.post('/account/list',{path : apath});
    }
    cmd.mkdir = async (apath : string, aname : string) =>{
        return cmd.post('/create/dir',{path : apath,name : aname})
    }
    cmd.getImg = async(apath : string, aname : string,compression : string) =>{
        
        return cmd.post(
            '/account/image',
            {
            path : apath,
            name : aname,
            compression : compression
        },
        {responseType : 'blob',signal : cmd.controller.signal});
        //return cmd.get(apath.replaceAll('/',delim) + delim + aname);
    }

    cmd.toNetworkImage = (apath : string,aname : string)=>{
        const base = serverurl + '/account/image/'
        const imgurl = apath.replaceAll('/',delim) + delim + aname
        return base + imgurl
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


