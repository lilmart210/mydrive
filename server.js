
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const bcryypt = require('bcrypt');
const exif = require('jpeg-exif');
const mime = require('mime');


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
const { isWhitelisted, isAdmin,db,rootDirectory,ensureDirectories,checkjwt } = require('./DatabaseFunctions');
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
    origin: ['http://localhost:5173','drive.curruptnation.com'], // use your actual domain name (or localhost), using * is not recommended
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'],
    credentials: true
}));

app.use(express.json());



app.post('/admin',checkjwt,isWhitelisted,isAdmin,(req,res)=>{
    res.sendStatus(200);
})

app.post('/admin/userdata',checkjwt,isWhitelisted,isAdmin,(req,res)=>{
    
    const pckg = {}
    if(req.body.whitelist != null) pckg.whitelist =  req.body.whitelist ? true : false;
    if(req.body.admin != null) pckg.admin = req.body.admin
    if(req.body.email == null) return res.sendStatus(403)
    if(req.body.email != null) pckg.email = req.body.email;
    db('Users')
    .where({email : pckg.email})
    .update(pckg)
    .then(()=>res.sendStatus(200))
    .catch(()=>res.sendStatus(500))
});

//implement a flag for passwords that increment based on current allowed tokens
//example. Creation = 1; we can log out every token simply by increasing the 
//creation value inside the token to some arbitrary number like 2; doing this will
//disable any older logins and force the user to sign in manually in order to regain token/
//refresh api access while still remaining stateless 
app.post('/user/changepassword',checkjwt,isWhitelisted,(req,res)=>{
    if(!req.body.password || !req.body.newPassword)return res.sendStatus(400);
    //we have a password and old password
    const newhash = bcryypt.hashSync(req.body.newPassword,10);
    //verify the password
    if(bcryypt.compareSync(req.body.password,req.meta.password)){
        db('Users')
        .select()
        .where({email : req.meta.email})
        .update({password : newhash})
        .then(()=>res.sendStatus(200))
        .catch(()=>res.sendStatus(500));
    }else {
        res.sendStatus(403);
    }

})

app.get("/admin/tables",checkjwt,isWhitelisted,isAdmin,async(req,res)=>{
    db('Users')
    .select('whitelist','email','username','admin')
    .then(rows=>{
        res.status(200).json(rows);
    })
    .catch(()=>{
        res.status(500);
    });
})

app.get('/admin/whitelist',checkjwt,isWhitelisted,isAdmin,(req,res)=>{
    db('Users')
    .select('*')
    .then(rows=>{
        res.send(rows);
    })
    .catch(()=>{
        res.sendStatus(500);
    })
})
app.get('/admin/rootpath',checkjwt,isWhitelisted,isAdmin,async (req,res)=>{
    const apath = await rootDirectory;
    res.send(apath);
})

app.post('/admin/newUser',checkjwt,isWhitelisted,isAdmin,(req,res)=>{
    const email = req.body && (req.body.email || req.body.email === '');
    if(!email) return res.sendStatus(400);

    db('Users')
    .insert({email : email})
    .then(()=>{
        res.sendStatus(200)
    })
    .catch(()=>{
        res.sendStatus(500)
    })
});

