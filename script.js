async function sendMessage(){

let message = document.getElementById("message").value;

if(message.trim() === ""){
return;
}

let response = await fetch("http://localhost:3000/validateMessage",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({message})
});

let data = await response.json();

if(data.status === "allowed"){

let chatBox = document.getElementById("chatBox");

chatBox.innerHTML += `<div class="message">${message}</div>`;

document.getElementById("result").innerText = "✅ Message Sent";

document.getElementById("message").value = "";

}else{

document.getElementById("result").innerText = "❌ " + data.reason;

}

}