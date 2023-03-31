import React,{useState , useRef} from "react";
import './App.css';

import API_URL from './config.js';
import JsonDisplay from './JsonDisplay.jsx';


function App(){
  // setting the state for File/Image
  const [image,setImage] = useState(null);
  //setting the state for loader and Sucess case
  const [loader ,setLoader] = useState(false);
  const [success, setSuccess] = useState(false);

  const [output , setOutput] = useState();


  //state created for rendering Image
  const [imageDisplay, setImageDisplay]  =useState(null);

  //adding the ref to the input file
  const inputFileRef = useRef(null);

  // constructor to handle the change after selecting the File
  const handleFileChange =(e)=>{
    setImage(e.target.files[0]);
    setImageDisplay(URL.createObjectURL(e.target.files[0]));
  };



  // constructor to handle the change after clickingon upload button\
  const handleUpload =async (e)=>{
    e.preventDefault();

    if(image !== null){



    //clearing the input file value using ref
    inputFileRef.current.value = null;



    setLoader(true);
    setSuccess(false);

    // using the FormData to bundle the data collected from frontend
    const formData = new FormData();
    formData.append('image',image);

    // sending the data to backend using POST and fetch
    const response = await fetch(API_URL,{
      method : 'POST',
      body: formData
    });

    const result = await response.json().then((result)=>{
      setOutput(result);
      setLoader(false)
      setSuccess(true);
      setImage(null);
    });
  }
  else{
    setSuccess(true);
    setOutput({message: 'Please select the image'});
  }
  }
  return(
    <div id="main_container">
      <h1 id="app_heading">ID OCR APP</h1>
      <p className="app_para">Using this App, we can extract the Relevant Information from the Indian Govt Id and store in JSON format</p>
      <div id='buttons_container'>
        <input type="file" onChange={handleFileChange} id="app_inp_file" ref={inputFileRef} required/>
        <br />
        <button onClick={handleUpload} id='app_btn'>Upload</button>
        {imageDisplay && <img className="doc_image" src={imageDisplay} alt="Uploaded"/>}
        {loader && (
          <div className = "loader-container">
            <div className = "loader"></div>
          </div>
        )}
        {success && <div className="div_response">
                  <p className="app_para">{output.message}</p>
                  <JsonDisplay className='app_para' json ={output.data} />
                  </div>}
      </div>
    </div>
  )
}


export default App;
