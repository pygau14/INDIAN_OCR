
// importing the modules required
const express = require('express');
const app = express();
//module to parse the data in req
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
// module for extracting text from Image
const Tesseract = require('tesseract.js');
// module for preprocess the image to get better OCR accuracy
const Jimp = require('jimp');

// module for file handling
const multer = require('multer');


// using diskStorage for storing the file
const storage = multer.diskStorage({
  destination:function(req,file,cb){
    cb(null,'uploads/');
  },
  filename: function(req ,file,cb){
    cb(null,Date.now()+'-'+file.originalname);
  }
});

//Applying the filters using multer library
const upload  = multer({
  storage: storage,
  limits : {fileSize : 1000000},
  fileFilter : function (req,file,cb){
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (mimetype && extName) {
      return cb(null, true);
    } else {
      cb('Error: Only JPEG, JPG, or PNG images allowed');
    }
  }
});


// parsing the data to request using bodyParser Module
app.use(bodyParser.json());
app.use('/uploads',express.static('uploads'));

// Enabling cors as backend and frontend are on different port
// it is not ideal to enable cors from security point of view
// for now I will be enabling it
// but we can do below ways to achieve the same
//  1 Serving the react app from the backend Server - server static or express
//  2 Using Proxy

app.use(cors({
  origin : 'http://localhost:3000',
  method : ['GET','POST'],
  optionsSuccessStatus: 200
})).post('/api/user',upload.single('image'),async (req,res)=>{
  try{
    const imageurl = req.file.filename;
    const imagePath = req.file.path;

    // extracting data from the image using tesseract js module
    const {data :{text}} = await Tesseract.recognize(imagePath, 'eng', { });

        const extractedtext = text;

        // extracting the infomartion from text using extractor method
        const extractInfo = extractor(extractedtext);

        // handling the case where it is unable to extract any info from the Image
        if (extractInfo.idType === 'unknown' ){
          res.status(501).json({message: 'Unknown Document. Please upload a clear image or try any other document' , status: false});
        }
        else {
          res.status(200).json({message: 'data extracted sucessfully!',status : true, data : extractInfo });
        }
  }
  catch(error){
    console.error(error);
    res.status(500).json({message:'data extraction failed!',status:false});
}
});


//declaring the port on which Local server will return
const PORT = process.env.PORT || 8080;


//extracting the info
function extractor(text){
  let extractedInfo ={};
  let idType ='';

  const lines  = text.split('\n');
  console.log(lines);



  // regex pattern as Aadhar number will be spread in 3 spaced-places with 4 digits
  const aadharRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
  if(aadharRegex.test(text)){
    idType = 'Aadhar card';
    // regex patterns for extracting name,dob and fathers name
    const dobPattern = /DOB\s*:\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/g;

    let nameValue = '';

    lines.forEach((item, i) => {
      if(item.includes('Name:')){
        nameValue = lines[i+1].replace(/[^a-zA-Z\s]/g,'');

        nameValue = nameValue.trim();
        if(nameValue.charAt(0) !== nameValue.charAt(0).toUpperCase()){
          nameValue = nameValue.slice(1);
        }
      }
    });



    extractedInfo = {
      "idNumber": text.match(aadharRegex)[0].replace(/\s/g, ''),
      "info": {
        "name": nameValue.trim(),
        "dob": dobPattern.exec(text)[1]
      }
    };
  }


  //regex pattern for Pan card will be alphanumeric charcters
  const panCardRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/g;
  if (panCardRegex.test(text)) {
    idType = 'Pan Card';

    //Removing special characters from the text so that we can come with the regex patterns
    // Except forward slash as it will be useful for dob
    // const newtext = text.replace(/[^\w\s\/]_/g,'');
    // const newfinaltext = newtext.replace('\n',' ');
    // console.log('text after replacing ');
    // console.log(newfinaltext);


    //pattern for giving name ie. next line of the keyword INDIA and this patter can handle the name of any words
    // const namePattern = /(?<=INDIA\n)[A-Z][a-z]+\s([A-Z][a-z]+\s)?[A-Z][a-z]+/g;
    // const fathernamePattern = /[A-Z][a-z]+\s([A-Z][a-z]+\s)?[A-Z][a-z]+/g;



    // console.log(newfinaltext.match(panCardRegex));
    // console.log(newfinaltext.match(namePattern));
    // console.log(newfinaltext.match(dobPattern));

    const namePattern = /^[A-Z]+(?:\s+[A-Z]+)*$/;


    let nameValue = '';
    let fathernameValue = '';

    lines.forEach((item, i) => {
      //logic behind : Name is always coming after the GOVT. OF INDIA
      if(item.includes("INDIA")){
        const newItem = lines[i+1].replace(/[^A-Z\s]/g,'');
        if(newItem !== ''){
          nameValue = newItem;
          const newItem2 = lines[i+2].replace(/[^A-Z\s]/g,'');
          if(newItem2 === ''){
            fathernameValue = lines[i+3].replace(/[^A-Z\s]/g,'');
          }
          else {
            fathernameValue= newItem2;
          }
        }
      }
    });
    const dobPattern = /\b\d{2}[\/]\d{2}[\/]\d{4}\b/g;
    //Due to inaccuracy of OCR added this condition for dob as it will sometimes read forward slash as 7 or 1
    let dobValue = '';
    if(dobPattern.exec(text) === null){
      const regex = /\d{10}/g;
      dobValue = regex.exec(text)[0];
      dobValue = dobValue.split('');
      dobValue[2] = '/';
      dobValue[5] = '/';
      dobValue = dobValue.join('');
    }
    else{
      dobValue = text.match(dobPattern)[0];
      console.log("dobValue:" + dobValue);
    }



    extractedInfo = {
      "idNumber": text.match(panCardRegex)[0],
      "info": {
        "name": nameValue.trim(),
        "fathers_name" : fathernameValue.trim(),
        "dob": dobValue
      }
    };
  }


  // regex pattern for Driving license
  const dlRegex = /^([A-Z]{2})[\s\-]?\d{2}(?:\s|\-)?\d{10}$/g;
  if (dlRegex.test(text) || (text.toLowerCase().includes('licence') && (text.toLowerCase().includes('drive') || text.toLowerCase().includes('driving')))) {
  idType = 'Driving License';


  let nameValue = '';
  let dobValue = '';

  lines.forEach((item, i) => {
    if(item.includes('Name')){
      nameValue = item.replace(/[^\w\s]/gi, '');
      nameValue = nameValue.replace(/\bName\b/gi, '');
    }
    if(item.includes('DOB')){
      dobValue = item.replace(/\D/g, '');
      dobValue = dobValue.replace(/\bDOB\b/gi, '');
      dobValue = dobValue.trim();
      dobValue = dobValue.slice(0, 2) + '/' + dobValue.slice(2, 4) + '/' + dobValue.slice(4);
    }
  });


  if(dobValue === ''){
    dobValue = 'OCR was not able to extract the DOB'
  }

  if(nameValue === ''){
    nameValue = 'OCR was not able to extract the Name'
  }

  extractedInfo = {
    "idNumber": dlRegex.exec(text),
    "info": {
      "name": nameValue.trim(),
      "dob": dobValue.trim()
    }
  };
}

else{
  idType = 'Unknown';

  extractedInfo = {
    "info":{
      'text' : text
    }
  };
}



  extractedInfo.idType = idType;
  return extractedInfo;


}


app.listen(PORT,()=>{
  console.log('Server started on '+ PORT);
});
