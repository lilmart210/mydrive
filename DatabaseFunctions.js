const path = require('path');
const knex = require('knex');
const fs = require('fs');

const {makeToken,hashCode} = require('./serverFunctions');

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

const isAdmin = async (req,res,next)=>{
    db('whitelist')
    .select('gmail','admin')
    .where({gmail : req.session.user})
    .then((rows)=>{
        //should only be a single gmail
        const user = rows[0];
        user.admin ? next() : res.sendStatus(401);
    })
    .catch((e)=>{
        console.error(e);
        res.sendStatus(500);
    })
}

module.exports = {
    db,
    isWhitelisted,
    rootDirectory,
    isAdmin,
    InitMainDirectory
}