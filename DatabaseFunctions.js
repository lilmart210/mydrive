require('dotenv').config();

const path = require('path');
const knex = require('knex');
const fs = require('fs');

const {makeToken,hashCode} = require('./serverFunctions');

const jwt = require('jsonwebtoken');

//database
const dbSettings = {
    client : 'sqlite3',
    connection : {
        filename : './database/data.sqlite3'
    },
    useNullAsDefault : true,
};

/**
 * @type {knex.Knex}
 */
const db = knex(dbSettings);

/*
* Grabs the Initial directory that the file system points at. 
* Located in TABLE root COLUMN dir
*/
async function InitMainDirectory(){
    const prm = db.schema
    .hasTable('root')
    .then(async (exists)=>{
        if(exists){
            const dobj = await db('root').select('dir').then();
            return dobj[0].dir;
        }else {
            await db.schema.createTable('root',(table)=>{
                table.string('dir');
            }).then()
            await db('root').select('dir').insert({dir: path.join(__dirname,"FileSystem")}).then();
            return path.join(__dirname,"FileSystem");
        }
    })
    const apath = await prm;
    const pathExists = fs.existsSync(apath);
    if(!pathExists){
        fs.mkdirSync(apath,{recursive : true});
    }
    return apath;
}

//await the root directory to get value
const rootDirectory = InitMainDirectory();

async function RemoveOldTokens(email){
    db('User')
    .select()
    .where({email : email})
    .then((rows)=>{
        const accs = JSON.parse(rows[0].accessTokens)
        const refs = JSON.parse(rows[0].refreshTokens)
        const proc = (token)=>{
            try{
                jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
                return true;
            }catch {
                return false;
            }
        }

        const newaccs = accs.filter(proc);
        const newrefs = refs.filter(proc);
        db('User')
        .select()
        .where({email : email})
        .update({accessTokens : JSON.stringify(newaccs),refreshTokens : JSON.stringify(newrefs)})
        .then(()=>{})
        .catch(()=>{})


    })
    .catch(()=>{})
}

//only verifies that the jwt token is legit
//throws authentication into auth
//throws fields into meta
async function checkjwt(req,res,next){
    
    const header = req.headers['authorization'];
    //first part is Bearer xyz.token
    let token = header && header.split(' ')[1];
    token = token || req.params && req.params.token
    if(token == null) return res.sendStatus(401);
    
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        async(err,auser)=>{
            //console.error(err);
            if(err) return res.status(403).send("Bad Token");
            RemoveOldTokens(auser.email);
            //make sure token is logged in 
            db('Users')
            .select()
            .where({email : auser.email})
            .then((rows)=>{
                if(rows.length > 0){
                    //save grab the access token
                    const tokenlist = JSON.parse(rows[0].accessTokens);
                    if(tokenlist.includes(token)){
                        req.auth = {};
                        req.auth.accessToken = token;
                        req.auth.email = rows[0].email;
                        //grab user metadata
                        req.meta = rows[0];
                        next();
                    }else {
                        res.status(403).send("Sign In")
                    }
                }else {
                    res.status(403).send("Sign In")
                }
            })
            .catch(()=>{
                res.sendStatus(500);
            })
        }
    )
}

//authentication middleware | goes after checkjwt
const isWhitelisted  = async (req,res,next)=>{
    if(req.meta.whitelist){
        next();
    }else{
        res.status(403).send("Not Whitelisted");
    }
}

const isAdmin = async (req,res,next)=>{
    if(req.meta.admin){
        next()
    }else {
        res.status(403).send("Not An Admin");
    }
}
//ensures the directories for the user has been created
async function ensureDirectories(email){
    //ensure user with email has all their properties initialized
    return await db('Users')
    .where({email : email})
    .update({
        'username' : email,
        'favorite' : '[]',
        'secretfavorite' : '[]',
        'shared' : '[]',
        'secretshared' : '[]',
        'drives' : '[]',
        'accessTokens' : '[]',
        'refreshTokens' : '[]'
    })
    .then(()=>{return true})
    .catch(()=>{console.log("Can't EnsureDirectory"); return false})

    
}
/**
 *  table.increments();
    table.string('username');
    table.string('email').unique().primary();
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
    table.binary('ProfilePicture');
    table.json('accessTokens');
    table.json('refreshTokens');
    table.boolean('admin');
    table.boolean('whitelist');
 */


module.exports = {
    db,
    checkjwt,
    ensureDirectories,
    isWhitelisted,
    rootDirectory,
    isAdmin,
    InitMainDirectory
}