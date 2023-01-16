import {useState,useContext,useEffect,useRef} from 'react';
import { AxiosContext } from '../Context/ConnectionContext';

import path from 'path';



export function Upload(){
    const [Files,SetFiles] = useState<Array<File>>([]);
    const {Server} = useContext(AxiosContext)
    const [popup,setPopup] = useState(false);
    
    //make pop up screen
    const UploadHandler = (event : React.MouseEvent<HTMLButtonElement>,adir : string) => {
        //console.log(adir);
        const form = new FormData();
        form.append('path',adir);
        for(let i = 0; i < Files.length;i++){
            //console.log(Files[i].name)
            form.append('file'+i,Files[i],Files[i].name);
        }
        Server.upload(
            {
                method: 'post',
                url : Server.address + '/account/upload',
                data : form,
                headers : {
                    'Content-Type': `multipart/form-data; boundary=----arbitrary boundary`
                },
                ...Server.credentials
            }
        ).then(()=>{
            console.log("posted");
            SetFiles([]);
        }).catch(()=>{
            console.log("unsuccessful upload");
        })

    }
    const FileChange = (event : React.ChangeEvent<HTMLInputElement>)=>{
        const afilelist = event.target.files
        if(!afilelist)return;
        for(let i = 0; i < afilelist?.length;i++){
            SetFiles([...Files,afilelist[i]]);
        }
        event.currentTarget.value = '';
    }

    const ToObject = (arr : File[])=>{
        const ret : React.ReactElement[] = [];
        for(let i = 0; i < arr.length;i++){
            const afile = arr[i];
            ret.push(
                <div className = "ImageContainer">
                    {afile.name}<img src={URL.createObjectURL(afile)}/>
                </div>
            )
        }
        return ret;
    }

    return <div className='UploadContainer'>
        <div className='UploadPanel'>
            <div className = "FileDisplay">{...ToObject(Files)}</div>
            <input type='file' onChange={FileChange}></input>
            <button onClick={()=>{setPopup(true)}}>Upload</button>
            {popup ? <FileExplorer onSubmit = {UploadHandler} onExit = {()=>{setPopup(false)}}></FileExplorer> : null}
        </div>
    </div>
}

type FileExplorer = {
    onSubmit : (event : React.MouseEvent<HTMLButtonElement>,adir : string) => void
    onExit : () => void
}

/**
 * todo : create folder does not refresh the directory list...
 */
export function FileExplorer(props : FileExplorer){
    let [buildDir,setBuildDir] = useState<string>('/');
    const [DirObj,setDirObj] = useState<Array<{[name : string] : any}>>([]);
    const {Server} = useContext(AxiosContext);
    const foldername = useRef<HTMLInputElement>(null);

    useEffect(()=>{
        
        Server.dir(buildDir).then((data)=>{
            //console.log(data);
            //res.send({"directories" : alldirs,"files" : allfiles});
            //alldirs => [ {name : string}]
            //console.log("dirs are ",data.data.directories);
            setDirObj(data.data.directories);
        });
    },[buildDir])

    const CreateDirectories = (dirs : Array<{[name : string] : any}>) : Array<React.ReactNode> => {
        const ret:Array<React.ReactNode> = [];
        for(let i = 0; i < dirs.length;i++){
            ret.push(
                <button onClick={function(){
                    setBuildDir(path.join(buildDir,dirs[i].name))
                }} key = {i}>{dirs[i].name}
                </button>
            )
        }
        return ret;
    }
    const advanceUp = ()=>{
        if(buildDir == '/') return;
        setBuildDir(path.dirname(buildDir));
    }
    
    const createFolder = ()=>{
        const newname = foldername.current?.value;
        foldername.current!.value = "";
        if(newname) Server.mkdir(buildDir,newname);
        //cause the dir to refresh
        Server.dir(buildDir).then(data=>setDirObj(data.data.directories));
    }

    return (
        <div className='FileExplorer'>
            <div className='Menu'>
                <label>Current Dir : {buildDir}</label>
                <button onClick={props.onExit}>Return</button>
                <label>New Flder Name <input type = 'text' ref={foldername}></input></label>
                <button onClick={createFolder}>Create Folder</button>
                <button onClick={(e)=>{props.onSubmit(e,buildDir);props.onExit()}}>Upload</button>
            </div> 
            <div className='FileList'>
                <button onClick = {advanceUp} className='Up'>../</button>
                {...CreateDirectories(DirObj)}
            </div>
        </div>
    )
}