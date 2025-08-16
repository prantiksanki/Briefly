const express = require("express") ; 
const cors = require("cors") ;


const app = express() ; 
const PORT = 80 ; 

app.use(cors()) ; 
app.use(express.json()) ; 
app.use(express.urlencoded({ extended: true })) ;


app.post("/transcribe" , (req,res) =>
{
    const { audio } = req.body;
    console.log(audio) ; 
    res.json({ message: "Audio received" });

    


})



app.listen(PORT, (req, res) =>
{
    console.log(`Server is running on port ${PORT}`);
})