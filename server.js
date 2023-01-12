
const express = require('express');
const knex = require('knex')
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fsp = require('fs/promises');
const fs = require('fs');
const {makeToken,hashCode} = require('./serverFunctions');
const crypto = require('crypto');
//{makeToken,hashCode}
/**
 * The multer middleware goes filter -> destination -> filname
 */



const rootDirectory = path.join(__dirname,"FileSystem");

//database
const dbSettings = {
    client : 'sqlite3',
    connection : {
        filename : './database/data.sqlite3'
    },
    useNullAsDefault : true,
};

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
    let ret = fs.readdirSync(dir);
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
    const gmail = req.session.user;
    const userdir = GetPrimaryDirectory(gmail);
    const filename = file.originalname;

    //see if root path exists. If it doesn't create it
    //const dirExists = fs.accessSync(userdir);
    const dirExists = fs.existsSync(userdir);
    if(!dirExists){
        //create the directory
        createUserDirectory(gmail);
    }
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


/**
 * @type {knex.Knex}
 */
const db = knex(dbSettings);
//app
const port = 8060;
const app = express();


app.set('trust proxy',1);
app.use(session({
    secret : 'it is as clear as in is on paper',
    resave: false,
    saveUninitialized: true
}));
app.use(cors({
    origin: 'http://localhost:5173', // use your actual domain name (or localhost), using * is not recommended
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'],
    credentials: true
}));

app.use(express.json());
const passcode = 'admin';



//create white listed users
const startup = async ()=>{
    await db.schema.createTable('whitelist',function (table){
    table.increments();
    table.string('gmail');
    table.string('token');
    }).then(()=>{console.log('whitelist created')});

    await db('whitelist').insert([{gmail : 'mrmartinwatson@gmail.com'},{gmail : 'mrmarcuswatson@gmail.com'}]).then(()=>{
        console.log('names inserte');
    })
}

//generates unique tokens for each user
const UniqueToken = async ()=>{
    const idlist = await db('whitelist').select('id').then(data => data);
    idlist.map(async (item)=>{
        await db('whitelist').where('id','=',item.id).update({'token' : makeToken()})
    })
}

//UniqueToken();

//create if not table not exists
db.schema.hasTable('whitelist').then((exists)=>{
    if(!exists)startup();
    //make a new token for every user
    //db('whitelist').update({'token' : makeToken()}).then(()=>{console.log('token refreshed')});
});


//authentication middleware
const isWhitelisted  = async (req,res,next)=>{
    //check authentication
    if(req.session && req.session.SessionToken){
        //if authenticated, go ahead
        next()
    }else {
        //not authenticated
        res.sendStatus(401)
    }

}

//home page
app.get('/',(req,res)=>{
    db('whitelist').select('*').then((data)=>{
        res.send(data);
    }).catch((e)=>{
        console.log(e);
    })
})

//status code 401 for unautharized
//status 200, accepted
//send us a gmail, we send back a session 
//cookie that holds the address of the token 
//otherwise redirect to homepage via
/**
 * requires a body with gmail and user in the description
 * sends back 401(unautharized) or 200(accepted)
 * 400(bad request) || 500(crash unexpectedly)
 * 
 */
app.post('/login',async (req,res)=>{
    const gmail = req.body && (req.body.gmail || req.body.gmail === '');
    if(!gmail) return res.sendStatus(400);
    await db('whitelist').select('gmail','token').then(async (data)=>{
        const token = data.find((item)=> item.gmail == gmail);
        //if has token see if token exists
        const hasToken = req.session.SessionToken && await db('whitelist')
        .whereRaw('token = ?',[req.session.SessionToken])
        .then(data => data.length == 1);
        
        if(token || hasToken){
            //check if dir exists, if not create it
            if(!HasPrimaryDirectory(gmail)){
                createUserDirectory(gmail);
            }
        }

        //found and send
        if(token){
            req.session.SessionToken = token.token;
            req.session.user = gmail;
            res.sendStatus(200);
        }else if(hasToken){
            res.sendStatus(200);
        }else {
            res.sendStatus(401);
        }
    }).catch((e)=>{
        console.log(e);
        //something went wrong
        res.sendStatus(500)
    })
    
    //res.sendStatus(401);
});

app.post('/logout',(req,res)=>{
    if(req.session.SessionToken){
        req.session.SessionToken = null;
        req.session.user = null;
    }
    res.sendStatus(200);
});

app.get('/account/user',isWhitelisted,(req,res)=>{
    res.send("you seem to be logged in");
})


//upload images to database
app.post('/account/upload',isWhitelisted,upload.any(),(req,res)=>{
    console.log(req.files);
    
    res.sendStatus(200);
});
//gets the fild fileid is the path to the file from main file store
app.get('/accout/file/:fileid',isWhitelisted,(req,res)=>{
    res.send("here");
});

//send back the main directory
app.get('/account/list',isWhitelisted,(req,res)=>{
    //listDirectory,getprimarydir
    const primdir = GetPrimaryDirectory(req.session.user);
    const adir = listDirectory(primdir);
    res.send(adir);
});

app.get('/account/listsecret',isWhitelisted,(req,res)=>{

});
//list files and directories located in a speific folder
//directory is always defined
app.get('/account/list/:directory',isWhitelisted,(req,res)=>{
    const adir = req.params.directory;
    console.log(adir,adir == 'undefined',adir =='null',typeof adir);
    
    res.send({"files" : [],"directories" : []});
})

app.get('account/metadata',isWhitelisted,(req,res)=>{
    res.send({"msg" : "Where the problem at?"})
});

app.listen(port,()=>{
    console.log(`listening on port : ${port}`);
})