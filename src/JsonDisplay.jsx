import React from 'react';
import './App.css';



function JsonDisplay({json}){
  const JsonString = JSON.stringify(json, null ,2);
  return(
    <pre>
        <code>{JsonString}</code>
      </pre>
  )
}


export default JsonDisplay;
