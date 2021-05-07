import * as THREE from "three";
import {CameraControls, dToR} from "./utils.js";
import Corner from "./CornerDimensions";
import Edge from "./EdgeDimensions";
import swapColors from "./swapColors";
import facesToHide from "./facesToHide";
import colorMatchUps from "./colorMatchUps";
import facePos from "./facePositions";
import "./MegaMinx.css"
import { useEffect } from "react";

const MegaMinx = () => {
    let faceToRotate = "face0";
    let moveQueue = [];
    let speed = 3;
    let counter = 0;
    let mouseDown = false;

    const decaObject = {
    }

    Math.csc = function(x) { return 1 / Math.sin(x); }
    
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, .1, 1000 );
    let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    
    let controls = CameraControls(camera, renderer,scene);

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
        e.stopPropagation();

        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        camera.updateMatrixWorld();

        //console.log(mouse,camera);

        raycaster.setFromCamera( mouse, camera );
        const intersects = raycaster.intersectObjects( scene.children );
        let filteredIntersects = intersects.filter(e=>e.object.name);
        try{

            filteredIntersects.forEach(e=>{
                console.log(e.object.material.color);
                console.log(e.object.position);
                console.log(e.object.name)
            })
            console.log("-----------------------------")

        }catch(e){

        }

        renderer.render( scene, camera );

    }

    function onMouseUp(e) {
        e.stopImmediatePropagation();
        mouseDown=false;
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

            renderer.setSize( window.innerWidth, window.innerHeight-10 );
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

        return function cleanup () {
            window.removeEventListener("pointerdown",onMouseDown,false)
            window.removeEventListener("pointerdown",onMouseUp,false)
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

        squareMesh2.scale.set(.95,.95)

        squareMesh.translateZ(translate?.z||0)
        i<6?
            squareMesh2.translateZ(translate?.z+.01||0):
            squareMesh2.translateZ(translate?.z-.01||0)

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

    // array of face colors in the order they're generated
    let faceColors = [
        "blue",     // 1
        "pink",     // 2
        "yellow",   // 3
        "red",      // 4
        "green",    // 5
        "#E9D3FF",  // 6 light purple

        "#4fc3f7",  // 7 light blue
        "#C39B77",  // 8 light brown
        "#64dd17",  // 9 light green
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
            if(moveQueue[0]) {
                faceToRotate='face'+moveQueue.shift();
                if(faceToRotate.split('').includes("'")){
                    faceToRotate=faceToRotate.replace("'","");
                    speed = Math.abs(speed);
                }else {
                    speed = Math.abs(speed)*-1;
                }
            }
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
                } else {
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
                } else {
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
            tempSpeed = (speed/Math.abs(speed))*(Math.abs(speed)+Math.abs(counter)-72)
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
 
    // setTimeout(()=>{ 
        
    //     console.log(document.body.children[1]);
    // },50);

    animate();

    let addRandomMove = () => {
        if(counter!==0) return;
        let randomFace = Math.floor(Math.random() * 12)+1;
        let randomDir  = Math.floor(Math.random() * 2);
        moveQueue.push(`${randomFace}${randomDir?"":"'"}`);
    }

    return (
        <div>
            {
                <button onClick={()=>addRandomMove()}>Random move</button>
            }
        </div>
    );
}

export default MegaMinx;