
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * todo
 * logout clear token
 * token time out 
 */

/**
 * @type {fs.promises}
 */
const fsp = require('node:fs/promises');
const { HasPrimaryDirectory,upload,GetRequestFilePath,getRequestDirectory,createUserDirectory } = require('./DirectoryMiddleware');
const { isWhitelisted, isAdmin,db,rootDirectory } = require('./DatabaseFunctions');
const {makeToken} = require('./serverFunctions');


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

/**
 * requires a body with gmail and user in the description
 * sends back 401(unautharized) or 200(accepted)
 * 400(bad request) || 500(crash unexpectedly)
 * 
 */
app.post('/login',async (req,res)=>{
    
    const gmail = req.body && (req.body.gmail || req.body.gmail === '');
    const password = req.body && (req.body.password || req.body.gmail === '');

    if(!req.session.SessionToken && (!gmail || !password)) return res.sendStatus(400);

    db('whitelist')
    .select('gmail','token','password')
    .then(async (data)=>{
        const token = data.find((item)=> item.gmail == gmail && item.password == password);
        //if has token see if token exists
        const hasToken = req.session.SessionToken && await db('whitelist')
        .whereRaw('token = ?',[req.session.SessionToken])
        .then(data => data.length == 1);
        
        //initialize user, make sure it has required fields
        if(token || hasToken){
            const agmail = token ? token.gmail : req.session.user
            //check if dir exists, if not create it
            const hasprimary = await HasPrimaryDirectory(agmail);
            if(!hasprimary){
                await createUserDirectory(agmail);
            }
        }

        //found and send
        if(token){
            //create session token
            const newToke = makeToken();
            req.session.SessionToken = newToke;
            req.session.user = token.gmail;
            
            await db('whitelist').where({gmail : token.gmail}).update({token : newToke}).then(()=>{});
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

app.post('/admin',isWhitelisted,isAdmin,(req,res)=>{
    res.sendStatus(200);
})

app.get('/admin/whitelist',isWhitelisted,isAdmin,(req,res)=>{
    db('whitelist')
    .select('*')
    .then(rows=>{
        res.send(rows);
    })
    .catch(()=>{
        res.sendStatus(500);
    })
})
app.get('/admin/rootpath',isWhitelisted,isAdmin,async (req,res)=>{
    const apath = await rootDirectory;
    res.send(apath);
})

app.post('/admin/newUser',isWhitelisted,isAdmin,(req,res)=>{
    const gmail = req.body && (req.body.gmail || req.body.gmail === '');
    if(!gmail) return res.sendStatus(400);

    db('whitelist')
    .insert({gmail : gmail})
    .then(()=>{
        res.sendStatus(200)
    })
    .catch(()=>{
        res.sendStatus(500)
    })
});

app.post('/admin/setDirectory',isWhitelisted,isAdmin,(req,res)=>{
    const apath = req.body && req.body.path;
    //root -> dir
    db('root').update({dir : apath})
    .then(()=>{
        res.sendStatus(200);
    })
    .catch(()=>{
        res.sendStatus(500);
    })
    console.log('Home Directory Changed : restart needed');

});

app.post('/logout',(req,res)=>{
    if(req.session.SessionToken){
        req.session.SessionToken = null;
        req.session.user = null;
    }
    res.sendStatus(200);
});

app.post('/signup',(req,res)=>{
    //gmail and password
    const gmail = req.body && (req.body.gmail || req.body.gmail === '');
    const password = req.body && (req.body.password || req.body.gmail === '');

    if(!gmail || !password) return res.sendStatus(400);

    db('whitelist')
    .select('password','gmail')
    .where({gmail : gmail})
    .then(async row =>{
        const elem = row[0];
        if(!elem.password){
            await db('whitelist')
            .where({gmail : gmail})
            .update({password : password})
            .then(()=>{
                res.sendStatus(200);
            })
            .catch(()=>{
                res.sendStatus(500);
            })
        }else {
            res.sendStatus(401);
        }
    })
    .catch(()=>{
        res.sendStatus(401)
    })
})

//upload to file system
app.post('/account/upload',isWhitelisted,upload.any(),(req,res)=>{ 
       
    res.sendStatus(200);
});


app.post('/account/get',isWhitelisted,async(req,res)=>{
    const filepath = await GetRequestFilePath(req);
    const fileexists = fs.existsSync(filepath);
    if(!fileexists) return res.send(404);

    const qual = req.body.compression;
    
    //const exists = fs.existsSync(path.join(basedir,"hw4.png"));
    //const exists = fs.existsSync(filepath);
    const rimg = new RegExp(/\.((png)|(gif)|(jpeg))/,'i');
    const rjpeg = new RegExp(/\.(jpeg)/,'i');
    const rgif = new RegExp(/\.(gif)/,'i');
    const rpng = new RegExp(/\.(png)/,'i');
    const rvideo = new RegExp(/\.((mp4)|(mov)|(wmv)|(webm))/,'i');
    const raudio = new RegExp(/\.((ogg)|(mp3))/,'i');

    const isphoto = rimg.test(filepath);
    const isVideo = rvideo.test(filepath);
    const isAudio = raudio.test(filepath);
    const isPng = rpng.test(filepath);
    const isJpeg = rjpeg.test(filepath);
    const isGif = rgif.test(filepath);
    
    
    if(isphoto && qual == 'full'){
        sharp(filepath)
        .jpeg({mozjpeg : true})
        .toBuffer()
        .then(buf =>{
            res.send(buf)
            //console.log('full ',buf.length);
        })
        .catch((e)=>{
            console.log("err",e);
            res.sendStatus(500);
        })
    }
    else if(isphoto && qual == 'min'){
        sharp(filepath)
        .resize(200,200,{fit : 'contain'})
        .jpeg({mozjpeg : true})
        .toBuffer()
        .then(buf=>{
            res.send(buf);
            //console.log('min ',buf.length)
        })
        .catch((e)=>{
            console.log(e);
        })
    }
    else if((isAudio || isVideo) && qual == 'full'){
        res.sendFile(filepath);
    }
    else {
        //dunno what this is, send as raw text
        res.sendFile(filepath);
    }
})

//create folders | escape (../) vunlerability?
app.post('/create/dir',isWhitelisted,async(req,res)=>{
    const base = await getRequestDirectory(req);
    const reqPath = path.join(base,req.body.name);
    const pathexists = fs.existsSync(reqPath);

    if(pathexists) {
        //path aleady exists
        res.sendStatus(200);
    }else {
        fs.mkdir(reqPath,()=>{
            res.sendStatus(200);
        },(e)=>{
            console.log(e);
            res.sendStatus(401);
        })
    }
})


app.post('/account/list',isWhitelisted,async (req,res)=>{
    //req.params.path
    //listDirectory,getprimarydir
    const dirpath = await getRequestDirectory(req);
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

//before we listen we must make sure everything is in order
async function InitialCheck(){
    //initialize root database dir path
    const rrr = await rootDirectory;
    
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
            //password : 'admin',
            await db('whitelist').insert([{gmail : 'admin',admin : true}]).then(()=>{
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
    
    
    //Everything has been loaded
    console.log("database loaded. Change settings at Localhost/admin")
    //host the server
    app.listen(port,()=>{
        console.log(`listening on localhost:${port}/`);
    })
}

InitialCheck()