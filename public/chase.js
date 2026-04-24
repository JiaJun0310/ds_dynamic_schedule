// get Ducky from HTML
const ducky = document.getElementById("Ducky");
// get movement buttons from HTML
const btnClick = document.getElementById("btn-click")
const btnFollow = document.getElementById("btn-follow")
const btnStop = document.getElementById("btn-stop")
// set the movement mode to default
let duckyMode = "click"
// set the ducky coordinates
let duckyX = window.innerWidth / 2;
let duckyY = window.innerHeight / 2;

// toggle buttons
btnClick.addEventListener("click", (event) => {
    // We add this to stop the button click from also triggering the document click below
    event.stopPropagation(); 
    
    // update button classes
    btnClick.classList.add("active");
    btnFollow.classList.remove("active");
    btnStop.classList.remove("active");

    // check if the ducky was on stop mode before this event
    const wasStopped = (duckyMode === "stop")

    // set duckyMode
    duckyMode = "click";

    if (wasStopped){
        updateDucky();
    }
});

btnFollow.addEventListener("click", (event) => {
    // We add this to stop the button click from also triggering the document click below
    event.stopPropagation();
    
    // update button classes
    btnFollow.classList.add("active");
    btnClick.classList.remove("active");
    btnStop.classList.remove("active");

    // check if the ducky was on stop mode before this event
    const wasStopped = (duckyMode === "stop")

    // set duckyMode
    duckyMode = "follow";

    if (wasStopped){
        updateDucky();
    }
});

btnStop.addEventListener("click", (event) => {
    // We add this to stop the button click from also triggering the document click below
    event.stopPropagation();

    // update button classes
    btnStop.classList.add("active");
    btnClick.classList.remove("active")
    btnFollow.classList.remove("active")

    // calculates the center of the screen
    duckyX = window.innerWidth / 2;
    duckyY = window.innerHeight / 2;

    // update css before killing the animation loop
    ducky.style.left = duckyX + "px";
    ducky.style.top = duckyY + "px";

    // set duckyMode
    duckyMode = "stop"
})

// movement logic

// event listener for clicks
document.addEventListener("click", (event) => {
    if (event.target.closest("#ModeDuck")) { // if click was on the div with the buttons stop updating the coordinates
        return; 
    }
    if (duckyMode === "click") { // update ducky coordinates according to event position and duckyMode
        duckyX = event.clientX;
        duckyY = event.clientY;
    }
})

// event listener for mouse move
document.addEventListener("mousemove", (event) => {
    if (event.target.closest("#ModeDuck")) { // if mouse move was on the div with the buttons stop updating the coordinates
        return; 
    }
    if (duckyMode === "follow") { // update ducky coordinates according to event position and duckyMode
        duckyX = event.clientX;
        duckyY = event.clientY;
    }
})

// update the duck's position every frame
function updateDucky() {
    if (duckyMode === "follow") {
        // updates css coordinates
        ducky.style.left = duckyX + "px";
        ducky.style.top = duckyY + "px";
    } 
    else if (duckyMode === "click") {
        // updates css coordinates
        ducky.style.left = duckyX + "px";
        ducky.style.top = duckyY + "px";
    } 

    if (duckyMode !== "stop"){
        requestAnimationFrame(updateDucky);
    }
}
// run the loop when the page first loads
updateDucky();