
const express = require('express');

const port = 8060;
console.log()



const app = express();




app.get('/',(req,res)=>{
    res.send("Hello there new comer");
})


app.listen(port,()=>{
    console.log(`listening on port : ${port}`);
})