app.post('/admin/setDirectory',checkjwt,isWhitelisted,isAdmin,(req,res)=>{
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

//upload to file system
app.post('/account/upload',checkjwt,isWhitelisted,upload.any(),(req,res)=>{
    res.sendStatus(200);
});

app.get('/image/get/user/:token/dir/:dir/name/:name/comp/:compression',checkjwt,isWhitelisted,async(req,res)=>{
    //delim is !aasd!aa
    
    const newbody = {
        name : req.params.name,
        path : req.params.dir.replace('!aasd!aa','/')
    }
    req.body = newbody;
    

    const filepath = await GetRequestFilePath(req);
    const fileexists = fs.existsSync(filepath);
    if(!fileexists) return res.sendStatus(404);

    const qual = req.params.compression;

    //needs to be in sync with the request
    const rimg = new RegExp(/\.((png)|(gif)|(jpeg)|(jpg))/,'i');
    const rvideo = new RegExp(/\.((mp4)|(mov)|(wmv)|(webm)|(mkv))/,'i');
    const raudio = new RegExp(/\.((ogg)|(mp3))/,'i');

    const isphoto = rimg.test(filepath);
    const isVideo = rvideo.test(filepath);
    const isAudio = raudio.test(filepath);
    const iselse = !(isphoto || isVideo || isAudio)

    if(isphoto){
        let imgdata = sharp(filepath)
        .jpeg({mozjpeg : true})

        if(qual == 'min'){
            imgdata = imgdata.resize(200,200,{fit : 'contain'})
        }

        imgdata
        .toBuffer()
        .then(buf =>{
            res.send(buf)
            //console.log('full ',buf.length);
        })
        .catch((e)=>{
            console.log("err",e);
            res.sendStatus(500);
        })

    } else if(isAudio || isVideo){
        //console.log(req.headers);
        //res.sendFile(filepath);
        //range: 'bytes=3604480-4194303',
        //range: 'bytes=3604480-',
        //range: 'bytes=0-'
        ///const vidpath = "C:/Users/mrmar/OneDrive/Desktop/mydrive/FileSystem/admin92668751/Citrus(MarcusWatson) - Discord 2022-03-25 00-01-50.mp4";
        const vidpath = filepath;
        //send as partial data.
        let range = req.headers.range;
        const fileStat = fs.statSync(vidpath);
        const videoSize = fileStat.size;
        const CHUNK_SIZE = 10 ** 6;
        if (!range) {
            const conttype = mime.getType(vidpath.split('.').pop())
            
            const headers = {
                //"Content-Range": `bytes ${0}-${videoSize}/${videoSize}`,
                //"Accept-Ranges": "bytes",
                "Content-Length": videoSize,
                "Content-Type": conttype,
            };
            
            res.writeHead(200, headers);
            const videoStream = fs.createReadStream(vidpath);
            videoStream.pipe(res);
        }else{    
            const parts = range.replace('bytes=','').split('-');
    
            const start = parseInt(parts[0]);
            const end = parts[1] != '' ? parseInt(parts[1]) : Math.min(start + CHUNK_SIZE, videoSize - 1);
    
            const contentLength = end - start + 1;
            
            const conttype = mime.getType(vidpath.split('.').pop())
    
            const headers = {
                "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": contentLength,
                "Content-Type": conttype,
            };
            
            res.set('Content-Type','video/mp4');
            res.writeHead(206, headers);
            const videoStream = fs.createReadStream(vidpath, { start, end });
            videoStream.pipe(res);
        }
    } else if(iselse){
        //dunno what this is, send as raw text
        res.sendFile(filepath);
    }

})

//create folders | escape (../) vunlerability?
app.post('/create/dir',checkjwt,isWhitelisted,async(req,res)=>{
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


app.post('/account/list',checkjwt,isWhitelisted,async (req,res)=>{
    //req.params.path
    //listDirectory,getprimarydir
    const dirpath = await getRequestDirectory(req);
    //read directory
    fsp.readdir(dirpath,{withFileTypes : true})
    .then((data)=>{
        
        const alldirs = data.filter(item => item.isDirectory());
        const allfiles = data.filter(item =>!item.isDirectory());
        //jpgs have extra

        const filesStats = allfiles.map((item)=>{
            let stats = fs.statSync(path.join(dirpath,item.name));;
            const rimg = new RegExp(/\.((jpg)|(jpeg))/,'i');
            if(rimg.test(item.name)){
                const morestats = exif.parseSync(path.join(dirpath,item.name));
                stats = {...stats,...morestats}
            }

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

app.get('/account/listsecret',checkjwt,isWhitelisted,(req,res)=>{

});

//before we listen we must make sure everything is in order
async function InitialCheck(){
    //initialize the tables 
    const check1 = db.schema.hasTable('Users').then(async (exists)=>{
        if(!exists){
            //create the whitelist table
            await db.schema.createTable('Users',(table)=>{
                table.increments();
                table.string('username');
                table.string('email').unique().primary();
                table.string('password');
                table.json('favorite');
                table.json('secretfavorite');
                table.json('shared');
                table.json('secretshared');
                table.json('drives');
                table.string('maindrive');
                table.string('secretdrive');
                table.string('trashdrive');
                table.binary('ProfilePicture');
                table.json('accessTokens');
                table.json('refreshTokens');
                table.boolean('admin');
                table.boolean('whitelist');
                //secret, trash will be actual folders

            }).then(()=>{console.log("initialized table")})
            //password : 'admin',
            await db('Users').insert([{
                username: 'admin',
                email : 'admin',
                password: bcryypt.hashSync('admin',10),
                admin : true,
                whitelist : true
            }]).then(async ()=>{
                await ensureDirectories('admin');
                console.log('inserted user admin password admin. Change at /admin')
                
            })
            //default user is admin
            //add users through admin panel

        }
    })
    //set the base directory to be ./FileSystem
    const check2 = db.schema.hasTable('meta').then(async (exists)=>{
        if(!exists){
            await db.schema.createTable('meta',(table)=>{
                table.string('directory')
            }).then(()=>{console.log('initilizad server meta. change at /admin')})
            await db('meta').insert([{'directory':path.join(__dirname,'FileSystem')}]).then(()=>{
                console.log('primary directory created');
            });
        }
    })
    
    
    await Promise.allSettled([check1,check2,rootDirectory])
    .then(()=>{console.log("finished Server checks")})
    .catch(()=>{console.error("couldn't finish checks, aborting...")})
    //host the server
    app.listen(port,()=>{
        console.log(`listening on localhost:${port}/`);
    })
}

InitialCheck()