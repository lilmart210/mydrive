
const express = require('express');
const knex = require('knex')
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * @type {fs.promises}
 */
const fsp = require('node:fs/promises');
const {db,isWhitelisted,isAdmin,UniqueToken,rootDirectory,startup,InitMainDirectory} = require('./DatabaseFunctions');
const {upload,listDirectory,createUserDirectory,HasPrimaryDirectory,GetPrimaryDirectory} = require('./DirectoryMiddleware');
const {makeToken ,hashCode} = require('./serverFunctions');

//app
const port = 8060;
const app = express();


app.set('trust proxy',1);
app.use(session({
    secret : 'it is as clear as ink is on paper',
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
    const password = req.body && (req.body.password || req.body.gmail === '');

    if(!gmail || !password) return res.sendStatus(400);

    await db('whitelist').select('gmail','token','password').then(async (data)=>{
        const token = data.find((item)=> item.gmail == gmail && item.password == password);
        //if has token see if token exists
        const hasToken = req.session.SessionToken && await db('whitelist')
        .whereRaw('token = ?',[req.session.SessionToken])
        .then(data => data.length == 1);
        
        if(token || hasToken){
            const agmail = token ? token.gmail : req.session.user
            //check if dir exists, if not create it
            if(!HasPrimaryDirectory(agmail)){
                await createUserDirectory(agmail);
            }
        }

        //found and send
        if(token){
            //create session token
            const newToke = makeToken();
            req.session.SessionToken = newToke;
            req.session.user = token.gmail;
            
            await db('whitelist').where({gmail : token.gmail}).update({token : newToke}).then();
            res.sendStatus(200);
        }else if(hasToken){
            console.log(req.session);
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
//create a folder at given directory if dir already exists 
app.post('/account/upload/create',isWhitelisted,(req,res)=>{
    //where is the prefix for this coming from?
    const basedir = GetPrimaryDirectory(req.session.user);
    const dirname = path.join(basedir,req.body.dirname);
    const adir = req.body.path;
    console.log(adir,dirname);
    fsp.exists(dirname).then((found)=>{
        return found && res.sendStatus(400) ||
        !found && fsp.mkdir(path.join(dirname,adir))
        .then(()=>{res.sendStatus(201)})
        .catch(()=>{res.sendStatus(500)})
    }).catch(()=>res.send(500));
});

app.post('/account/image',isWhitelisted,async(req,res)=>{
    const aname = req.body.name;
    const adir = req.body.path;
    //do we want it full quality or not
    //preview = min,full 
    const prev = req.body.compression; 
    const basedir = GetPrimaryDirectory(req.session.user);
    const filepath = path.join(basedir,adir,aname);
    //const exists = fs.existsSync(path.join(basedir,"hw4.png"));
    //const exists = fs.existsSync(filepath);
    const rimg = new RegExp(/\.((png)|(gif)|(jpeg))/,'i');
    const rvideo = new RegExp(/\.((mp4)|(mov)|(wmv)|(webm))/,'i');
    const raudio = new RegExp(/\.((ogg)|(mp3))/,'i');

    const isphoto = rimg.test(filepath);
    const isVideo = rvideo.test(filepath);
    const isAudio = raudio.test(filepath);
    
    if(isphoto && prev == 'full'){
        sharp(filepath)
        .png()
        .jpeg()
        .gif()
        .toBuffer()
        .then(buf =>res.send(buf));
    }
    else if(isphoto && prev == 'min'){
        sharp(filepath)
        .resize(100,100,{fit : 'contain',withoutEnlargement : true})
        .png({progressive : true, force : false,compressionLevel :0})
        .jpeg({progressive : true, force : false, quality : 100})
        .gif({progressive : true, force : false, quality : 100})
        .toBuffer()
        .then((buf)=>{
            res.send(buf)
            //console.log(buf);
        }).catch(()=>{
            console.log("no good",filepath);
        })
    }else{
        res.sendStatus(200);
    }

})

//create folders
app.post('/create/dir',isWhitelisted,(req,res)=>{
    const primdir = GetPrimaryDirectory(req.session.user);
    const apath = req.body.path;
    const dirname = req.body.name;
    const newdir = path.join(primdir,apath,dirname);
    const pathexists = fs.existsSync(newdir);

    if(pathexists) {
        //path aleady exists
        res.sendStatus(200);
    }else {
        fs.mkdir(newdir,()=>{
            res.sendStatus(200);
        },(e)=>{
            res.sendStatus(401);
        })
    }
})

//send back the main directory
app.post('/account/list',isWhitelisted,async (req,res)=>{
    //req.params.path
    //listDirectory,getprimarydir
    const primdir = await GetPrimaryDirectory(req.session.user);
    const dirpath = path.join(primdir,req.body.path);
    console.log(dirpath,"dd",primdir);
    //read directory
    fsp.readdir(dirpath,{withFileTypes : true})
    .then((data)=>{
        
        const alldirs = data.filter(item => item.isDirectory());
        const allfiles = data.filter(item =>!item.isDirectory());
        const filesStats = allfiles.map((item)=>{
            const stats = fs.statSync(path.join(dirpath,item.name));
            return {
                name : item.name,
                ...stats
            }
        })
        res.send({"directories" : alldirs,"files" : filesStats});
    })
    .catch(()=>{
        res.sendStatus(400);
    })
});

app.get('/account/listsecret',isWhitelisted,(req,res)=>{

});
//list files and directories located in a speific folder
//directory is always defined
app.get('/account/list/:directory',isWhitelisted,(req,res)=>{
    const adir = req.params.directory;
    //console.log(adir,adir == 'undefined',adir =='null',typeof adir);
    
    res.send({"files" : [],"directories" : []});
})

app.get('account/metadata',isWhitelisted,(req,res)=>{
    res.send({"msg" : "Where the problem at?"})
});

app.post('/account/admin',isWhitelisted,isAdmin,(req,res)=>{
    res.send(200);
});

app.post('/account/admin/newuser',isWhitelisted,isAdmin,(req,res)=>{
    res.send(200);
});

app.post('/account/admin/update',isWhitelisted,isAdmin,(req,res)=>{
    res.send(200);
});


//before we listen we must make sure everything is in order
async function InitialCheck(){
    //initialize root database dir path
    const rrr = await rootDirectory;
    console.log("initial check" ,rootDirectory,typeof rootDirectory);
    //InitMainDirectory();
    //knex makes sure the database always exists
    //initialize the tables 
    await db.schema.hasTable('whitelist').then(async (exists)=>{
        if(!exists){
            //create the whitelist table
            await db.schema.createTable('whitelist',(table)=>{
                table.increments();
                table.string('gmail');
                table.string('password');
                table.string('token');
                table.json('favorite');
                table.json('secretfavorite');
                table.json('shared');
                table.json('secretshared');
                table.json('drives');
                table.string('maindrive');
                table.string('secretdrive');
                table.string('trashdrive');
                table.boolean('admin');
                //secret, trash will be actual folders

            }).then(()=>{console.log("initialized table")})
            
            await db('whitelist').insert([{gmail : 'admin',password : 'admin',admin : true}]).then(()=>{
                console.log('inserted user admin password admin. Change at /admin')
            })
            //default user is admin
            //add users through admin panel

        }
    })
    //set the base directory to be ./FileSystem
    await db.schema.hasTable('meta').then(async (exists)=>{
        if(!exists){
            await db.schema.createTable('meta',(table)=>{
                table.string('directory')
            }).then(()=>{console.log('initilizad server meta. change at /admin')})
            await db('meta').insert([{'directory':path.join(__dirname,'FileSystem')}]).then(()=>{
                console.log('primary directory created');
            });
        }
    })
    
    
    //make sure the 
    console.log("database loaded. Change settings at Localhost/admin")
    app.listen(port,()=>{
        console.log(`listening on port : ${port}`);
    })
}

InitialCheck()