const multer = require('multer');
const path = require('path');
const fsp = require('fs/promises');
const fs = require('fs');

const {makeToken,hashCode} = require('./serverFunctions');

const {rootDirectory} = require('./DatabaseFunctions');

//{makeToken,hashCode}
/**
 * The multer middleware goes filter -> destination -> filname
 */


//files for handling destination
/**
 * user example : mrmartinwatson.
 * user is the [someperson]@gmail.com
 * of an email address.
 * returns the primary compartment for storing data
 */

const GetPrimaryDirectory = (gmail) =>{
    const user = gmail.split('@')[0];
    const userhash = hashCode(gmail).toString()
    const apath = path.join(rootDirectory,user + userhash);
    return apath;
}
function HasPrimaryDirectory(gmail){
    const apath = GetPrimaryDirectory(gmail);
    return fs.existsSync(apath);
}

function createUserDirectory(gmail){
    //create file system
    //add files to data base
    const userDir = GetPrimaryDirectory(gmail);
    fs.mkdirSync(userDir,{recursive : true});
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
const StorageFilter = function(req,file,cb){
    //don't upload if we don't have a directory
    if(!req.body.path) cb(null,false);
    //console.log(req.params.adir,"dirname");
    const gmail = req.session.user;
    let userdir = GetPrimaryDirectory(gmail);
    userdir = path.join(userdir,req.body.path)
    const filename = file.originalname;

    //see if root path exists. If it doesn't create it
    //const dirExists = fs.accessSync(userdir);

    const dirExists = fs.existsSync(userdir);
    //don't advance if the path doesn't already exists
    if(!dirExists) return cb(null,false);
    //check to see if the directory has file
    const knownNames = listDirectory(userdir);
    const collision = knownNames.indexOf(filename) != -1;
    let FinalName = filename;
    if(collision){
        //todo check if the file is exactly the same
        const ext = path.extname(FinalName);
        const base = path.filename(FinalName);
        FinalName = base + Date.now().toString() + ext;
    }
    file.StorageName = FinalName;
    file.StorageDir = userdir;

    cb(null,true);
}

const upload = multer({storage : storage,fileFilter : StorageFilter});


module.exports = {
    upload,
    listDirectory,
    createUserDirectory,
    HasPrimaryDirectory,
    GetPrimaryDirectory
}