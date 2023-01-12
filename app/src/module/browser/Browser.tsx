import {useEffect,useState,useContext} from 'react'
import { AxiosContext } from '../Context/ConnectionContext';



export function Browser(){
    const {Server} = useContext(AxiosContext);

    const [currentDir,setCurrentDir] = useState<string>("/");
    const [dirData,setDirData] = useState<any>({});



    useEffect(()=>{
        Server.dir(currentDir).then((data)=>{
            //console.log(data.data);
        });
    })

    const buildImage = (arr : Array<any>)=>{
        return []
    }


    return (
        <div>
            Well well well, what do we have here?
        </div>
    )
}