

const path = require('path');
const knex = require('knex')

const {makeToken,hashCode} = require('./serverFunctions');

const rootDirectory = path.join(__dirname,"FileSystem");
const passcode = 'admin';

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

//create if not table not exists
db.schema.hasTable('whitelist').then((exists)=>{
    if(!exists)startup();
    //make a new token for every user
    //db('whitelist').update({'token' : makeToken()}).then(()=>{console.log('token refreshed')});
});



module.exports = {
    db,
    isWhitelisted,
    UniqueToken,
    rootDirectory,
    startup
}