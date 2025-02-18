import * as THREE from 'three';
import gimmick_data from "./data/gimmickdata.json";
import endemic_data from "./data/endemic.json";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


document.getElementById('version').innerHTML = `<strong>Version:</strong> ${__APP_VERSION__}`;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({canvas: canvas});
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
function loadGimmicks() {
    Object.entries(gimmick_data).forEach(([key, value]) => {
        var path = "";
        if (value.map_icon != "INVALID") {
            path = './assets/gimmick_icons/MHWilds-' + key + ' Map Icon.png';
        }
        else {
            path ='./assets/gimmick_icons/MHWilds-' + value.icon + ' Icon ' + value.color + '.png';
        }
        if (value.name !== null) { // make a better solution for this
            const texture = new THREE.TextureLoader().load( path );
            gimmicks.set(key, {
                data: value,
                texture: texture
            });
        }
    });
}
loadGimmicks();

const endemics = new Map();
function loadEndemic() {
    Object.entries(endemic_data).forEach(([key, value]) => {
        var path = "";
        if (value.map_icon != "INVALID") {
            path = './assets/enemy_icons/MHWilds-' + key + ' Map Icon.png';
        } else {
            path ='./assets/enemy_icons/MHWilds-' + key + ' Icon.png';
        }
        const texture = new THREE.TextureLoader().load( path );
        endemics.set(key, {
            data: value,
            texture: texture
        });
    });
}
loadEndemic();


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
            sprite.type = "GIMMICK";
            sprites.push(sprite);
        }
    });
});

endemics.forEach((value, key) => {
    const texture = value.texture;
    value.data.st101.points.forEach((point) => {
        if (point != undefined) {
            const spriteMaterial = new THREE.SpriteMaterial( { map: value.texture } );
            const sprite = new THREE.Sprite( spriteMaterial );
            scene.add( sprite );
            sprite.scale.set( 25, 25, 25 );
            sprite.position.set(point[0], point[1] + 5, point[2]);
            sprite.emId = key;
            sprite.type = "ENDEMIC";
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

function setInfo(element, sprite, info_type) {
    if (hoveredSprite.type === "GIMMICK") {
        const gimmick = gimmicks.get(hoveredSprite.gimmickId);
        element.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${gimmick.data.name}</div>
            `;
            if (gimmick.data.explain !== null)
                element.innerHTML += `<div>${gimmick.data.explain}</div>`;
    } else if (hoveredSprite.type === "ENDEMIC") {
        const endemic = endemics.get(hoveredSprite.emId);
        element.innerHTML = `
            <div style="font-weight: bold; color: lightgray;">${endemic.data.name}</div>
            `;
        if (info_type == "EXTENDED") {
            if (endemic.data.memo !== null)
                element.innerHTML += `<div>${endemic.data.memo}</div>`;
        } else {
            if (endemic.data.explain !== null)
                element.innerHTML += `<div>${endemic.data.explain}</div>`;
        }
    }
    tooltip.style.display = "block";
}


window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sprites);

    if (intersects.length > 0) {
        if (hoveredSprite !== intersects[0].object) {
            hoveredSprite = intersects[0].object;
        } else {
            return
        }
        if (!hoveredSprite.visible) return;

        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        setInfo(tooltip, hoveredSprite, "TOOLTIP");
        tooltip.style.display = "block";
    } else {
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
        if (!selectedSprite.visible) return;

        selectedItem.style.display = "flex";
        setInfo(selectedItem, selectedSprite, "EXTENDED")
    }
});

function updateSprites() {
    const distance = Math.min(camera.position.distanceTo(controls.target), 800);
    const scale = Math.max(32.0 * distance / 700, 10.0);
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
const endemicToggle = document.getElementById("endemic");

updateFilters();

function updateFilters(event) {
    if (event !== undefined) {
        if (!event.target.classList.contains('all-filters')) {
            if (allToggle.checked && !event.target.checked) {
                allToggle.checked = false;
            }
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
        if (sprite.type === "GIMMICK") {
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
        } else if (sprite.type === "ENDEMIC") {
            sprite.visible = endemicToggle.checked;
        }
    });
}

filters.addEventListener('change', updateFilters);


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
