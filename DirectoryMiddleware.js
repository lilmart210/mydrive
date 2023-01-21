const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {makeToken,hashCode} = require('./serverFunctions');

const {rootDirectory} = require('./DatabaseFunctions');
const {db} = require('./DatabaseFunctions');

/**
 * The multer middleware goes filter -> destination -> filname
 */


/**
 * user example : mrmartinwatson.
 * user is the [someperson]@gmail.com
 * of an email address.
 * ensures a drive is available
 * returns the primary compartment for storing data
 */
const GetPrimaryDirectory = async (gmail) =>{
    //table must have
    //favorite,secretfavorite,shared
    //secretshared,drives,maindrive
    //secretedrive,trashdrive
    let adrivepath =

    db('whitelist')
    .where({gmail : gmail})
    .select('maindrive')
    .then((drive)=>drive[0].maindrive);

    return adrivepath;
}

//check if primary directory exists. Syncronous
async function HasPrimaryDirectory(gmail){
    const apath = await GetPrimaryDirectory(gmail);
    return fs.existsSync(apath);
}

//creates the user directory
async function createUserDirectory(gmail){
    const user = gmail.split('@')[0];
    const userhash = hashCode(gmail).toString();
    const apath = path.join(await rootDirectory,user + userhash);
    
    await db('whitelist')
    .where({gmail : gmail})
    .select('maindrive')
    .update({maindrive : apath})
    .then(()=>{});

    fs.mkdirSync(apath,{recursive : true},()=>{});

    return true;
}

async function getRequestDirectory(req){
    //if request has specifified drive, switch over
    const dir = GetPrimaryDirectory(req.session.user)
    .then(abasedir=>{
        const dirname = path.join(abasedir,req.body.path);
        return dirname;
    })
    return dir;
}

async function GetRequestFilePath(req){
    const dir = getRequestDirectory(req)
    .then(apath=>{
        const dirname = path.join(apath,req.body.name);
        return dirname;
    })
    return dir;
}


function listDirectory(dir){
    let ret = fs.readdirSync(dir,{withFileTypes : true});
    return ret;
}



//middleware for storing files
/**
 * if the destination doesn't eists, create it
 * filter -> destination -> filname
 * 
 * Filename Goal :
 * Check if file exists, if it exists, rename it
 * Destination goal : 
 * return the path found from filter
 */
const storage = multer.diskStorage({
    destination : function(req,file,cb){
        //storage name is the name i gave it
        //console.log("destination",file.StorageName);
        cb(null,file.StorageDir);
        
    },
    filename : function(req,file,cb){
        //const extname = path.extname(file.originalname);
        //console.log("filename");
        cb(null,file.StorageName)
    }
});


/**
 * Refuse Duplicate files that have the same content
 * Duplicate File names that are not the same, the newest one gets renamed
 * filter -> destination -> filname
 * will make sure the user directory exists
 * creates root path. Won't create path from request
 * 
 * Goal : Refuse Paths that do not exists
 */
const StorageFilter = async function(req,file,cb){
    try{
        const adir = await getRequestDirectory(req);

        const filename = file.originalname;
        //see if path exists. Don't create a new one.
        const dirExists = fs.existsSync(adir);
        //don't advance if the path doesn't already exists
        if(!dirExists) return cb(null,false);
        //check to see if the directory has file
        const knownNames = listDirectory(adir);
        const collision = knownNames.indexOf(filename) != -1;
        let FinalName = filename;
        if(collision){
            //todo check if the file is exactly the same
            
            //not the same
            const ext = path.extname(FinalName);
            const base = path.filename(FinalName);
            FinalName = base + Date.now().toString() + ext;
        }
        file.StorageName = FinalName;
        file.StorageDir = adir;

        cb(null,true);
    } catch (e){
        console.log(e);
        cb(null,false);
    }
}

const upload = multer({storage : storage,fileFilter : StorageFilter});


module.exports = {
    upload,
    listDirectory,
    createUserDirectory,
    HasPrimaryDirectory,
    GetPrimaryDirectory,
    getRequestDirectory,
    GetRequestFilePath
}