
import { createContext } from "react";
import axios, { AxiosResponse } from 'axios';


const delim = "haha";

type ServerType = {
    post : (to : string, data : {[name : string] : any} | any,opts? : {[name : string] : any},replace? : boolean) => Promise<any>,
    get : (to : string,opts : {[name : string] : any})=>Promise<any>,
    logout : () => Promise<any>,
    login : (adata? : any)=> Promise<any>,
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
    RequestAdmin : ()=> Promise<any>,
    isAdmin : boolean,
    Signup : (adata : {[name : string] : any})=>Promise<any>,
    getUsers : () => Promise<any>,
    addUser : (aname : string) => Promise<any>,
    setDirectory : (apath : string) => Promise<any>,
    getRoot : ()=> Promise<any>
} & Function

type MyProvider = {
    Server : ServerType
}

function Server() {
    function cmd(){
        console.log(headers);
        
    }
    cmd.controller = new AbortController();
    cmd.isAdmin = false;

    cmd.RequestAdmin = async ()=>{
        return cmd.post('/admin')
        .then((res : AxiosResponse<any>)=>{
            if(res.status == 200){
                cmd.isAdmin = true;
            }else {
                cmd.isAdmin = false;
            }
        }).catch(()=>{
            cmd.isAdmin = false;
        })
    }

    cmd.InitController = function(){
        const controller = new AbortController();
        cmd.controller = controller;
    }


    const envUrl = import.meta.env.VITE_ADDRESS;

    if(!envUrl) console.error('No environment variable Address, defaulting to localhost:8060')
    console.log(envUrl);
    //VITE_ADDRESS=http://localhost:8060
    const serverurl = envUrl ? envUrl : 'http://localhost:8060';

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
        return cmd.post(
            '/account/upload',
            data,
            {headers : {'Content-Type': `multipart/form-data; boundary=----arbitrary boundary`}},
            true
        );
    }
    cmd.get = async(to : string,opts : {[name : string] : any} = {})=>{
        return axios.get(serverurl + to,{...options,...opts});
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

    cmd.login = async (adata : any)=>{
        return cmd.post('/login',adata);
        //return axios.post(serverurl + '/login',{...adata},options);
    }
    cmd.Signup = async (adata : {[name : string] : any}) => {
        return cmd.post('/signup',adata);
    }


    cmd.dir = async (apath : string = '/') =>{
        return cmd.post('/account/list',{path : apath});
    }
    cmd.mkdir = async (apath : string, aname : string) =>{
        return cmd.post('/create/dir',{path : apath,name : aname})
    }
    cmd.getImg = async(apath : string, aname : string,compression : string) =>{
        
        return cmd.post(
            '/account/get',
            {
            path : apath,
            name : aname,
            compression : compression
        },
        {responseType : 'blob',signal : cmd.controller.signal});
        //return cmd.get(apath.replaceAll('/',delim) + delim + aname);
    }

    cmd.setDirectory = async (apath : string) =>{
        return cmd.post(
            '/admin/setDirectory',
            {path : apath}
        )
    }

    cmd.getUsers = async ()=>{
        return cmd.get(
            '/admin/whitelist'
        )
    }
    
    cmd.addUser = async (aname : string)=>{
        return cmd.post(
            '/admin/newUser',
            {gmail : aname}
        )
    }

    cmd.getRoot = async ()=>{
        return cmd.get('/admin/rootpath');
    }

    cmd.toNetworkImage = (apath : string,aname : string)=>{
        const base = serverurl + '/account/get/'
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


