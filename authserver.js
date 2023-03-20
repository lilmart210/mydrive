require('dotenv').config();

/**
 * This is the Authentication Server for JWT Tokens
 */

const express = require('express');
const bcryypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
const {db } = require('./DatabaseFunctions');

app.use(express.json());

const { Knex } = require('knex');
const port = 7765;

const {checkjwt,ensureDirectories} = require('./DatabaseFunctions')


const corsorigins = ['http://localhost:5173']
if(process.env.NEW_ORIGIN){
    corsorigins.push(process.env.NEW_ORIGIN)
}

app.use(cors({
    origin: corsorigins, // use your actual domain name (or localhost), using * is not recommended
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'],
    credentials: true
}));

function GenAccessToken(MetaData){
    return jwt.sign(MetaData,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '24h'})
}

async function UserExists(email,password){
    return db('Users')
    .select('email','password')
    .where({'email': email})
    .then((rows)=>{
        if(rows.length == 0) return res.sendStatus(403);
        //should only be 1 entry
        //console.log('Found User')
        const auser = rows[0];
        try{
            const result = bcryypt.compareSync(password,auser.password);
            return result;
        } catch(e){
            console.error("UserExists : Something Went Wrong")
            console.error(e);
            return false;
        }
    })
    .catch(()=>{
        console.error('Failed to Find')
    })
}



app.post('/refresh',checkjwt,(req,res)=>{
    const refreshToken = req.body.refreshToken;
    //do they have a token
    if(!refreshToken) return res.status(401).send("Missing Token");
    //middleware checks accesstoken
    //we will check refresh token here
    jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,async (err,auser)=>{
        if(err){
            return res.sendStatus(403);
        }

        const data = await db('Users')
        .select('email','username')
        .where({email : auser.email})
        .then((rows)=>rows[0])
        .catch(()=>console.log("refresh Error"));
        data.RefreshFlag = true;
        const newAccessToken = GenAccessToken(data);
        await db('Users')
        .select('email','accesToken')
        .update({accessToken : newAccessToken})
        .then(()=>{})
        .catch(()=>console.log("refresh error 2"))

        res.status(200).send({accessToken : newAccessToken});
        
    });

});

app.delete('/logout',checkjwt,(req,res)=>{
    db('Users')
    .where({email : req.auth.email})
    .then(async(auser)=>{
        //.update({accessToken : null,refreshToken : null})
        const tokens = JSON.parse(auser[0].accessTokens);
        //const refresh = JSON.parse(auser[0].refreshTokens);
        const newtoke = tokens.filter((token)=>token != req.auth.accessToken)
        //const newrefresh = refresh.filter((token)=>token != req.auth. )
        await db('Users')
        .where({email : req.auth.email})
        .update({accessTokens : JSON.stringify(newtoke)})
        .then(()=>{res.sendStatus(200);})
        .catch(()=>{console.warn('Could not delete Token');res.sendStatus(500)});
    })
    .catch(()=>{
        console.warn('could not delete token');
        res.sendStatus(400);
    })
});

app.post('/register',async (req,res)=>{
    const aemail = req.body.email;
    const apassword = req.body.password;
    //const ext = req.body.email && req.body.email.split('@')[1] == 'email.com'
    if(aemail == null || apassword == null) return res.sendStatus(400);

    const hash = bcryypt.hashSync(req.body.password,10);
    const username = req.body.email.split('@')[0];
    const exists = await db('Users')
    .select('email')
    .where({email : aemail})
    .then(rows=>{return rows.length > 0})
    .catch(()=>{return false});

    if(exists) return res.status(403).send("A user with that email already exists");

    db('Users')
    .insert({
        username : username,
        email : aemail,
        password : hash,
    })
    .then(async()=>{
        await ensureDirectories(aemail);
        res.sendStatus(201)
        //setup the default values
    })
    .catch(()=>res.sendStatus(500))
})

//Add a whitelist feature later
app.post('/login',async (req,res)=>{
    if(req.body.email == null || req.body.password == null) return res.status(400).send("Missing Fields");
    //see if user in db and authenticate
    const isAUser = await UserExists(req.body.email,req.body.password)
    if(!isAUser) return res.status(400).send('Bad Login');
    //generate access and refresh tokens
    const meta = {email : req.body.email};
    //check token in database if still valid(think about this)
    const accesstoken = GenAccessToken(meta);
    const refreshtoken = jwt.sign(meta,process.env.REFRESH_TOKEN_SECRET);
    //grab existing tokens logins
    const adata = await db('Users')
    .select('accessTokens','refreshTokens')
    .where({email:meta.email})
    .then((row)=>row[0])

    const newAccList = JSON.parse(adata.accessTokens)
    newAccList.push(accesstoken)
    const newRefList = JSON.parse(adata.refreshTokens)
    newRefList.push(refreshtoken)
    //console.log(adata,"data");
    //insert access and refresh tokens into token db
    db('Users')
    .select()
    .where({email : meta.email})
    .update({accessTokens : JSON.stringify(newAccList),refreshTokens : JSON.stringify(newRefList)})
    .then(()=>res.status(200).send({refreshToken : refreshtoken,accessToken : accesstoken,email : meta.email,RefreshFlag:false}))
    .catch((msg)=>{console.log(msg);res.status(500).send("unable to login")})
    //log the tokens in the token database
    
});


async function StartServer(){
    console.log("Auth Server is dependant on tables created in Server.js")
    console.log("Ensure server.js runs correctly before using Authentication Endpoints")
    app.listen(port);
}


StartServer();