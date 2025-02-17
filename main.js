import * as THREE from 'three';
import gimmick_data from "./data/gimmickdata.json";
//import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({canvas: canvas});
//renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
renderer.setClearColor(0xffffff, 0);

scene.background = null;

const mapDiffuse = new THREE.TextureLoader().load( "./assets/maindiffuse.png" );
const mapMaterial = new THREE.MeshBasicMaterial({
     map: mapDiffuse
});
const mapDiffuseWater = new THREE.TextureLoader().load( "./assets/mainotherdiffuse.png" );
const mapMaterialWater = new THREE.MeshBasicMaterial({
     map: mapDiffuseWater
});
const mapDiffuseWall = new THREE.TextureLoader().load( "./assets/walldiffuse.png" );
const mapMaterialWall = new THREE.MeshBasicMaterial({
     map: mapDiffuseWall
});
const mapDiffuseOutline = new THREE.TextureLoader().load( "./assets/outlinediffuse.png" );
const mapMaterialOutline = new THREE.MeshBasicMaterial({
     map: mapDiffuseOutline
});
const loader = new GLTFLoader();
loader.load( './assets/st101.glb', function ( model ) {
    model.scene.traverse( child => {
        if (child.isMesh) {
            if (child.name.includes("mainOther")){
                child.material = mapMaterialWater;
            }
            else if (child.name.includes("outline")){
                child.material = mapMaterialOutline;
            }
            else if (child.name.includes("wall")){
                child.material = mapMaterialWall;
            }
            else if (child.name.includes("main")){
                child.material = mapMaterial;
            }
        }
    })
    scene.add(model.scene);
}, undefined, function ( error ) {
    console.error( error );
});

const spotLight = new THREE.SpotLight( 0xffffff );
spotLight.position.set( 10, 10, 10 );
scene.add( spotLight );

const gimmicks = new Map();
//const sprites = new Array();
function loadGimmicks() {
    Object.entries(gimmick_data).forEach(([key, value]) => {
        var path = "";
        if (value.map_icon != "INVALID") {
            path = './assets/gimmick_icons/MHWilds-' + key + ' Map Icon.png';
        }
        else {
            path ='./assets/gimmick_icons/MHWilds-' + value.icon + ' Icon ' + value.color + '.png';
        }
        const texture = new THREE.TextureLoader().load( path );
        gimmicks.set(key, {
            data: value,
            texture: texture
        });
    });
}
loadGimmicks();
const sprites = []
gimmicks.forEach((value, key) => {
    const texture = value.texture;
    value.data.points.forEach((point) => {
        if (point != undefined) {
            const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
            const sprite = new THREE.Sprite( spriteMaterial );
            scene.add( sprite );
            sprite.scale.set( 25, 25, 25 );
            sprite.position.set(point[0], point[1] + 5, point[2]);
            sprite.gimmickId = key;
            sprites.push(sprite)
        }
    });
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredSprite = null;
let selectedSprite = null;

const tooltip = document.createElement("div");
tooltip.classList.add("tooltip");
document.body.appendChild(tooltip);

window.addEventListener('mousemove', (event) => {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Perform raycasting
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sprites);

    if (intersects.length > 0) {
        if (hoveredSprite !== intersects[0].object) {
            if (hoveredSprite) hoveredSprite.scale.set(1, 1, 1); // Reset previous
            hoveredSprite = intersects[0].object;
            hoveredSprite.scale.set(1.5, 1.5, 1); // Highlight effect
        }

        // Update tooltip
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        const gimmick = gimmicks.get(hoveredSprite.gimmickId);
        if (typeof gimmick !== 'undefined') {
            tooltip.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${gimmick.data.name}</div>
            <div>${gimmick.data.explain}</div>
            `;
        } else {
            tooltip.innerHTML = `${hoveredSprie.gimmickId}`;
        }
        tooltip.style.display = "block";
    } else {
        if (hoveredSprite) hoveredSprite.scale.set(1, 1, 1); // Reset previous
        hoveredSprite = null;
        tooltip.style.display = "none";
    }
});

const selectedItem = document.getElementById("selected-item");

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sprites);

    if (intersects.length > 0) {
        selectedSprite = intersects[0].object;

        // Show side pane and populate with selected sprite info
        const gimmick = gimmicks.get(selectedSprite.gimmickId);
        if (typeof gimmick !== 'undefined') {
            selectedItem.style.display = "flex";
            selectedItem.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${gimmick.data.name}</div>
            <div>${gimmick.data.explain}</div>
            `;
        } else {
            selectedItem.innerHTML = `${selectedSprite.gimmickId}`;
        }
    }
});

function updateSprites() {
    // should do this based on distance to target
    const distance = Math.min(Math.abs(camera.position.y), 1000);
    const scale = Math.max(35.0 * distance / 500, 10.0); // Adjust scaling factor (tweak this for best effect)
    //const distance = camera.position.distanceTo(sprite.position);
    sprites.forEach(sprite => {
        sprite.scale.set(scale, scale, scale);
    });
}


const filters = document.getElementById("filters");
const allToggle = document.getElementById("all-gimmicks");
const collectToggle = document.getElementById("collectable");
const hiddenToggle = document.getElementById("hidden");
const trapToggle = document.getElementById("trap");
const nonFilteringToggle = document.getElementById("non-filtering");
const slingerToggle = document.getElementById("slinger");

filters.addEventListener('change', function(event) {
    if (!event.target.classList.contains('all-filters')) {
        if (allToggle.checked && !event.target.checked) {
            allToggle.checked = false;
        }
    }
    if (allToggle.checked) {
        collectToggle.checked = true;
        hiddenToggle.checked = true;
        trapToggle.checked = true;
        nonFilteringToggle.checked = true;
        slingerToggle.checked = true;
    }
    sprites.forEach(sprite => {
        const gimmick = gimmicks.get(sprite.gimmickId);
        switch (gimmick.data.map_filtering_type) {
            case "ALL":
                sprite.visible = allToggle.checked;
                break;
            case "COLLECT":
                sprite.visible = collectToggle.checked;
                break;
            case "ENVIRONMENT_TRAP":
                sprite.visible = trapToggle.checked;
                break;
            case "INVISIBLE":
                sprite.visible = hiddenToggle.checked;
                break;
            case "INVISIBLE_ADDBEACON":
                sprite.visible = hiddenToggle.checked;
                break;
            case "NON_FILTERING_TARGET":
                sprite.visible = hiddenToggle.checked;
                break;
            case "SLINGER":
                sprite.visible = slingerToggle.checked;
                break;
        }
    });
});


const controls = new OrbitControls(camera, renderer.domElement);
controls.enable = true;
controls.minDistance = 100;
controls.maxDistance = 2000;
controls.staticMoving = true;
controls.zoomSpeed = 1.5;
camera.position.set( -600, 600, 1300 );
controls.target.set( -700, 0, 1400);
camera.lookAt(controls.target);
controls.update();

const light = new THREE.AmbientLight( 0xffffff ); // soft white light
scene.add( light );
//renderer.setClearColor( 0xffffff, 1 );
window.addEventListener( 'resize', onWindowResize );
function animate() {
    controls.update();
    renderer.clear();
    updateSprites();
    const pos = camera.position;
    document.getElementById("camera-position").innerText = `Camera: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
    renderer.render( scene, camera );
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}
