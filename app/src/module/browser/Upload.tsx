import {useState,useContext} from 'react';
import { AxiosContext } from '../Context/ConnectionContext';

import './upload.css'

export function Upload(){
    const [Files,SetFiles] = useState<Array<File>>([]);
    const {Server} = useContext(AxiosContext)
    
    //make pop up screen
    const UploadHandler = (event : React.MouseEvent<HTMLButtonElement>) => {
        const form = new FormData();
        for(let i = 0; i < Files.length;i++){
            console.log(Files[i].name)
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
            <button onClick={UploadHandler}>Upload</button>
        </div>
    </div>
}