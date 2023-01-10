
const express = require('express');
const knex = require('knex')
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

//database
const dbSettings = {
    client : 'sqlite3',
    connection : {
        filename : './database/data.sqlite3'
    },
    useNullAsDefault : true,
};
//middleware for storing files
const storage = multer.diskStorage({
    destination : function(req,file,cb){
        cb(null,path.join(__dirname, 'temp'));
    },
    filename : function(req,file,cb){
        const extname = path.extname(file.originalname);
        cb(null,'' + Date.now() + extname)
    }
})
const upload = multer({storage : storage});


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


const makeToken = ()=>{
    const random = size => Buffer.from(
        String.fromCharCode(
          ...crypto.getRandomValues(
            new Uint8Array(size)
          )
        )).toString('base64')
      .replaceAll('+', 'x').replaceAll('/', 'I').slice(0, size)
      
    return random(16);
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
const isWhitelisted  = (req,res,next)=>{
    //load token
    db('whitelist').select('token').then(data => data.token)
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

//TODO : gmail : '' causes error code 400 to be sent back. Fix this.
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

        //found and send
        if(token){
            req.session.SessionToken = token.token;
            res.sendStatus(200);
        }else if(hasToken   ){
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
    }
    res.sendStatus(200);
});

app.get('/account/user',isWhitelisted,(req,res)=>{
    res.send("you seem to be logged in");
})

//upload images to database
app.post('/account/upload',isWhitelisted,upload.any(),(req,res)=>{
    console.log(req.files);
    res.send
    res.sendStatus(200);
});

app.listen(port,()=>{
    console.log(`listening on port : ${port}`);
})