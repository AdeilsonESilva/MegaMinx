import * as THREE from "three";
import {CameraControls, dToR, rotate_point} from "./utils.js";
import Corner from "./CornerDimensions";
import Edge from "./EdgeDimensions";
import swapColors from "./swapColors";
import facesToHide from "./facesToHide";
import colorMatchUps from "./colorMatchUps";
import facePos from "./facePositions";
import calculateTurn from "./calculateTurn";
import "./MegaMinx.css"
import { useEffect } from "react";
import Menu from "../Menu/Menu";
//import piecesSeed from "./pieces";

/*

ISSUES:

    GENERAL:
        1. Fix info panel
        2. Hide fullscreen button on mobile platfroms

TODO:
    2. Fix Bugs
    3. Solver
    4. Patterns
    5. Undo/Redo

*/

const MegaMinx = ({reset}) => {

    // Added csc to Math library
    Math.csc = function(x) { return 1 / Math.sin(x); }

    // UI and megaminx controller variables
    let faceToRotate = "face0"; // Controls which face will rotate
    let moveQueue = []; // Moves in here will be immediately played
    let speedChanged = false; // Signals a queued speed change
    let speedHolder = 3; // Queued speed change
    let speed = 3; // Default move speed (must divide evenly into 72)
    let counter = 0; // Theta counter for piece rotation (counts to 72)
    let updateMouse = false; // Signals mouse can be updated in mousemove
    let currentFunc = "none"; // Current state of the menu
    let currentColor = "blue"; // Color used by colorpicker (default blue)

    // Used for touch/mouse rotations
    let startPoint = null;
    let newPoint = null;
    let selectedSide = null;
    let selectedPiece = null;

    // Threejs variables
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, .1, 1000 );
    let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let controls = CameraControls(camera, renderer,scene);

    // Setter for moveQueue
    let setMoveQueue = moves => moveQueue = !moveQueue.length?moves:moveQueue;

    // getter and setter for speed holder
    let getSpeed = () => speedHolder;
    let setSpeed = speed => {
        console.log(speed)
        switch(speed){
            case 0:
                speedHolder = .25;
                break;
            case 1:
                speedHolder = .5;
                break;
            case 2:
                speedHolder = 1;
                break;
            case 3:
                speedHolder = 3;
                break;
            case 4:
                speedHolder = 6;
                break;
            case 5:
                speedHolder = 12;
                break;
            case 6:
                speedHolder = 24;
                break;
            case 7:
                speedHolder = 72;
                break;
            default:
        }
        speedChanged=true
    }

    // getter and setter for current color
    let getCurrentColor = () => currentColor;
    let setCurrentColor = color => currentColor=color

    // getter and setter for currentFunc
    let currentFunction = () => currentFunc;
    let setCurrentFunction = func => currentFunc = func;

    // Holds references to all the rendered pieces
    let decaObject = {
    }
    
    // Set background color and size
    renderer.setClearColor(new THREE.Color("black"),0);
    renderer.domElement.className = "canvas";
    renderer.setSize( window.innerWidth, window.innerHeight);

    camera.position.z = 15;
    camera.position.y = 0;
    camera.position.x = 0;

    //camera.translateZ(-2.9275/2);
    renderer.render( scene, camera );

    function onMouseDown(e) {
        // update mouse position
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // reset piece selection data
        startPoint = null;
        selectedSide = null;
        selectedPiece = null;
        
        // Set the raycaster to check for intersected objects
        raycaster.setFromCamera( mouse, camera );

        const intersects = raycaster.intersectObjects( scene.children );

        // Filter only pieces that should be interacted with
        let filteredIntersects = intersects.filter(
            e=>e.object.name==="corner"||e.object.name==="edge"
        );

        let filteredCenters = intersects.filter(e=>
            e.object.name==="center"
        );

        // if a piece is intersected disable camera rotation
        if(intersects[0]) {
            controls.enabled = false;
        }

        // Enable mouse movement position updating
        if(
            filteredIntersects[0] && 
            !moveQueue.length 
            && ["none","solver","patterns"].includes(currentFunc)
        ){
            updateMouse = true;

            // Values to be used for touch turns
            selectedPiece = filteredIntersects[0].object.piece;

            // Testing for piece 8 first
            if((selectedPiece>0&&selectedPiece<11)){

                startPoint = filteredIntersects[0].uv;
                selectedSide = filteredIntersects[0].object.side;

                // console.log(`Testing piece ${selectedPiece}`)
                // console.log("2D vector: "+startPoint)
                // console.log("Face piece number: "+selectedPiece)
                // console.log("Side: "+selectedSide);
            }
        }
        // For non interactable pieces
        else if(!filteredIntersects[0]&&intersects[0]){
            updateMouse = true;
            selectedPiece = intersects[0].object.piece;
        }

        // Change the clicked piece color to the selected color
        if(currentFunc==="colorpicker"&&filteredIntersects[0]){
            filteredIntersects[0].object.material.color.set(currentColor)
        }

        // console.log("-----------------------------")
    }

    function onMouseUp(e) {
        controls.enabled = true;
        updateMouse=false;
    }

    function onMouseMove(e){
        if(e.pointerType==="touch") controls.enabled = true;
        // If no piece was clicked end function
        if(!updateMouse) {
            return;
        }
        
        // Get new mouse coordinates
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // set up raycaster to detect intersected objects
        raycaster.setFromCamera( mouse, camera );

        // any intersected objects go in here
        const intersects = raycaster.intersectObjects( scene.children );

        // Filter only pieces that should be interacted with
        let filteredIntersects = intersects.filter(
            e=>e.object.name==="corner"||e.object.name==="edge"
        );

        if(filteredIntersects[0]){
            newPoint = filteredIntersects[0].uv;
            let turn = calculateTurn(startPoint,newPoint,selectedSide,selectedPiece);
            if(turn) {
                updateMouse=false;
                startPoint=null;
                newPoint=null;
                selectedSide=null;
                selectedPiece=null;
                moveQueue.push(turn);
            }
        }
        else if(!filteredIntersects[0]&&intersects[0]){
            if(!startPoint) return;
            console.log("hit edge");
            let turn = calculateTurn(startPoint,newPoint,selectedSide,selectedPiece,true);
            if(turn) {
                updateMouse=false;
                startPoint=null;
                newPoint=null;
                selectedSide=null;
                selectedPiece=null;
                moveQueue.push(turn);
            }
        }
    }

    // Event listeners
    window.addEventListener("resize", 
        () => {
            let tanFOV = Math.tan( ( ( Math.PI / 180 ) * camera.fov / 2 ) );
            let windowHeight = window.innerHeight;

            camera.aspect = window.innerWidth / window.innerHeight;
            
            // adjust the FOV
            camera.fov = ( 360 / Math.PI ) * Math.atan( tanFOV * ( window.innerHeight / windowHeight ) );
            
            camera.updateProjectionMatrix();
            camera.lookAt( scene.position );

            renderer.setSize( window.innerWidth, window.innerHeight );
            renderer.render( scene, camera );
        }, false
    );

    useEffect(()=>{

        function removeElementsByClass(className){
            const elements = document.getElementsByClassName(className);
            while(elements.length > 0){
                elements[0].parentNode.removeChild(elements[0]);
            }
        }
        removeElementsByClass("canvas");

        document.body.children[1].appendChild( renderer.domElement );
        window.addEventListener("pointerdown",onMouseDown,false);
        window.addEventListener("pointerup",onMouseUp,false);
        window.addEventListener("pointermove",onMouseMove,false);

        // window.addEventListener("touchstart",onMouseDown,false);
        // window.addEventListener("touchend",onMouseUp,false);
        // window.addEventListener("touchmove",onMouseMove,false);

        return function cleanup () {
            window.removeEventListener("pointerdown",onMouseDown,false)
            window.removeEventListener("pointerup",onMouseUp,false)
            window.removeEventListener("pointermove",onMouseMove,false);
        }
    })

    function pentagonMesh(n,translate,rotate,color,i)
    {
        let pentagonMesh,pentagonMesh2;
        const lineWidth = .97;
        n=n?n:1;
        color=color?color:"grey";
        const pentagon = new THREE.Shape();
        const pentagon2 = new THREE.Shape();

        // https://mathworld.wolfram.com/RegularPentagon.html
        const c1 = Math.cos((2*Math.PI)/5);
        const c2 = Math.cos(Math.PI/5);
        const s1 = Math.sin((2*Math.PI)/5);
        const s2 = Math.sin((4*Math.PI)/5);
        
        pentagon.moveTo(0, 1*n);
        pentagon.lineTo(s1*n, c1*n);
        pentagon.lineTo(s2*n, -c2*n);
        pentagon.lineTo(-s2*n, -c2*n);
        pentagon.lineTo(-s1*n, c1*n);

        pentagon2.moveTo((0)*lineWidth, (1*n)*lineWidth);
        pentagon2.lineTo((s1*n)*lineWidth, (c1*n)*lineWidth);
        pentagon2.lineTo((s2*n)*lineWidth, (-c2*n)*lineWidth);
        pentagon2.lineTo((-s2*n)*lineWidth, (-c2*n)*lineWidth);
        pentagon2.lineTo((-s1*n)*lineWidth, (c1*n)*lineWidth);
        
        const geometry = new THREE.ShapeGeometry(pentagon);
        const geometry2 = new THREE.ShapeGeometry(pentagon2);
    
        const material = new THREE.MeshBasicMaterial({
            color: "black",
            side: THREE.DoubleSide,
            depthWrite: true,
        });
        const material2 = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.FrontSide,
            depthWrite: true,
            });
    
        pentagonMesh = new THREE.Mesh(geometry,material);
        pentagonMesh2 = new THREE.Mesh(geometry2,material2);
        pentagonMesh2.name = "center";
        

        let offsetZ =.205;
        let offsetY = -.81;

        pentagonMesh.translateZ(translate?.z||0)

        pentagonMesh.rotateZ(rotate?.z||0)
        pentagonMesh.rotateY(rotate?.y||0)
        
        pentagonMesh.translateY(translate?.y||0)
        pentagonMesh.translateX(translate?.x||0)

        pentagonMesh.rotateX(rotate?.x||0)

        pentagonMesh.translateZ(-translate?.y/2+offsetZ||0)
        pentagonMesh.translateY(translate?.y/2+offsetY||0)

        i<6?
            pentagonMesh2.translateZ(translate?.z+.01||0):
            pentagonMesh2.translateZ(translate?.z-.01||0)

        pentagonMesh2.rotateZ(rotate?.z||0)
        pentagonMesh2.rotateY(rotate?.y||0)
        
        pentagonMesh2.translateY(translate?.y||0)
        pentagonMesh2.translateX(translate?.x||0)

        pentagonMesh2.rotateX(rotate?.x||0)

        pentagonMesh2.translateZ(-translate?.y/2+offsetZ||0)
        pentagonMesh2.translateY(translate?.y/2+offsetY||0)
        
        scene.add(pentagonMesh,pentagonMesh2);       

        // Adds all front pieces faces in decaObject
        decaObject[`face${i+1}`].front.push(pentagonMesh,pentagonMesh2);
    }

    // 
    function squareMesh (n,position,position2,translate,rotate,color,i,piece)
    {
        const square = new THREE.Shape();
        const square2 = new THREE.Shape();

        //console.log(square.lineTo)
        square.moveTo(...position.p1,5);
        square.lineTo(...position.p2,1);
        square.lineTo(...position.p3,3);
        square.lineTo(...position.p4,4);

        square2.moveTo(...position2.p1,5);
        square2.lineTo(...position2.p2,1);
        square2.lineTo(...position2.p3,3);
        square2.lineTo(...position2.p4,4);

        const geometry = new THREE.ShapeGeometry(square);
        const geometry2 = new THREE.ShapeGeometry(square2);

        const material = new THREE.MeshBasicMaterial({
            color: "black",
            side: THREE.DoubleSide,
            depthWrite: true
        });
        const material2 = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.FrontSide,
            depthWrite: true
        });

        let squareMesh = new THREE.Mesh(geometry,material);
        let squareMesh2 = new THREE.Mesh(geometry2,material2);
        if(piece>0&&piece<6) squareMesh2.name="corner";
        if(piece>5&&piece<11) squareMesh2.name="edge";

        squareMesh2.piece = piece;
        squareMesh2.side = colorNames[i];

        squareMesh2.scale.set(.95,.95)

        squareMesh.translateZ(translate?.z||0)
        i<6?
            squareMesh2.translateZ(translate?.z+.005||0):
            squareMesh2.translateZ(translate?.z-.005||0)

        let offsetZ =.205;
        let offsetY = -.81;
        
        // Black background (outline effect)
        squareMesh.rotateZ(rotate?.z||0)
        squareMesh.rotateY(rotate?.y||0)
        
        squareMesh.translateY(translate?.y||0)
        squareMesh.translateX(translate?.x||0)

        squareMesh.rotateX(rotate?.x||0)

        squareMesh.translateZ(-translate?.y/2+offsetZ||0)
        squareMesh.translateY(translate?.y/2+offsetY||0)

        // Colored inner face
        squareMesh2.rotateZ(rotate?.z||0)
        squareMesh2.rotateY(rotate?.y||0)
        
        squareMesh2.translateY(translate?.y||0)
        squareMesh2.translateX(translate?.x||0)

        squareMesh2.rotateX(rotate?.x||0)

        squareMesh2.translateZ(-translate?.y/2+offsetZ||0)
        squareMesh2.translateY(translate?.y/2+offsetY||0)


        if(piece>10){
            squareMesh.rotateZ(dToR(-36+-(72*(piece-11))))
            squareMesh.rotateX(dToR(-63.2))

            squareMesh2.rotateZ(dToR(-36+-(72*(piece-11))))
            squareMesh2.rotateX(dToR(-63.2))

            squareMesh.translateZ(1.625)
            squareMesh.translateY(-1)

            squareMesh2.translateZ(1.631)
            squareMesh2.translateY(-.895)
        }

        scene.add(squareMesh,squareMesh2);

        // Adds all front pieces faces in decaObject
        piece<11?
            decaObject[`face${i+1}`].front.push(squareMesh,squareMesh2):
            decaObject[`face${i+1}`].sides.push(squareMesh,squareMesh2);

        if(piece>10) {
            squareMesh.visible=false;
            squareMesh2.visible=false;
        }
        
    }

    // array of face colors/hex in the order they're generated
    let faceColors = [
        "blue",     // 1
        "#ff80ce",     // 2 pink
        "yellow",   // 3
        "red",      // 4
        "green",    // 5
        "#c585f7",  // 6 light purple

        "#4fc3f7",  // 7 light blue
        "#C39B77",  // 8 light brown
        "#64dd17",  // 9 light green
        "orange",   // 10
        "purple",   // 11
        "white"     // 12
    ];

    // array of face color names in the order they're generated
    let colorNames = [
        "blue",     // 1
        "pink",     // 2 pink
        "yellow",   // 3
        "red",      // 4
        "green",    // 5
        "lightpurple",  // 6 light purple
        "lightblue",  // 7 light blue
        "lightbrown",  // 8 light brown
        "lightgreen",  // 9 light green
        "orange",   // 10
        "purple",   // 11
        "white"     // 12
    ]
    
    // groups all the meshes for a face together
    function decaFace(n,translate,rotate,color,i){
            //if(i>1) return
        // generate object structure on each face initialization

        pentagonMesh(n,translate,rotate,color,i);

        squareMesh(n,Corner(n,"face1","corner1"),Corner(n,"face1","corner1",1),translate,rotate,color,i,1);
        squareMesh(n,Corner(n,"face1","corner2"),Corner(n,"face1","corner2",1),translate,rotate,color,i,2);
        squareMesh(n,Corner(n,"face1","corner3"),Corner(n,"face1","corner3",1),translate,rotate,color,i,3);
        squareMesh(n,Corner(n,"face1","corner4"),Corner(n,"face1","corner4",1),translate,rotate,color,i,4);
        squareMesh(n,Corner(n,"face1","corner5"),Corner(n,"face1","corner5",1),translate,rotate,color,i,5);

        squareMesh(n,Edge(n,"face1","edge1"),Edge(n,"face1","edge1",1),translate,rotate,color,i,6)
        squareMesh(n,Edge(n,"face1","edge2"),Edge(n,"face1","edge2",1),translate,rotate,color,i,7)
        squareMesh(n,Edge(n,"face1","edge3"),Edge(n,"face1","edge3",1),translate,rotate,color,i,8)
        squareMesh(n,Edge(n,"face1","edge4"),Edge(n,"face1","edge4",1),translate,rotate,color,i,9)
        squareMesh(n,Edge(n,"face1","edge5"),Edge(n,"face1","edge5",1),translate,rotate,color,i,10)

        squareMesh(n,Edge(n,"sides","side1"),Edge(n,"sides","side1",2),translate,rotate,color,i,11);
        squareMesh(n,Edge(n,"sides","side1"),Edge(n,"sides","side1",2),translate,rotate,color,i,12);
        squareMesh(n,Edge(n,"sides","side1"),Edge(n,"sides","side1",2),translate,rotate,color,i,13);
        squareMesh(n,Edge(n,"sides","side1"),Edge(n,"sides","side1",2),translate,rotate,color,i,14);
        squareMesh(n,Edge(n,"sides","side1"),Edge(n,"sides","side1",2),translate,rotate,color,i,15);

        squareMesh(n,Corner(n,"sides","side1a"),Corner(n,"sides","side1a",1),translate,rotate,color,i,16);
        squareMesh(n,Corner(n,"sides","side1a"),Corner(n,"sides","side1a",1),translate,rotate,color,i,17);
        squareMesh(n,Corner(n,"sides","side1a"),Corner(n,"sides","side1a",1),translate,rotate,color,i,18);
        squareMesh(n,Corner(n,"sides","side1a"),Corner(n,"sides","side1a",1),translate,rotate,color,i,19);
        squareMesh(n,Corner(n,"sides","side1a"),Corner(n,"sides","side1a",1),translate,rotate,color,i,20);

        squareMesh(n,Corner(n,"sides","side1b"),Corner(n,"sides","side1b",1),translate,rotate,color,i,21);
        squareMesh(n,Corner(n,"sides","side1b"),Corner(n,"sides","side1b",1),translate,rotate,color,i,22);
        squareMesh(n,Corner(n,"sides","side1b"),Corner(n,"sides","side1b",1),translate,rotate,color,i,23);
        squareMesh(n,Corner(n,"sides","side1b"),Corner(n,"sides","side1b",1),translate,rotate,color,i,24);
        squareMesh(n,Corner(n,"sides","side1b"),Corner(n,"sides","side1b",1),translate,rotate,color,i,25);
    }

    // Generate object of piece references
    facePos.forEach((set,i)=>{decaObject[`face${i+1}`]={front : [],sides : []}});

    // Put the MegaMinx on the screen!
    facePos.forEach((set,i)=>decaFace(1,set.translate,set.rotate,faceColors[i],i));

    // Rotates a given face of the megaminx
    let rotateFace = (face) => {
        let tempSpeed = speed;

        if(counter===0&&faceToRotate==="face0"){
            if(speedChanged){
                speedChanged = false;
                speed = speedHolder;
                tempSpeed=speed;
                console.log("Speed changed to: "+speedHolder)
            }
            if(moveQueue[0]) {
                faceToRotate='face'+moveQueue.shift();
                if(faceToRotate.split('').includes("'")){
                    faceToRotate=faceToRotate.replace("'","");
                    speed = Math.abs(speed);
                }else {
                    speed = Math.abs(speed)*-1;
                }
            }
            else if(currentFunction()==="scramble") setCurrentFunction("none");
            return;
        }

        // Controls what happens at the end of each turn
        if(Math.abs(counter) >= 72) {
            // Rotate sides back to original position
            decaObject[face].sides.forEach((piece,i)=>{
                piece.visible = false;

                if(i%2){
                    piece.translateZ(-1.631)
                    piece.translateY(.895)
                } 
                
                else {
                    piece.translateZ(-1.625)
                    piece.translateY(1)
                }

                piece.rotateX(dToR(63.2))

                counter<0?
                    piece.rotateZ(dToR(Math.abs(counter))):
                    piece.rotateZ(dToR(Math.abs(counter)*-1));

                piece.rotateX(dToR(-63.2))

                if(i%2){
                    piece.translateZ(1.631)
                    piece.translateY(-.895)
                } 
                
                else {
                    piece.translateZ(1.625)
                    piece.translateY(-1)
                }
            });

            // Rotate face back to original position
            decaObject[face].front.forEach((piece,i)=>{
                counter<0?
                    piece.rotateZ(dToR(Math.abs(counter))):
                    piece.rotateZ(dToR(Math.abs(counter)*-1));
            });

            // Show face sides
            facesToHide[face].forEach(piece=>{
                decaObject[`face${piece.face}`].front[piece.pos].visible=true;
            });

            // Move colors around
            swapColors(face,decaObject,speed);

            counter=0;
            faceToRotate="face0"
            return;
        }

        if((Math.abs(speed)+Math.abs(counter))>72){
            tempSpeed = (72-Math.abs(counter))*(counter/Math.abs(counter))
        }

        facesToHide[face].forEach(piece=>{
            decaObject[`face${piece.face}`].front[piece.pos].visible=false;
        })
        decaObject[face].front.forEach((piece,i)=>{
            
            piece.rotateZ(dToR(tempSpeed));
        });
        decaObject[face].sides.forEach((piece,i)=>{
            piece.visible = true;
            
            if(i%2&&i<30) {
                let {side,pos} = colorMatchUps[face][`${i}`]
                piece.material.color.set(
                    decaObject[`face${side}`].front[pos].material.color
                );
            }
            if(i===111){
                piece.material.color.set(
                    "grey",
                );
            }
            if(i%2){
                piece.translateZ(-1.631)
                piece.translateY(.895)
            } else {
                piece.translateZ(-1.625)
                piece.translateY(1)
            }
                piece.rotateX(dToR(63.2))

                piece.rotateZ(dToR(tempSpeed));

                piece.rotateX(dToR(-63.2))

            if(i%2){
                piece.translateZ(1.631)
                piece.translateY(-.895)
            } else {
                piece.translateZ(1.625)
                piece.translateY(-1)
            }
            
        })
        counter+=speed;
    }

    let animate = () => {
        rotateFace(faceToRotate);
        requestAnimationFrame( animate );
        controls.update();
        renderer.render( scene, camera );
    };

    let resetMegaMinx = () => {
        // Generate object of piece references
        decaObject={};
        facePos.forEach((set,i)=>{decaObject[`face${i+1}`]={front : [],sides : []}});

        // Put the MegaMinx on the screen!
        scene.clear();
        facePos.forEach((set,i)=>decaFace(1,set.translate,set.rotate,faceColors[i],i));
    }

    animate();
    return (
        <Menu 
            setMoveQueue={setMoveQueue}
            resetMegaMinx={resetMegaMinx}
            reset={reset}
            setCurrentFunction={setCurrentFunction}
            currentFunction={currentFunction}
            setColor={setCurrentColor}
            getColor={getCurrentColor}
            setSpeed={setSpeed}
            speed={getSpeed}
            />
    );
}

export default MegaMinx;