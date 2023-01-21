import {useEffect,useState,useContext,useRef} from 'react'
import { AxiosContext } from '../Context/ConnectionContext';

import path, { isAbsolute } from 'path';
import { userInfo } from 'os';
/**
 * TODO : preserve bandwidth by sending over images in preferance of videos
 * only send videos when we want to actually watch the video
 * 
 * songs and videos can only be played if clicked on and displayed 
 * images will only be regular quality if clicked on as well
 * otherwise everything that is shown is either blank or compressed
 */

type MyImage = {
    atime : string,
    atimeMs : number,
    birthtime : number,
    birthtimeMs : number,
    blksize : number,
    blocks : number,
    ctime : string,
    ctimeMs : number,
    dev : number,
    gid : number,
    ino : number,
    mode : number,
    mtime : string,
    mtimeMs : number,
    name : string,
    nlink : number,
    rdev : number,
    size : number,
    uid : number
}

//width = {200} height = {200} filename = {SelectedContent} filedir = {currentDir}
type MediaDisplay = {
    width? : number,
    height? : number,
    filedir? : string,
    onClick? : Function,
    data? : MyImage,
    controls? : boolean,
    media? : Blob,
    passMedia? : (aurl : Blob) => void;
    quality : string,
    noHighlight? : boolean,
    expand? : boolean
}
//className = 'Item File'
//<img width={200} height = {200} className = 'DisplayImage' src = {imgSource} alt = "broken"></img>
export function MediaDisplay(props : MediaDisplay = {quality : 'min'}){
    const vis = useRef(null);
    const [display,setDisplay] = useState<Blob | undefined>(undefined);
    const [sentStatus,setSentStatus] = useState<boolean>(false);
    const {Server} = useContext(AxiosContext);
    //abbort controller is unaware of changes
    const displayRef = useRef(display);
    const StatusRef = useRef(sentStatus);
    const PropsRef = useRef(props);
    PropsRef.current = props;
    displayRef.current = display;
    StatusRef.current = sentStatus;



    const rimg = new RegExp(/\.((png)|(gif)|(jpeg))/,'i');
    const rvideo = new RegExp(/\.((mp4)|(mov)|(wmv)|(webm))/,'i');
    const raudio = new RegExp(/\.((ogg)|(mp3))/,'i');
    
    const isTest = (reg : RegExp) : boolean =>{
        return props.data ? reg.test(props.data.name) : false;
    }


    useEffect(function(){
        //locks sending and gets image
        
        const observer = new IntersectionObserver(function(){

            const qual = PropsRef.current.quality

            if(props.filedir && props.data && props.data.name){
                !StatusRef.current && !displayRef.current &&
                Server.getImg(props.filedir,props.data.name,qual)
                .then((data)=>{
                    console.log(data);
                    setDisplay(data.data);
                    setSentStatus(false);
                })
                .catch((e)=>{
                    console.log(e);
                });
                setSentStatus(true);
            }   
        });

        vis.current && observer.observe(vis.current);
        
        return ()=>{
            observer.disconnect();
        }
    },[])

    const handleClick = ()=>{
        props.onClick && props.onClick();
        //props.passMedia && display && props.passMedia(display);
    }

    return (
        <div className={
            `Item File Media ${props.noHighlight ? "NoHover" : ""} ${props.expand ? "Expand" : ""}`
            } ref = {vis} onClick = {()=>{handleClick()}}
            >
            {!display && sentStatus && <div className='load'></div>}
            {display && isTest(rimg) && <img src = {URL.createObjectURL(display)}/>}
            {display && (isTest(raudio) || isTest(rvideo)) && <label>{props.data?.name}</label>}
            {display && !(isTest(raudio) || isTest(rvideo) || isTest(rimg)) && <label>{props.data?.name}</label>}
            
            {display && null &&
                (
                isTest(rvideo) && <video controls = {props.controls}><source src = {URL.createObjectURL(display)}/></video>
                || isTest(rimg) && <img src = {URL.createObjectURL(display)} alt = "No Image Data"></img> 
                || isTest(raudio) && <audio><source src = {URL.createObjectURL(display)}/></audio>
                )
            }
        </div>
    )
}



export function Browser(){
    type BuildType = {
        directories : Array<{[name : string] : any}>,
        files : Array<MyImage>,
    }
    const {Server} = useContext(AxiosContext);
    const [SelectedContent,SetSelectedContent] = useState<null | MyImage>(null);
    const [currentDir,setCurrentDir] = useState<string>("/");
    const [dirLock,setDirLock] = useState<boolean>(false);
    const [dirData,setDirData] = useState<BuildType>({directories : [],files : []});
    
    //for displaying data
    const [imgSource, setImgSource] = useState<any>(null);


    useEffect(()=>{
        //SelectedContent && setImgSource(Server.toNetworkImage(currentDir,SelectedContent));
        SelectedContent && Server.getImg(currentDir,SelectedContent.name,"max").then(data=>{
            setImgSource(URL.createObjectURL(data.data));
        });
    },[SelectedContent])

    useEffect(()=>{
        //directories : [] | files : []
        Server.dir(currentDir)
        .then(data=>{
            if(data.status === 200){
                setDirData(data.data);
                setDirLock(false);
            }
        })
        .catch(()=>{

        });
    },[currentDir])

    const buildCategories = (filelist : MyImage[]) : React.ReactNode[] =>{
        const ret : React.ReactNode[] = [];
        //seperate based on date
        let res : {[name : number] : Array<MyImage>} = dirData.files
        .reduce((axx : {[name : string] : any},item : MyImage)=>{
            const newtime : number = Math.floor(item.birthtimeMs / (24 * 60 * 60 * 1000));
            axx[newtime] ? axx[newtime].push(item) : axx[newtime] = [item];
            return axx;
        },{})
        //build objects
        for(let key in res){
            const adate = new Date(Number(key) * 24 * 60 * 60 * 1000);
            const aday = adate.getDate();
            const ayear = adate.getFullYear();
            const amonth = adate.getMonth();
            
            ret.push(
                <div key = {key} className = 'MediaContainer'>
                    <label>{`${ayear} ${amonth} ${aday}`}</label>
                    {
                        res[key].map((item, i)=>{

                            return <MediaDisplay
                                
                                onClick = {()=>{SetSelectedContent(item)}}
                                key = {i}
                                data = {item}
                                filedir = {currentDir}
                                quality = 'min'
                            />
                        })
                    }
                </div>
            )
        }
        return ret;
    }
    //data = {SelectedContent} filedir = {currentDir}
    //<img width={200} height = {200} className = 'DisplayImage' src = {imgSource} alt = "broken"></img>
    return (
        <div className='BrowserContainer'>
            {SelectedContent &&  <div className='DisplayContent'><button onClick={()=>{
                Server.InitController();
                SetSelectedContent(null);
            }}>close</button>
            <MediaDisplay filedir={currentDir} data = {SelectedContent} quality = 'full' noHighlight = {true}
             />
            </div>
            }
            <div className='Header'></div>
            <div className='FileContainer'>
                <button onClick={()=>{setCurrentDir(path.dirname(currentDir))}}>../</button>
                {
                    dirData.directories.map((item,i)=>(
                        <div key = {'d' + i} className = 'Item Directory'
                            onClick={()=>{
                                Server.controller.abort();
                                Server.InitController();
                                
                                !dirLock && setCurrentDir(path.join(currentDir,item.name))
                                !dirLock && setDirLock(true);
                                
                            }}
                        >
                            {item.name}
                        </div>
                    ))
                }
                {
                    buildCategories(dirData.files)
                }

            </div>
        </div>
    )
}